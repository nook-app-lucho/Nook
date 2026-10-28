import { store } from '../store.js'; 
import { triggerHaptic, formatCurrency, escapeHTML, getAvatarHtml, openModal, openConfirmSheet, closeAllModals, runAction, editWarning, saveFormEdit, showToast } from '../utils.js'; 

import { localDate, sameId, financeShare, financialSummary, validateExpense, validDate, expenseDueStatus } from '../rules.js';
let expenseEditContext = null;
let financeSetupContext = null;
let selectedHistoryMonth = localDate().slice(0, 7); 

const CAT_INFO = {
    moradia: { label: 'Moradia' },
    mercado: { label: 'Mercado' },
    lazer: { label: 'Lazer' },
    transporte: { label: 'Transporte' },
    outros: { label: 'Outros' }
};

const selectedMonthLabel = () => {
    const [year, month] = selectedHistoryMonth.split('-').map(Number);
    if (!year || !month) return 'mês selecionado';
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, month - 1, 1)));
};

const updateFinancesSummary = () => {
    let summary;
    try { summary = financialSummary(store.expenses, store.finances, selectedHistoryMonth); }
    catch (error) {
        const card = document.getElementById('fin-settlement-card');
        card?.classList.remove('d-none');
        const warning = document.getElementById('fin-data-warning');
        if (warning) { warning.textContent = error.message; warning.classList.remove('d-none'); }
        const total = document.getElementById('val-fin-m1'); if (total) total.textContent = 'Revisar dados';
        document.getElementById('fin-chart-card')?.classList.add('d-none');
        const text = document.getElementById('fin-settlement-text');
        if (text) text.textContent = `${error.message} Revise a regra de divisão.`;
        return;
    }
    const totalPending = summary.pending / 100, totalOverall = summary.total / 100;
    const categoryTotals = Object.fromEntries(Object.entries(summary.categories).map(([key, value]) => [key, value / 100]));
    const warning = document.getElementById('fin-data-warning');
    if (warning) { warning.textContent = summary.invalid.length ? `${summary.invalid.length} conta(s) com dados inválidos não entram nos cálculos. Edite-as para corrigir.` : ''; warning.classList.toggle('d-none', !summary.invalid.length); }

    // Atualiza o valor Total
    const valM1 = document.getElementById('val-fin-m1');
    if (valM1) valM1.textContent = formatCurrency(totalPending);

    // Atualiza o Gráfico de Categorias
    const chartCard = document.getElementById('fin-chart-card');
    const chartBar = document.getElementById('fin-chart-bar');
    const chartLegend = document.getElementById('fin-chart-legend');
    
    if (chartCard) {
        if (totalOverall === 0) chartCard.classList.add('d-none');
        else {
            chartCard.classList.remove('d-none'); 
            if (chartBar) chartBar.innerHTML = ''; 
            if (chartLegend) chartLegend.innerHTML = '';
            Object.keys(categoryTotals).forEach(cat => {
                const amount = categoryTotals[cat];
                if (amount > 0) {
                    const percent = (amount / totalOverall) * 100;
                    const info = CAT_INFO[cat];
                    if (chartBar) {
                        const segment = document.createElement('div');
                        segment.className = `chart-bar-segment category-bg-${cat}`;
                        segment.style.setProperty('--segment-width', `${percent}%`);
                        chartBar.appendChild(segment);
                    }
                    if (chartLegend) {
                        const item = document.createElement('div');
                        item.className = 'chart-legend-item';
                        item.innerHTML = `<div class="category-dot category-bg-${cat}"></div><span class="text-muted">${info.label} (${Math.round(percent)}%)</span>`;
                        chartLegend.appendChild(item);
                    }
                }
            });
        }
    }

    // Atualiza o Bloco de Acerto de Contas usando exclusivamente o mês selecionado.
    const settleCard = document.getElementById('fin-settlement-card');
    const settleLabel = document.getElementById('fin-settlement-label');
    const settleText = document.getElementById('fin-settlement-text');
    if (settleCard && settleText) {
        const model = store.finances.model;
        const monthLabel = selectedMonthLabel();
        const p1Name = store.profile?.p1 || 'P1';
        const p2Name = store.profile?.p2 || 'P2';
        if (settleLabel) settleLabel.textContent = `Acerto de ${monthLabel}`;

        if (!store.finances.configured || model === 'single' || model === 'custom' || model === '100-p1' || model === '100-p2') {
            settleCard.classList.add('d-none');
        } else {
            settleCard.classList.remove('d-none');
            settleText.className = 'dash-value settlement-value';

            if (summary.total === 0) {
                settleText.textContent = 'Ainda não há despesas para calcular o acerto deste mês.';
            } else if (summary.paid === 0) {
                settleText.textContent = 'Ainda não há despesas pagas para calcular o acerto deste mês.';
            } else if (summary.balance === 0) {
                settleText.innerHTML = `<span class="settlement-context">Para equilibrar as contas de ${escapeHTML(monthLabel)}:</span><strong class="settlement-transfer">Tudo equilibrado neste mês ✓</strong>`;
            } else {
                const balanceP1 = summary.balance / 100;
                const p1Owes = balanceP1 < 0;
                const debtor = p1Owes ? p1Name : p2Name;
                const creditor = p1Owes ? p2Name : p1Name;
                const amount = Math.abs(balanceP1);
                const context = `<span class="settlement-context">Para equilibrar as contas de ${escapeHTML(monthLabel)}:</span>`;
                if (store.finances.settleMode === 'transfer') {
                    settleText.innerHTML = `${context}<strong class="settlement-transfer">${escapeHTML(debtor)} transfere ${formatCurrency(amount)} para ${escapeHTML(creditor)}</strong>`;
                } else {
                    settleText.innerHTML = `${context}<strong class="settlement-transfer">${escapeHTML(debtor)} assume os próximos gastos até compensar ${formatCurrency(amount)}</strong>`;
                }
            }
        }
    }

};

