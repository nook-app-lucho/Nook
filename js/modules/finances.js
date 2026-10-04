import { store } from '../store.js'; 
import { triggerHaptic, formatCurrency, escapeHTML, getAvatarHtml, openModal, closeAllModals } from '../utils.js'; 

let selectedHistoryMonth = new Date().toISOString().slice(0, 7); 

const CAT_INFO = {
    'moradia': { color: '#E07A5F', label: 'Moradia' },
    'mercado': { color: '#2A9D8F', label: 'Mercado' },
    'lazer': { color: '#E9C46A', label: 'Lazer' },
    'transporte': { color: '#F4A261', label: 'Transporte' },
    'outros': { color: '#8A7A75', label: 'Outros' }
};

const updateFinancesSummary = () => {
    let totalPending = 0, totalOverall = 0, paidByIS = 0, paidByVO = 0;
    const categoryTotals = { moradia: 0, mercado: 0, lazer: 0, transporte: 0, outros: 0 };
    
    (store.expenses || []).forEach(exp => {
        if (!exp.completed) {
            totalPending += exp.amount;
            totalOverall += exp.amount;
            categoryTotals[exp.category || 'outros'] += exp.amount;
        } else if (exp.date.startsWith(selectedHistoryMonth)) {
            totalOverall += exp.amount;
            categoryTotals[exp.category || 'outros'] += exp.amount;
            if(exp.owner === 'IS') paidByIS += exp.amount;
            else if(exp.owner === 'VO') paidByVO += exp.amount;
            else if(exp.owner === 'Casal') { paidByIS += exp.amount/2; paidByVO += exp.amount/2; }
        }
    });

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
            
            let pctIS = 50;
            if (model === 'proportional') {
                const totalIncome = (store.finances.incomeIS || 0) + (store.finances.incomeVO || 0);
                pctIS = totalIncome > 0 ? Math.round((store.finances.incomeIS / totalIncome) * 100) : 50;
            }
            
            const totalPaid = paidByIS + paidByVO;
            const targetIS = totalPaid * (pctIS / 100);
            const balanceIS = paidByIS - targetIS;
            const p1Name = store.profile?.p1 || 'P1';
            const p2Name = store.profile?.p2 || 'P2';

            if (Math.abs(balanceIS) < 1) {
                settleText.textContent = "Tudo certo! Ninguém deve ninguém."; 
                settleText.className = 'dash-value settlement-value';
            } else {
                const owesIS = balanceIS < 0;
                const debtor = owesIS ? p1Name : p2Name;
                const creditor = owesIS ? p2Name : p1Name;
                const amount = Math.abs(balanceIS);
                if (store.finances.settleMode === 'transfer') settleText.innerHTML = `<span class="text-danger">${debtor} transfere ${formatCurrency(amount)}</span> para ${creditor}`;
                else settleText.innerHTML = `<span class="text-primary">${debtor} assume os próximos</span> (Saldo de ${formatCurrency(amount)} a quitar)`;
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
            const totalIncome = (store.finances.incomeIS || 0) + (store.finances.incomeVO || 0);
            const pctIS = totalIncome > 0 ? Math.round((store.finances.incomeIS / totalIncome) * 100) : 50;
            const pctVO = 100 - pctIS;
            valM2.textContent = `${pctIS}% / ${pctVO}%`; 
            title.textContent = `Regra: Proporcional`;
            if (propBar) {
                propBar.classList.remove('d-none');
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
    
    const sortedExpenses = [...(store.expenses || [])].sort((a, b) => a.date.localeCompare(b.date));
    const pendingList = sortedExpenses.filter(e => !e.completed);
    const paidList = sortedExpenses.filter(e => e.completed && e.date.startsWith(selectedHistoryMonth));
    
    const createExpenseElement = (exp) => {
        const catInfo = CAT_INFO[exp.category] || CAT_INFO['outros'];
        const [ey, em, ed] = exp.date.split('-');
        const li = document.createElement('li');
        li.className = `task-item expense-item ${exp.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <div class="checkbox expense-checkbox"><i class="ph-bold ph-check"></i></div>
            <div class="dash-icon dash-icon-finance expense-cat-icon">
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${catInfo.color};"></div>
            </div>
            <div class="task-text flex-1">
                <strong class="task-item-title">${escapeHTML(exp.title)}</strong>
                <div class="task-item-subtitle">Vence dia ${ed}/${em}</div>
            </div>
            ${getAvatarHtml(exp.owner, '24px')}
            <div class="expense-actions">
                <span class="expense-amount">${formatCurrency(exp.amount)}</span>
                <button class="btn-edit-item btn-edit-expense"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-delete-event btn-delete-expense"><i class="ph ph-trash"></i></button>
            </div>
        `;
        
        // MANIPULAÇÃO DIRETA: Checkbox move o item fisicamente e recalcula os totais
        li.querySelector('.checkbox').addEventListener('click', () => { 
            triggerHaptic(15); 
            exp.completed = !exp.completed; 
            
            if (exp.completed) {
                li.classList.add('completed');
                if (exp.date.startsWith(selectedHistoryMonth)) {
                    document.getElementById('expenses-history-list')?.appendChild(li);
                } else {
                    li.remove(); // Fica oculto se não for do mês histórico
                }
            } else {
                li.classList.remove('completed');
                document.getElementById('expenses-list-container')?.appendChild(li);
            }
            
            store.setExpenses([...store.expenses]); 
            updateFinancesSummary();
            
            // Renderiza vazio apenas quando necessário
            if (document.getElementById('expenses-list-container')?.children.length === 0) renderFinances();
            if (document.getElementById('expenses-history-list')?.children.length === 0) renderFinances();
        });
        
        li.querySelector('.btn-delete-expense').addEventListener('click', () => { 
            triggerHaptic(20); 
            store.setExpenses(store.expenses.filter(e => e.id !== exp.id)); 
            li.remove();
            updateFinancesSummary();
            if (document.getElementById('expenses-list-container')?.children.length === 0 || document.getElementById('expenses-history-list')?.children.length === 0) renderFinances();
        });
        
        li.querySelector('.btn-edit-expense').addEventListener('click', () => {
            document.getElementById('expense-id').value = exp.id;
            document.getElementById('expense-title').value = exp.title;
            document.getElementById('expense-amount').value = exp.amount;
            document.getElementById('expense-date').value = exp.date;
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
    document.getElementById('btn-open-fin-setup')?.addEventListener('click', () => openModal('fin-setup-bottom-sheet'));
    document.getElementById('fin-setup-banner')?.addEventListener('click', () => openModal('fin-setup-bottom-sheet'));
    
    document.getElementById('fin-model-select')?.addEventListener('change', (e) => {
        const incomeInputs = document.getElementById('fin-income-inputs');
        const settleMode = document.getElementById('fin-settle-mode-group');
        
        if (e.target.value === 'proportional') incomeInputs?.classList.remove('d-none');
        else incomeInputs?.classList.add('d-none');
        
        if (e.target.value === '50/50' || e.target.value === 'proportional') settleMode?.classList.remove('d-none');
        else settleMode?.classList.add('d-none');
    });
    
    document.getElementById('form-fin-setup')?.addEventListener('submit', (e) => {
        e.preventDefault();
        store.setFinances({
            model: document.getElementById('fin-model-select').value,
            incomeIS: parseFloat(document.getElementById('fin-income-is').value) || 0,
            incomeVO: parseFloat(document.getElementById('fin-income-vo').value) || 0,
            focus: 'acerto',
            settleMode: document.getElementById('fin-settle-mode-select').value,
            configured: true
        });
        triggerHaptic(30); renderFinances(); closeAllModals(true);
    });
    
    document.getElementById('btn-big-add-expense')?.addEventListener('click', () => {
        document.getElementById('form-add-expense').reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('expense-modal-title').textContent = "Nova Conta";
        openModal('expense-bottom-sheet');
    });
    
    document.getElementById('form-add-expense')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const expenseId = document.getElementById('expense-id').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        if (isNaN(amount) || amount <= 0) return;
        
        const expenseData = {
            title: document.getElementById('expense-title').value,
            category: document.getElementById('expense-category').value,
            amount: amount,
            date: document.getElementById('expense-date').value,
            owner: document.getElementById('expense-owner').value
        };
        if (expenseId) {
            const exp = store.expenses.find(x => x.id === parseInt(expenseId));
            if(exp) Object.assign(exp, expenseData);
        } else {
            expenseData.id = Date.now();
            expenseData.completed = false;
            store.expenses.push(expenseData);
        }
        store.setExpenses([...store.expenses]);
        triggerHaptic(30); 
        renderFinances(); 
        closeAllModals(true);
        e.target.reset();
    });
    
    document.getElementById('fin-history-month')?.addEventListener('change', (e) => { 
        selectedHistoryMonth = e.target.value; 
        renderFinances(); 
    });
    
    renderFinances();
};