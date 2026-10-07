import { store } from '../store.js'; 
import { triggerHaptic, formatCurrency, escapeHTML, getAvatarHtml, openModal, closeAllModals, runAction } from '../utils.js'; 

import { localDate, sameId, financeShare, financialSummary, validateExpense, validDate } from '../rules.js';
let selectedHistoryMonth = localDate().slice(0, 7); 

const CAT_INFO = {
    'moradia': { color: '#E07A5F', label: 'Moradia' },
    'mercado': { color: '#2A9D8F', label: 'Mercado' },
    'lazer': { color: '#E9C46A', label: 'Lazer' },
    'transporte': { color: '#F4A261', label: 'Transporte' },
    'outros': { color: '#8A7A75', label: 'Outros' }
};

const updateFinancesSummary = () => {
    let summary;
    try { summary = financialSummary(store.expenses, store.finances, selectedHistoryMonth); }
    catch (error) {
        const card = document.getElementById('fin-settlement-card');
        card?.classList.remove('d-none');
        const total = document.getElementById('val-fin-m1'); if (total) total.textContent = 'Revisar dados';
        document.getElementById('fin-chart-card')?.classList.add('d-none');
        const text = document.getElementById('fin-settlement-text');
        if (text) text.textContent = `${error.message} Revise a regra de divisão.`;
        return;
    }
    const totalPending = summary.pending / 100, totalOverall = summary.total / 100;
    const paidByIS = summary.paidP1 / 100, paidByVO = summary.paidP2 / 100;
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
                    chartBar?.insertAdjacentHTML('beforeend', `<div class="chart-bar-segment" style="width: ${percent}%; background-color: ${info.color};"></div>`);
                    chartLegend?.insertAdjacentHTML('beforeend', `<div class="chart-legend-item"><div style="width: 8px; height: 8px; border-radius: 50%; background: ${info.color};"></div><span class="text-muted">${info.label} (${Math.round(percent)}%)</span></div>`);
                }
            });
        }
    }

    // Atualiza o Bloco de Acerto de Contas
    const settleCard = document.getElementById('fin-settlement-card');
    const settleText = document.getElementById('fin-settlement-text');
    if (settleCard && settleText) {
        const model = store.finances.model;
        if (!store.finances.configured || model === 'single' || model === 'custom' || model === '100-p1' || model === '100-p2' || (paidByIS === 0 && paidByVO === 0)) {
            settleCard.classList.add('d-none');
        } else {
            settleCard.classList.remove('d-none');
            
            const balanceIS = summary.balance / 100;
            const p1Name = store.profile?.p1 || 'P1';
            const p2Name = store.profile?.p2 || 'P2';

            if (summary.balance === 0) {
                settleText.textContent = "Tudo certo! Ninguém deve ninguém."; 
                settleText.className = 'dash-value settlement-value';
            } else {
                const owesIS = balanceIS < 0;
                const debtor = owesIS ? p1Name : p2Name;
                const creditor = owesIS ? p2Name : p1Name;
                const amount = Math.abs(balanceIS);
                if (store.finances.settleMode === 'transfer') settleText.innerHTML = `<span class="text-danger">${escapeHTML(debtor)} transfere ${formatCurrency(amount)}</span> para ${escapeHTML(creditor)}`;
                else settleText.innerHTML = `<span class="text-primary">${escapeHTML(debtor)} assume os próximos</span> (Saldo de ${formatCurrency(amount)} a quitar)`;
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
                document.getElementById('prop-fill-is').style.width = `${pctIS}%`;
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
        const li = document.createElement('li');
        li.className = `task-item expense-item ${exp.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <div class="checkbox expense-checkbox"><i class="ph-bold ph-check"></i></div>
            <div class="dash-icon dash-icon-finance expense-cat-icon">
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${catInfo.color};"></div>
            </div>
            <div class="task-text flex-1">
                <strong class="task-item-title">${escapeHTML(exp.title)}</strong>
                <div class="task-item-subtitle">Vence dia ${escapeHTML(ed)}/${escapeHTML(em)}</div>
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
        li.querySelector('.btn-delete-expense').addEventListener('click', async () => {
            if (!confirm('Excluir esta conta?')) return;
            await runAction(li, async () => { await store.deleteRecord('expenses', exp.id); triggerHaptic(20); renderFinances(); });
        });

        li.querySelector('.btn-edit-expense').addEventListener('click', () => {
            document.getElementById('expense-id').value = exp.id;
            document.getElementById('expense-title').value = exp.title;
            document.getElementById('expense-amount').value = exp.amount;
            document.getElementById('expense-date').value = validDate(exp.date) ? exp.date : '';
            document.getElementById('expense-category').value = exp.category;
            document.getElementById('expense-owner').value = exp.owner;
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
    const openSetup = () => {
        document.getElementById('fin-model-select').value = store.finances.model || '50/50';
        document.getElementById('fin-income-is').value = store.finances.incomeIS ?? 0;
        document.getElementById('fin-income-vo').value = store.finances.incomeVO ?? 0;
        document.getElementById('fin-settle-mode-select').value = store.finances.settleMode || 'transfer';
        updateSetupVisibility(); openModal('fin-setup-bottom-sheet');
    };
    document.getElementById('btn-open-fin-setup')?.addEventListener('click', openSetup);
    document.getElementById('fin-setup-banner')?.addEventListener('click', openSetup);
    document.getElementById('fin-model-select')?.addEventListener('change', updateSetupVisibility);
    document.getElementById('form-fin-setup')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            await store.setFinances({ model: document.getElementById('fin-model-select').value, incomeIS: document.getElementById('fin-income-is').value, incomeVO: document.getElementById('fin-income-vo').value, settleMode: document.getElementById('fin-settle-mode-select').value, configured: true });
            triggerHaptic(30); renderFinances(); closeAllModals(true);
        });
    });

    document.getElementById('btn-big-add-expense')?.addEventListener('click', () => {
        document.getElementById('form-add-expense').reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('expense-modal-title').textContent = 'Nova Conta';
        openModal('expense-bottom-sheet');
    });

    document.getElementById('form-add-expense')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const id = document.getElementById('expense-id').value;
            const existing = id ? store.expenses.find(exp => sameId(exp.id, id)) : null;
            if (id && !existing) throw new Error('Esta conta mudou. Recarregue antes de editar.');
            const data = validateExpense({ ...(existing || { completed: false }), title: document.getElementById('expense-title').value, amount: document.getElementById('expense-amount').value, category: document.getElementById('expense-category').value, date: document.getElementById('expense-date').value, owner: document.getElementById('expense-owner').value });
            const saved = await store.saveRecord('expenses', data, { create: !id });
            document.getElementById('expense-id').value = saved.id;
            triggerHaptic(30); renderFinances(); closeAllModals(true); form.reset();
        });
    });

    document.getElementById('fin-history-month')?.addEventListener('change', (e) => { 
        selectedHistoryMonth = e.target.value; 
        renderFinances(); 
    });
    
    renderFinances();
};