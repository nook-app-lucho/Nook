import { store } from '../store.js';
import {
    formatCurrency,
    getInitials,
    escapeHTML,
    getLocalDateString,
    openModal,
    openConfirmSheet,
    closeAllModals,
    runAction,
    showToast,
    editWarning,
    saveFormEdit,
    triggerHaptic
} from '../utils.js';
import {
    OWNER,
    GOAL_TYPE,
    sameId,
    goalProgress,
    validateGoal,
    numberValue,
    cents,
    goalForecast,
    undoLastGoalProgress
} from '../rules.js';

const PRESET_ICONS = ['🎯', '✈️', '🏠', '🚗', '💰', '💍', '🏖️', '🎓', '🛒', '🎮', '👶', '🚴', '💻', '🐾', '❤️', '🍿'];

let goalEditContext = null;
let editingGoalId = null;
let completedGoalsExpanded = false;

const syncGoalTypeFields = (type, editing = false) => {
    const financial = type === GOAL_TYPE.FINANCIAL;
    document.getElementById('group-goal-financial')?.classList.toggle('d-none', !financial);
    document.getElementById('group-goal-habit')?.classList.toggle('d-none', financial);

    const currentInput = document.getElementById('goal-initial-fin');
    const currentLabel = document.getElementById('goal-current-label');
    if (currentInput) currentInput.disabled = editing;
    if (currentLabel) currentLabel.textContent = editing ? 'Atual' : 'Inicial';
};

const selectGoalIcon = icon => {
    const iconInput = document.getElementById('goal-icon');
    const iconPreview = document.getElementById('goal-icon-preview');
    const presetContainer = document.getElementById('goal-icon-presets');
    if (iconInput) iconInput.value = icon;
    if (iconPreview) iconPreview.textContent = icon;
    presetContainer?.querySelectorAll('.preset-icon-btn').forEach(button => {
        button.classList.toggle('selected', button.textContent === icon);
    });
};

const resetGoalForm = () => {
    const form = document.getElementById('form-add-goal');
    form?.reset();
    goalEditContext = null;
    editingGoalId = null;
    editWarning('goal-edit-warning');

    const typeInput = document.getElementById('goal-type');
    if (typeInput) {
        typeInput.disabled = false;
        typeInput.value = GOAL_TYPE.FINANCIAL;
    }
    document.getElementById('goal-modal-title').textContent = 'Nova Meta';
    document.getElementById('btn-submit-goal').textContent = 'Criar Meta';
    document.getElementById('goal-deadline').value = '';
    selectGoalIcon('🎯');
    syncGoalTypeFields(GOAL_TYPE.FINANCIAL, false);
};

const openGoalCreator = () => {
    resetGoalForm();
    openModal('goal-bottom-sheet');
};

const openGoalEditor = goal => {
    goalEditContext = store.captureEdit('goals', goal.id);
    const opened = goalEditContext.record;
    editingGoalId = opened.id;
    editWarning('goal-edit-warning');

    const typeInput = document.getElementById('goal-type');
    typeInput.value = opened.type;
    typeInput.disabled = true;

    document.getElementById('goal-title').value = opened.title || '';
    document.getElementById('goal-owner').value = opened.owner || OWNER.COUPLE;
    document.getElementById('goal-deadline').value = opened.deadline || '';
    document.getElementById('goal-target-fin').value = opened.type === GOAL_TYPE.FINANCIAL ? opened.target : '';
    document.getElementById('goal-initial-fin').value = opened.type === GOAL_TYPE.FINANCIAL ? opened.current : '';
    document.getElementById('goal-target-habit').value = opened.type === GOAL_TYPE.HABIT ? opened.target : '';
    document.getElementById('goal-unit-habit').value = opened.type === GOAL_TYPE.HABIT ? (opened.unit || '') : '';
    document.getElementById('goal-modal-title').textContent = 'Editar Meta';
    document.getElementById('btn-submit-goal').textContent = 'Salvar Alterações';
    selectGoalIcon(opened.icon || '🎯');
    syncGoalTypeFields(opened.type, true);
    openModal('goal-bottom-sheet');
};