export const renderFinances = () => {
    const title = document.getElementById('fin-banner-title');
    const valM2 = document.getElementById('val-fin-m2');
    const propBar = document.getElementById('fin-proportional-bar-container');
    
    if (!title || !valM2) return;
    
    const p1Name = store.profile?.p1 || 'P1';
    const p2Name = store.profile?.p2 || 'P2';
    
    const opt100P1 = document.getElementById('opt-100-p1');
    const opt100P2 = document.getElementById('opt-100-p2');
    if (opt100P1) opt100P1.textContent = `100% Pago por ${p1Name}`;
    if (opt100P2) opt100P2.textContent = `100% Pago por ${p2Name}`;
    
    const lblIs = document.getElementById('label-fin-inc-p1');
    const lblVo = document.getElementById('label-fin-inc-p2');
    if (lblIs) lblIs.textContent = `Renda ${p1Name} (R$)`;
    if (lblVo) lblVo.textContent = `Renda ${p2Name} (R$)`;
    
    if (!store.finances.configured) {
        title.textContent = "Como dividem as contas?"; 
        valM2.textContent = "Definir";
        if (propBar) propBar.classList.add('d-none');
    } else {
        if (store.finances.model === '50/50') {
            valM2.textContent = "50 / 50"; 
            title.textContent = "Regra: Divisão 50/50";
            if (propBar) propBar.classList.add('d-none');
        } else if (store.finances.model === 'proportional') {
            let share;
            try { share = financeShare(store.finances); } catch { share = null; }
            const pctIS = share === null ? 50 : Math.round(share * 100);
            const pctVO = 100 - pctIS;
            valM2.textContent = share === null ? 'Revisar rendas' : `${pctIS}% / ${pctVO}%`; 
            title.textContent = share === null ? 'Regra proporcional: revisar rendas' : 'Regra: Proporcional';
            if (propBar) {
                propBar.classList.toggle('d-none', share === null);
                document.getElementById('prop-val-is').textContent = `${pctIS}%`;
                document.getElementById('prop-val-vo').textContent = `${pctVO}%`;
                document.getElementById('prop-fill-is').style.setProperty('--progress-width', `${pctIS}%`);
            }
        } else if (store.finances.model === '100-p1') {
            valM2.textContent = `100% ${p1Name}`; 
            title.textContent = `Regra: ${p1Name} paga tudo`;
            if (propBar) propBar.classList.add('d-none');
        } else if (store.finances.model === '100-p2') {
            valM2.textContent = `100% ${p2Name}`; 
            title.textContent = `Regra: ${p2Name} paga tudo`;
            if (propBar) propBar.classList.add('d-none');
        } else {
            valM2.textContent = "Customizado"; 
            title.textContent = "Regra: Conta Conjunta ou Fixas";
            if (propBar) propBar.classList.add('d-none');
        }
    }
    
    const expensesContainer = document.getElementById('expenses-list-container');
    const historyContainer = document.getElementById('expenses-history-list');
    if (expensesContainer) expensesContainer.innerHTML = ''; 
    if (historyContainer) historyContainer.innerHTML = '';
    
    const sortedExpenses = [...(store.expenses || [])].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const pendingList = sortedExpenses.filter(e => !e.completed);
    const paidList = sortedExpenses.filter(e => e.completed && (!validDate(e.date) || e.date.startsWith(selectedHistoryMonth)));
    
    const createExpenseElement = (exp) => {
        const catInfo = CAT_INFO[exp.category] || CAT_INFO['outros'];
        const [, em, ed] = validDate(exp.date) ? exp.date.split('-') : ['', '?', '?'];
        let dueMarkup = `Vence dia ${escapeHTML(ed)}/${escapeHTML(em)}`;
        if (!exp.completed && validDate(exp.date)) {
            const due = expenseDueStatus(exp.date);
            dueMarkup = `<span class="expense-due-status expense-due-status--${due.type}">${escapeHTML(due.label)}</span><span class="expense-due-date"> · ${escapeHTML(ed)}/${escapeHTML(em)}</span>`;
        }
        const li = document.createElement('li');
        li.className = `task-item expense-item ${exp.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <div class="checkbox expense-checkbox"><i class="ph-bold ph-check"></i></div>
            <div class="dash-icon dash-icon-finance expense-cat-icon">
                <div class="expense-category-dot category-bg-${exp.category in CAT_INFO ? exp.category : 'outros'}"></div>
            </div>
            <div class="task-text flex-1">
                <strong class="task-item-title">${escapeHTML(exp.title)}</strong>
                <div class="task-item-subtitle">${dueMarkup}</div>
            </div>
            ${getAvatarHtml(exp.owner, '24px')}
            <div class="expense-actions">
                <span class="expense-amount">${formatCurrency(exp.amount)}</span>
                <button class="btn-edit-item btn-edit-expense"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-delete-event btn-delete-expense"><i class="ph ph-trash"></i></button>
            </div>
        `;
        
        li.querySelector('.checkbox').addEventListener('click', async () => {
            await runAction(li, async () => {
                await store.saveRecord('expenses', { ...exp, completed: !exp.completed });
                triggerHaptic(15); renderFinances();
            });
        });
        li.querySelector('.btn-delete-expense').addEventListener('click', () => {
            openConfirmSheet({
                title: 'Excluir conta?',
                message: `“${exp.title || 'Esta conta'}” será removida. Esta ação não poderá ser desfeita.`,
                confirmLabel: 'Excluir conta',
                onConfirm: async () => {
                    await store.deleteRecord('expenses', exp.id);
                    triggerHaptic(20);
                    renderFinances();
                    showToast('Conta excluída.');
                }
            });
        });

        li.querySelector('.btn-edit-expense').addEventListener('click', () => {
            expenseEditContext = store.captureEdit('expenses', exp.id);
            const opened = expenseEditContext.record;
            editWarning('expense-edit-warning');
            document.getElementById('expense-id').value = opened.id;
            document.getElementById('expense-title').value = opened.title;
            document.getElementById('expense-amount').value = opened.amount;
            document.getElementById('expense-date').value = validDate(opened.date) ? opened.date : '';
            document.getElementById('expense-category').value = opened.category;
            document.getElementById('expense-owner').value = opened.owner;
            document.getElementById('expense-modal-title').textContent = "Editar Conta";
            openModal('expense-bottom-sheet');
        });
        
        return li;
    };
    
    if (expensesContainer) {
        if (pendingList.length === 0) expensesContainer.innerHTML = `<li class="empty-state">Tudo pago! Nenhuma pendente.</li>`;
        else pendingList.forEach(exp => { expensesContainer.appendChild(createExpenseElement(exp)); });
    }
    
    if (historyContainer) {
        if (paidList.length === 0) historyContainer.innerHTML = `<li class="empty-state">Nenhuma paga ainda.</li>`;
        else paidList.forEach(exp => { historyContainer.appendChild(createExpenseElement(exp)); });
    }
    
    updateFinancesSummary(); // Executa o cálculo e aplica ao DOM
};

