import { store } from '../store.js'; 
import { triggerHaptic, formatCurrency, getInitials, escapeHTML, getLocalDateString, openModal, closeAllModals, runAction } from '../utils.js'; 

import { sameId, goalProgress, validateGoal, numberValue, cents, goalForecast } from '../rules.js';

const PRESET_ICONS = ['🎯', '✈️', '🏠', '🚗', '💰', '💍', '🏖️', '🎓', '🛒', '🎮', '👶', '🚴', '💻', '🐾', '❤️', '🍿'];

export const renderGoals = () => {
    const goalsContainer = document.getElementById('goals-list-container');
    if (!goalsContainer) return;
    
    const p1Init = store.profile ? getInitials(store.profile.p1) : 'IS';
    const p2Init = store.profile ? getInitials(store.profile.p2) : 'VO';
    
    let totalSaved = 0;
    goalsContainer.innerHTML = '';
    
    if (!store.goals || store.goals.length === 0) {
    goalsContainer.innerHTML = `
        <div class="dash-card flex-col align-center text-center gap-12" style="padding: 32px 16px;">
            <div class="dash-icon bg-primary-light mb-8" style="width: 72px; height: 72px; font-size: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
                <i class="ph-fill ph-flag text-primary"></i>
            </div>
            <p class="mb-0 text-muted" style="font-size: 0.95rem;">Ainda não possui nenhuma meta.</p>
            <button class="btn-primary btn-outline-primary mt-8" id="btn-empty-create-goal" style="width: auto; padding: 12px 24px;">
                Criar a Primeira Meta
            </button>
        </div>
    `;
    document.getElementById('btn-empty-create-goal')?.addEventListener('click', () => {
        openModal('goal-bottom-sheet');
    });
} else {
        store.goals.forEach(goal => {
            if (goal.type === 'financial' && Number.isFinite(Number(goal.current)) && Number(goal.current) >= 0) totalSaved += Number(goal.current);
            
            let progress;
            try { progress = goalProgress(goal); } catch { progress = { percent: 0, invalid: true }; }
            const percent = progress.percent;
            let displayOwner = goal.owner;
            if (goal.owner === 'VO') displayOwner = p2Init;
            if (goal.owner === 'IS') displayOwner = p1Init;
            
            let badgeClass = (goal.owner === 'VO' || goal.owner === p2Init) ? 'bg-muted' : '';
            if (goal.owner === 'Casal') { badgeClass = 'bg-casal'; displayOwner = 'NÓS'; }
            
            const safeTitle = escapeHTML(goal.title);
            const safeIcon = escapeHTML(goal.icon || '🎯');
            const safeUnit = escapeHTML(goal.unit || 'vezes');
            
            let deadlineText = progress.invalid ? '<div class="goal-alert goal-alert-danger">Esta meta tem dados inválidos. Não registre valores até revisar sua configuração.</div>' : '';
            if (!progress.invalid && goal.deadline && goal.current < goal.target) {
                try {
                    const forecast = goalForecast(goal);
                    if (forecast.days > 0) deadlineText = `<div class="goal-alert goal-alert-info"><strong>Faltam ${forecast.days} dias.</strong> Para chegar lá: <strong>${formatCurrency(forecast.rate)}/${forecast.period}</strong>.</div>`;
                    else if (forecast.days === 0) deadlineText = `<div class="goal-alert goal-alert-warning">O prazo é hoje. Faltam ${formatCurrency(forecast.remaining)}.</div>`;
                    else deadlineText = '<div class="goal-alert goal-alert-danger">Prazo esgotado!</div>';
                } catch { deadlineText = '<div class="goal-alert goal-alert-warning">O prazo desta meta é inválido.</div>'; }
            }

            if (goal._invalidHistory?.length) deadlineText += `<div class="goal-alert goal-alert-warning" role="alert">${goal._invalidHistory.length} registro(s) inválido(s) no histórico. Os dados originais estão preservados no banco. Revise antes de registrar novos valores.</div>`;

            const milestonesHTML = `
                <div class="milestones-row">
                    <span class="${percent >= 25 ? 'milestone-active' : ''}">${percent >= 25 ? '✓ 25%' : '25%'}</span>
                    <span class="${percent >= 50 ? 'milestone-active' : ''}">${percent >= 50 ? '✓ 50%' : '50%'}</span>
                    <span class="${percent >= 75 ? 'milestone-active' : ''}">${percent >= 75 ? '✓ 75%' : '75%'}</span>
                    <span class="${percent >= 100 ? 'milestone-active' : ''}">${percent >= 100 ? '✓ 100%' : '100%'}</span>
                </div>
            `;
            const card = document.createElement('div');
            card.className = 'dash-card goal-card';
            
            const textDetail = goal.type === 'financial' ? `${formatCurrency(goal.current)} de ${formatCurrency(goal.target)}` : `${escapeHTML(goal.current)} de ${escapeHTML(goal.target)} ${safeUnit}`;
            const actionBtn = goal.type === 'financial' ? `<button class="btn-deposit btn-action-financial"><i class="ph ph-plus-circle"></i> Guardar</button>` : `<button class="btn-deposit btn-action-habit"><i class="ph ph-check-circle"></i> +1</button>`;
            
            card.innerHTML = `
                <div class="goal-header" title="Ver Histórico">
                    <span class="dash-title">${safeIcon} ${safeTitle}</span>
                    <div class="goal-progress-wrap">
                        <span class="goal-percent">${percent}%</span>
                        <div class="task-badge ${badgeClass}" style="width: 24px; height: 24px; font-size: 0.65rem;">${escapeHTML(displayOwner)}</div>
                    </div>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%;"></div></div>
                ${milestonesHTML}
                <div class="goal-footer">
                    <span class="dash-value">${textDetail}</span>
                    <div class="goal-actions">
                        ${actionBtn}
                        <button class="btn-delete-event btn-delete-goal"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
                ${deadlineText}
            `;
            
            card.querySelector('.goal-header').addEventListener('click', () => openHistoryModal(goal));
            card.querySelector('.btn-action-financial')?.addEventListener('click', () => {
                document.getElementById('deposit-goal-id').value = goal.id;
                openModal('deposit-bottom-sheet');
            });
            card.querySelector('.btn-action-habit')?.addEventListener('click', async () => {
                await runAction(card, async () => {
                    const latest = store.goals.find(item => sameId(item.id, goal.id));
                    if (!latest) throw new Error('Meta não encontrada.');
                    const { current, target } = goalProgress(latest);
                    if (current >= target) return;
                    await store.saveRecord('goals', { ...latest, current: current + 1, history: [...(latest.history || []), { date: getLocalDateString(), owner: store.getAuthorName(), personId: store.getLoggedUser(), amount: 1 }] });
                    celebrate(latest.current, current + 1, target); renderGoals();
                });
            });
            card.querySelector('.btn-delete-goal').addEventListener('click', async () => {
                if (!confirm('Excluir esta meta e seu histórico?')) return;
                await runAction(card, async () => { await store.deleteRecord('goals', goal.id); renderGoals(); });
            });
            goalsContainer.appendChild(card);
        });
    }
    if (document.getElementById('metric-goals-saved')) document.getElementById('metric-goals-saved').textContent = formatCurrency(totalSaved);
    if (document.getElementById('metric-goals-count')) document.getElementById('metric-goals-count').textContent = store.goals ? store.goals.length : 0;
};