const ownerBadge = goal => {
    const p1Init = store.profile ? getInitials(store.profile.p1) : 'IS';
    const p2Init = store.profile ? getInitials(store.profile.p2) : 'VO';
    if (goal.owner === OWNER.COUPLE) return { text: 'NÓS', className: 'bg-casal' };
    if (goal.owner === OWNER.P2) return { text: p2Init, className: 'bg-muted' };
    return { text: p1Init, className: '' };
};

const deadlineMessage = (goal, progress) => {
    let html = progress.invalid
        ? '<div class="goal-alert goal-alert-danger">Esta meta tem dados inválidos. Não registre valores até revisar sua configuração.</div>'
        : '';

    if (!progress.invalid && goal.deadline && !progress.complete) {
        try {
            const forecast = goalForecast(goal);
            const remaining = goal.type === GOAL_TYPE.FINANCIAL
                ? formatCurrency(forecast.remaining)
                : `${forecast.remaining} ${escapeHTML(goal.unit || 'vezes')}`;
            const rate = goal.type === GOAL_TYPE.FINANCIAL
                ? formatCurrency(forecast.rate)
                : `${Number(forecast.rate).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${escapeHTML(goal.unit || 'vezes')}`;

            if (forecast.days > 0) html += `<div class="goal-alert goal-alert-info"><strong>Faltam ${forecast.days} dias.</strong> Para chegar lá: <strong>${rate}/${forecast.period}</strong>.</div>`;
            else if (forecast.days === 0) html += `<div class="goal-alert goal-alert-warning">O prazo é hoje. Faltam ${remaining}.</div>`;
            else html += '<div class="goal-alert goal-alert-danger">Prazo esgotado!</div>';
        } catch {
            html += '<div class="goal-alert goal-alert-warning">O prazo desta meta é inválido.</div>';
        }
    }

    if (goal._invalidHistory?.length) {
        html += `<div class="goal-alert goal-alert-warning" role="alert">${goal._invalidHistory.length} registro(s) inválido(s) no histórico. Os dados originais estão preservados no banco.</div>`;
    }
    return html;
};

const celebrateCompletion = (before, after, target) => {
    if (before < target && after >= target) {
        triggerHaptic([100, 50, 100]);
        if (window.confetti) window.confetti({ particleCount: 60, spread: 55, origin: { y: 0.65 } });
    }
};