export const initFinances = () => {
    const month = document.getElementById('fin-history-month'); if (month) month.value = selectedHistoryMonth;
    const updateSetupVisibility = () => {
        const model = document.getElementById('fin-model-select').value;
        document.getElementById('fin-income-inputs')?.classList.toggle('d-none', model !== 'proportional');
        document.getElementById('fin-settle-mode-group')?.classList.toggle('d-none', !['50/50', 'proportional'].includes(model));
    };
    const fillSetupForm = ({ syncOriginal = false } = {}) => {
        const fields = [
            ['fin-model-select', store.finances.model || '50/50'],
            ['fin-income-is', store.finances.incomeIS ?? 0],
            ['fin-income-vo', store.finances.incomeVO ?? 0],
            ['fin-settle-mode-select', store.finances.settleMode || 'transfer']
        ];
        fields.forEach(([id, value]) => {
            const field = document.getElementById(id);
            if (!field) return;
            field.value = value;
            if (syncOriginal) field.dataset.originalValue = String(value);
        });
        updateSetupVisibility();
    };
    const openSetup = () => {
        fillSetupForm();
        financeSetupContext = {
            id: store.finances.id ?? null,
            nook_version: store.finances.nook_version ?? null
        };
        openModal('fin-setup-bottom-sheet');
    };
    document.getElementById('btn-open-fin-setup')?.addEventListener('click', openSetup);
    document.getElementById('fin-setup-banner')?.addEventListener('click', openSetup);
    document.getElementById('fin-model-select')?.addEventListener('change', updateSetupVisibility);
    document.getElementById('form-fin-setup')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            try {
                await store.setFinances({ model: document.getElementById('fin-model-select').value, incomeIS: document.getElementById('fin-income-is').value, incomeVO: document.getElementById('fin-income-vo').value, settleMode: document.getElementById('fin-settle-mode-select').value, configured: true }, financeSetupContext);
            } catch (error) {
                if (error?.code === 'FINANCE_CONFLICT') {
                    fillSetupForm({ syncOriginal: true });
                    financeSetupContext = {
                        id: store.finances.id ?? null,
                        nook_version: store.finances.nook_version ?? null
                    };
                }
                throw error;
            }
            financeSetupContext = {
                id: store.finances.id ?? null,
                nook_version: store.finances.nook_version ?? null
            };
            triggerHaptic(30); renderFinances(); closeAllModals(true); showToast('Configuração financeira salva ✓');
        });
    });

    document.getElementById('btn-big-add-expense')?.addEventListener('click', () => {
        expenseEditContext = null; editWarning('expense-edit-warning');
        document.getElementById('form-add-expense').reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('expense-modal-title').textContent = 'Nova Conta';
        openModal('expense-bottom-sheet');
    });

    document.getElementById('form-add-expense')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const id = document.getElementById('expense-id').value;
            const existing = id ? expenseEditContext?.record : null;
            if (id && (!existing || !sameId(existing.id, id))) throw new Error('Esta conta mudou. Recarregue antes de editar.');
            const data = validateExpense({ ...(existing || { completed: false }), title: document.getElementById('expense-title').value, amount: document.getElementById('expense-amount').value, category: document.getElementById('expense-category').value, date: document.getElementById('expense-date').value, owner: document.getElementById('expense-owner').value });
            const saved = id ? await saveFormEdit(expenseEditContext, data, 'expense-edit-warning') : await store.saveRecord('expenses', data, { create: true });
            document.getElementById('expense-id').value = saved.id;
            triggerHaptic(30); renderFinances(); closeAllModals(true); form.reset();
            showToast(id ? 'Conta atualizada ✓' : 'Conta adicionada ✓');
        });
    });

    document.getElementById('fin-history-month')?.addEventListener('change', (e) => { 
        selectedHistoryMonth = e.target.value; 
        renderFinances(); 
    });
    
    renderFinances();
};