const openHistoryModal = (goal) => {
    triggerHaptic(10);
    document.getElementById('goal-history-title').textContent = `Histórico: ${goal.title}`;
    const listEl = document.getElementById('goal-history-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    const history = goal.history || [];
    if (goal._invalidHistory?.length) listEl.innerHTML = '<li class="empty-state">Parte do histórico é inválida e foi isolada. O original permanece no banco.</li>';
    
    if (history.length === 0 && !goal._invalidHistory?.length) {
        listEl.innerHTML = `<li class="empty-state">Nenhum registro ainda.</li>`;
    } else {
        [...history].reverse().forEach(entry => {
            const [y, m, d] = String(entry.date || '').split('-').map(escapeHTML);
            const valText = goal.type === 'financial' ? formatCurrency(entry.amount) : `+${escapeHTML(entry.amount)} ${escapeHTML(goal.unit || 'vezes')}`;
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
                <div class="task-text">
                    <strong class="task-item-title">${valText}</strong>
                    <div class="task-item-subtitle">Feito por ${escapeHTML(entry.owner)} em ${d}/${m}/${y}</div>
                </div>
            `;
            listEl.appendChild(li);
        });
    }
    openModal('goal-history-bottom-sheet');
};

const celebrate = (before, after, target) => {
    const crossed = [100, 75, 50, 25].find(mark => before / target * 100 < mark && after / target * 100 >= mark);
    triggerHaptic(crossed ? [100, 50, 100] : 20);
    if (crossed && window.confetti) window.confetti({ particleCount: crossed === 100 ? 150 : 60, spread: 70, origin: { y: 0.6 } });
};

export const initGoals = () => {
    const formGoal = document.getElementById('form-add-goal');
    const presetContainer = document.getElementById('goal-icon-presets');
    const iconInput = document.getElementById('goal-icon');
    const iconPreview = document.getElementById('goal-icon-preview');

    const selectIcon = (icon) => {
        if (iconInput) iconInput.value = icon;
        if (iconPreview) iconPreview.textContent = icon;
        if (presetContainer) {
            presetContainer.querySelectorAll('.preset-icon-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.textContent === icon);
            });
        }
    };

    if (presetContainer && presetContainer.children.length === 0) {
        PRESET_ICONS.forEach(icon => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `preset-icon-btn ${icon === '🎯' ? 'selected' : ''}`;
            btn.textContent = icon;
            btn.addEventListener('click', () => {
                triggerHaptic(10);
                selectIcon(icon);
            });
            presetContainer.appendChild(btn);
        });
    }

    document.getElementById('btn-open-goal-modal')?.addEventListener('click', () => {
        selectIcon('🎯');
        openModal('goal-bottom-sheet');
    });

    document.getElementById('btn-select-goal-icon')?.addEventListener('click', () => document.getElementById('goal-icon-presets')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    document.getElementById('goal-type')?.addEventListener('change', (e) => {
        if (e.target.value === 'financial') {
            document.getElementById('group-goal-financial')?.classList.remove('d-none');
            document.getElementById('group-goal-habit')?.classList.add('d-none');
        } else {
            document.getElementById('group-goal-financial')?.classList.add('d-none');
            document.getElementById('group-goal-habit')?.classList.remove('d-none');
        }
    });

    formGoal?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const type = document.getElementById('goal-type').value;
            const data = validateGoal({ type, title: document.getElementById('goal-title').value, icon: iconInput?.value || '🎯', owner: document.getElementById('goal-owner').value, target: document.getElementById(type === 'financial' ? 'goal-target-fin' : 'goal-target-habit').value, current: type === 'financial' ? document.getElementById('goal-initial-fin').value : 0, unit: type === 'habit' ? document.getElementById('goal-unit-habit').value : null, deadline: type === 'financial' ? document.getElementById('goal-deadline-fin').value || null : null, history: [] });
            if (data.current > 0) data.history.push({ date: getLocalDateString(), owner: store.getAuthorName(), personId: store.getLoggedUser(), amount: data.current });
            await store.saveRecord('goals', data, { create: true });
            triggerHaptic(30); renderGoals(); closeAllModals(true); form.reset(); selectIcon('🎯');
            document.getElementById('group-goal-financial')?.classList.remove('d-none'); document.getElementById('group-goal-habit')?.classList.add('d-none');
        });
    });
    document.getElementById('form-add-deposit')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const id = document.getElementById('deposit-goal-id').value;
            const goal = store.goals.find(item => sameId(item.id, id));
            if (!goal) throw new Error('Esta meta não está disponível. Recarregue.');
            const amount = cents(numberValue(document.getElementById('deposit-amount').value, 'Depósito', { min: 0.01 })) / 100;
            const { current, target } = goalProgress(goal);
            const next = (cents(current) + cents(amount)) / 100;
            await store.saveRecord('goals', { ...goal, current: next, history: [...(goal.history || []), { date: getLocalDateString(), owner: store.getAuthorName(), personId: store.getLoggedUser(), amount }] });
            celebrate(current, next, target); renderGoals(); closeAllModals(true); form.reset();
        });
    });

    renderGoals();
};