const openHistoryModal = goal => {
    document.getElementById('goal-history-title').textContent = `Histórico: ${goal.title}`;
    const listEl = document.getElementById('goal-history-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    const history = goal.history || [];

    if (goal._invalidHistory?.length) listEl.innerHTML = '<li class="empty-state">Parte do histórico é inválida e foi isolada. O original permanece no banco.</li>';
    if (history.length === 0 && !goal._invalidHistory?.length) {
        listEl.innerHTML = '<li class="empty-state">Nenhum registro ainda.</li>';
    } else {
        [...history].reverse().forEach(entry => {
            const [year, month, day] = String(entry.date || '').split('-').map(escapeHTML);
            const value = goal.type === GOAL_TYPE.FINANCIAL
                ? formatCurrency(entry.amount)
                : `+${escapeHTML(entry.amount)} ${escapeHTML(goal.unit || 'vezes')}`;
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
                <div class="task-text">
                    <strong class="task-item-title">${value}</strong>
                    <div class="task-item-subtitle">Feito por ${escapeHTML(entry.owner)} em ${day}/${month}/${year}</div>
                </div>
            `;
            listEl.appendChild(li);
        });
    }
    openModal('goal-history-bottom-sheet');
};

const renderGoalCard = goal => {
    let progress;
    try {
        progress = goalProgress(goal);
    } catch {
        progress = { percent: 0, complete: false, invalid: true };
    }

    const owner = ownerBadge(goal);
    const completed = progress.complete === true;
    const safeTitle = escapeHTML(goal.title);
    const safeIcon = escapeHTML(goal.icon || '🎯');
    const safeUnit = escapeHTML(goal.unit || 'vezes');
    const detail = goal.type === GOAL_TYPE.FINANCIAL
        ? `${formatCurrency(goal.current)} de ${formatCurrency(goal.target)}`
        : `${escapeHTML(goal.current)} de ${escapeHTML(goal.target)} ${safeUnit}`;
    const progressAction = completed
        ? ''
        : goal.type === GOAL_TYPE.FINANCIAL
            ? '<button class="btn-deposit btn-action-financial"><i class="ph ph-plus-circle"></i> Guardar</button>'
            : '<button class="btn-deposit btn-action-habit"><i class="ph ph-check-circle"></i> +1</button>';
    const undoAction = (goal.history || []).length
        ? `<button class="btn-goal-secondary btn-undo-goal" title="${goal.type === GOAL_TYPE.FINANCIAL ? 'Desfazer último depósito' : 'Desfazer último +1'}"><i class="ph ph-arrow-counter-clockwise"></i></button>`
        : '';

    const card = document.createElement('div');
    card.className = `dash-card goal-card ${completed ? 'goal-card--completed' : ''}`;
    card.innerHTML = `
        <div class="goal-header" title="Ver histórico">
            <div class="goal-title-wrap">
                <span class="dash-title">${safeIcon} ${safeTitle}</span>
                ${completed ? '<span class="goal-complete-badge">Concluída 🎉</span>' : ''}
            </div>
            <div class="goal-progress-wrap">
                <span class="goal-percent">${progress.percent}%</span>
                <div class="task-badge task-badge--compact ${owner.className}">${escapeHTML(owner.text)}</div>
            </div>
        </div>
        <div class="progress-bar"><div class="progress-fill goal-progress-fill"></div></div>
        <div class="milestones-row">
            <span class="${progress.percent >= 25 ? 'milestone-active' : ''}">${progress.percent >= 25 ? '✓ 25%' : '25%'}</span>
            <span class="${progress.percent >= 50 ? 'milestone-active' : ''}">${progress.percent >= 50 ? '✓ 50%' : '50%'}</span>
            <span class="${progress.percent >= 75 ? 'milestone-active' : ''}">${progress.percent >= 75 ? '✓ 75%' : '75%'}</span>
            <span class="${progress.percent >= 100 ? 'milestone-active' : ''}">${progress.percent >= 100 ? '✓ 100%' : '100%'}</span>
        </div>
        <div class="goal-footer">
            <span class="dash-value">${detail}</span>
            <div class="goal-actions">
                ${progressAction}
                ${undoAction}
                <button class="btn-goal-secondary btn-edit-goal" title="Editar meta"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-delete-event btn-delete-goal" title="Excluir meta"><i class="ph ph-trash"></i></button>
            </div>
        </div>
        ${deadlineMessage(goal, progress)}
    `;

    card.querySelector('.goal-progress-fill')?.style.setProperty('--progress-width', `${progress.percent}%`);
    card.querySelector('.goal-header')?.addEventListener('click', () => openHistoryModal(goal));
    card.querySelector('.btn-edit-goal')?.addEventListener('click', () => openGoalEditor(goal));

    card.querySelector('.btn-action-financial')?.addEventListener('click', () => {
        document.getElementById('deposit-goal-id').value = goal.id;
        document.getElementById('deposit-amount').value = '';
        openModal('deposit-bottom-sheet');
    });

    card.querySelector('.btn-action-habit')?.addEventListener('click', async () => {
        await runAction(card, async () => {
            const latest = store.goals.find(item => sameId(item.id, goal.id));
            if (!latest) throw new Error('Meta não encontrada.');
            const { current, target, complete } = goalProgress(latest);
            if (complete) return;
            const next = current + 1;
            await store.saveRecord('goals', {
                ...latest,
                current: next,
                history: [...(latest.history || []), { date: getLocalDateString(), owner: store.getAuthorName(), personId: store.getLoggedUser(), amount: 1 }]
            });
            celebrateCompletion(current, next, target);
            renderGoals();
            showToast(next >= target ? 'Meta concluída 🎉' : 'Progresso adicionado ✓');
        });
    });

    card.querySelector('.btn-undo-goal')?.addEventListener('click', async () => {
        await runAction(card, async () => {
            const latest = store.goals.find(item => sameId(item.id, goal.id));
            if (!latest) throw new Error('Meta não encontrada.');
            const patch = undoLastGoalProgress(latest);
            await store.saveRecord('goals', { ...latest, ...patch });
            renderGoals();
            showToast(latest.type === GOAL_TYPE.FINANCIAL ? 'Último depósito desfeito' : 'Último progresso desfeito');
        });
    });

    card.querySelector('.btn-delete-goal')?.addEventListener('click', () => {
        openConfirmSheet({
            title: 'Excluir meta?',
            message: `“${goal.title || 'Esta meta'}” e todo o histórico serão removidos. Esta ação não poderá ser desfeita.`,
            confirmLabel: 'Excluir meta',
            onConfirm: async () => {
                await store.deleteRecord('goals', goal.id);
                renderGoals();
                showToast('Meta excluída.');
            }
        });
    });

    return card;
};

export const renderGoals = () => {
    const activeContainer = document.getElementById('goals-list-container');
    const completedContainer = document.getElementById('completed-goals-list-container');
    const completedSection = document.getElementById('goals-completed-section');
    const completedGroup = document.getElementById('goals-completed-group');
    const completedTitle = document.getElementById('goals-completed-title');
    const completedCaret = document.getElementById('goals-completed-caret');
    if (!activeContainer || !completedContainer) return;

    const goals = store.goals || [];
    const activeGoals = [];
    const completedGoals = [];
    let totalSaved = 0;

    goals.forEach(goal => {
        if (goal.type === GOAL_TYPE.FINANCIAL && Number.isFinite(Number(goal.current)) && Number(goal.current) >= 0) totalSaved += Number(goal.current);
        try {
            (goalProgress(goal).complete ? completedGoals : activeGoals).push(goal);
        } catch {
            activeGoals.push(goal);
        }
    });

    activeContainer.innerHTML = '';
    completedContainer.innerHTML = '';

    if (!goals.length) {
        activeContainer.innerHTML = `
            <div class="dash-card empty-state-card--goal flex-col align-center text-center gap-12">
                <div class="dash-icon dash-icon--empty bg-primary-light mb-8"><i class="ph-fill ph-flag text-primary"></i></div>
                <strong>Ainda não há metas</strong>
                <p class="mb-0 text-muted empty-state-text-lg">Crie algo que vocês querem conquistar juntos.</p>
                <button class="btn-primary btn-outline-primary btn-inline-action mt-8" id="btn-empty-create-goal">Criar primeira meta</button>
            </div>
        `;
        document.getElementById('btn-empty-create-goal')?.addEventListener('click', openGoalCreator);
    } else if (!activeGoals.length) {
        activeContainer.innerHTML = `
            <div class="dash-card empty-state-card--goal flex-col align-center text-center gap-12">
                <strong>Todas as metas estão concluídas 🎉</strong>
                <p class="mb-0 text-muted empty-state-text-lg">Que tal escolher a próxima conquista?</p>
                <button class="btn-primary btn-outline-primary btn-inline-action mt-8" id="btn-empty-create-goal">Criar nova meta</button>
            </div>
        `;
        document.getElementById('btn-empty-create-goal')?.addEventListener('click', openGoalCreator);
    } else {
        activeGoals.forEach(goal => activeContainer.appendChild(renderGoalCard(goal)));
    }

    if (completedGoals.length) {
        completedSection?.classList.remove('d-none');
        if (completedTitle) completedTitle.textContent = `CONCLUÍDAS (${completedGoals.length})`;
        completedGroup?.classList.toggle('d-none', !completedGoalsExpanded);
        if (completedCaret) completedCaret.className = `ph ph-caret-${completedGoalsExpanded ? 'up' : 'down'}`;
        completedGoals.forEach(goal => completedContainer.appendChild(renderGoalCard(goal)));
    } else {
        completedSection?.classList.add('d-none');
        completedGoalsExpanded = false;
    }

    const savedMetric = document.getElementById('metric-goals-saved');
    const countMetric = document.getElementById('metric-goals-count');
    if (savedMetric) savedMetric.textContent = formatCurrency(totalSaved);
    if (countMetric) countMetric.textContent = activeGoals.length;
};

export const initGoals = () => {
    const formGoal = document.getElementById('form-add-goal');
    const presetContainer = document.getElementById('goal-icon-presets');

    if (presetContainer && presetContainer.children.length === 0) {
        PRESET_ICONS.forEach(icon => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `preset-icon-btn ${icon === '🎯' ? 'selected' : ''}`;
            button.textContent = icon;
            button.addEventListener('click', () => selectGoalIcon(icon));
            presetContainer.appendChild(button);
        });
    }

    document.getElementById('btn-open-goal-modal')?.addEventListener('click', openGoalCreator);
    document.getElementById('btn-select-goal-icon')?.addEventListener('click', () => document.getElementById('goal-icon-presets')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    document.getElementById('goal-type')?.addEventListener('change', event => syncGoalTypeFields(event.target.value, false));

    document.getElementById('btn-toggle-completed-goals')?.addEventListener('click', () => {
        completedGoalsExpanded = !completedGoalsExpanded;
        const group = document.getElementById('goals-completed-group');
        const caret = document.getElementById('goals-completed-caret');
        group?.classList.toggle('d-none', !completedGoalsExpanded);
        if (caret) caret.className = `ph ph-caret-${completedGoalsExpanded ? 'up' : 'down'}`;
        document.getElementById('btn-toggle-completed-goals')?.setAttribute('aria-expanded', String(completedGoalsExpanded));
    });

    formGoal?.addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        await runAction(form, async () => {
            const type = editingGoalId != null ? goalEditContext?.record?.type : document.getElementById('goal-type').value;
            if (!type) throw new Error('Reabra a edição desta meta.');

            const existing = editingGoalId != null ? goalEditContext?.record : null;
            const candidate = validateGoal({
                ...(existing || {}),
                type,
                title: document.getElementById('goal-title').value,
                icon: document.getElementById('goal-icon').value || '🎯',
                owner: document.getElementById('goal-owner').value,
                target: document.getElementById(type === GOAL_TYPE.FINANCIAL ? 'goal-target-fin' : 'goal-target-habit').value,
                current: existing?.current ?? (type === GOAL_TYPE.FINANCIAL ? document.getElementById('goal-initial-fin').value : 0),
                unit: type === GOAL_TYPE.HABIT ? document.getElementById('goal-unit-habit').value : null,
                deadline: document.getElementById('goal-deadline').value || null,
                history: existing?.history || []
            });

            if (existing) {
                await saveFormEdit(goalEditContext, {
                    title: candidate.title,
                    icon: candidate.icon,
                    owner: candidate.owner,
                    target: candidate.target,
                    unit: candidate.unit,
                    deadline: candidate.deadline
                }, 'goal-edit-warning');
                showToast('Meta atualizada ✓');
            } else {
                if (candidate.current > 0) candidate.history.push({ date: getLocalDateString(), owner: store.getAuthorName(), personId: store.getLoggedUser(), amount: candidate.current });
                await store.saveRecord('goals', candidate, { create: true });
                showToast('Meta criada ✓');
            }

            renderGoals();
            closeAllModals(true);
            resetGoalForm();
        });
    });

    document.getElementById('form-add-deposit')?.addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        await runAction(form, async () => {
            const id = document.getElementById('deposit-goal-id').value;
            const goal = store.goals.find(item => sameId(item.id, id));
            if (!goal) throw new Error('Esta meta não está disponível. Recarregue.');
            const amount = cents(numberValue(document.getElementById('deposit-amount').value, 'Depósito', { min: 0.01 })) / 100;
            const { current, target, complete } = goalProgress(goal);
            if (complete) throw new Error('Esta meta já está concluída.');
            const next = (cents(current) + cents(amount)) / 100;
            await store.saveRecord('goals', {
                ...goal,
                current: next,
                history: [...(goal.history || []), { date: getLocalDateString(), owner: store.getAuthorName(), personId: store.getLoggedUser(), amount }]
            });
            celebrateCompletion(current, next, target);
            renderGoals();
            closeAllModals(true);
            form.reset();
            showToast(next >= target ? 'Meta concluída 🎉' : 'Depósito adicionado ✓');
        });
    });

    renderGoals();
};
