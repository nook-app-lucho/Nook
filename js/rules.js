// Regras puras: sem DOM, sessão ou chamadas ao banco.
export const sameId = (a, b) => a != null && b != null && String(a) === String(b);
export const numberValue = (value, label = 'Valor', { min = 0, empty = false } = {}) => {
    if (value == null || String(value).trim() === '') {
        if (empty) return 0;
        throw new Error(`${label} é obrigatório.`);
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || Math.abs(n) > Number.MAX_SAFE_INTEGER / 100) {
        throw new Error(`${label} deve ser um número válido${min === 0 ? ' e não negativo' : ` maior ou igual a ${min}`}.`);
    }
    return n;
};
export const cents = (value, label = 'Valor') => {
    const n = numberValue(value, label);
    // Deslocar a casa decimal evita 10.075 * 100 virar 1007.499999….
    const [base, exponent = '0'] = String(n).split('e');
    const result = Math.round(Number(`${base}e${Number(exponent) + 2}`));
    if (!Number.isSafeInteger(result)) throw new Error(`${label} excede o limite suportado.`);
    return result;
};
export const validDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return y >= 1900 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayNumber = value => {
    if (!validDate(value)) throw new Error('Informe uma data válida.');
    const [y, m, d] = value.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
};
export const daysTogether = (start, today = localDate()) => Math.max(0, dayNumber(today) - dayNumber(start));
export const nonEmpty = (value, label = 'Texto') => {
    const text = String(value ?? '').trim();
    if (!text) throw new Error(`${label} é obrigatório.`);
    return text;
};
export const financeShare = finances => {
    if (finances.model !== 'proportional') return 0.5;
    const p1 = numberValue(finances.incomeIS, 'Renda da primeira pessoa', { empty: true });
    const p2 = numberValue(finances.incomeVO, 'Renda da segunda pessoa', { empty: true });
    return p1 + p2 === 0 ? 0.5 : p1 / (p1 + p2);
};
export const financialSummary = (expenses, finances, month) => {
    const categories = { moradia: 0, mercado: 0, lazer: 0, transporte: 0, outros: 0 };
    let pending = 0, total = 0, paidP1 = 0, paidP2 = 0;
    const invalid = [];
    for (const expense of expenses || []) {
        try {
            if (!validDate(expense.date)) throw new Error('Data inválida');
            const amount = cents(expense.amount);
            if (amount <= 0) throw new Error('Valor inválido');
            if (expense.completed && !['IS', 'VO', 'Casal'].includes(expense.owner)) throw new Error('Pagador inválido');
            if (!expense.completed || expense.date.slice(0, 7) === month) {
                total += amount;
                const category = Object.hasOwn(categories, expense.category) ? expense.category : 'outros';
                categories[category] += amount;
                if (!expense.completed) pending += amount;
                else if (expense.owner === 'IS') paidP1 += amount;
                else if (expense.owner === 'VO') paidP2 += amount;
                else {
                    // Conta marcada como Casal: metade para cada pessoa; centavo ímpar para p1.
                    const half = Math.ceil(amount / 2);
                    paidP1 += half; paidP2 += amount - half;
                }
            }
        } catch { invalid.push(expense.id); }
    }
    const share = financeShare(finances);
    const paid = paidP1 + paidP2;
    const targetP1 = Math.round(paid * share);
    return { pending, total, paidP1, paidP2, balance: paidP1 - targetP1, share, categories, invalid };
};
export const goalProgress = goal => {
    const target = numberValue(goal.target, 'Alvo', { min: 0.01 });
    const current = numberValue(goal.current, 'Saldo');
    return { target, current, complete: current >= target, percent: current >= target ? 100 : Math.min(99, Math.floor(current / target * 100)) };
};
export const validateExpense = data => {
    const result = { ...data, title: nonEmpty(data.title, 'Descrição'), amount: cents(data.amount) / 100 };
    if (result.amount <= 0) throw new Error('O valor da conta deve ser maior que zero.');
    if (!validDate(result.date)) throw new Error('Informe um vencimento válido.');
    if (!['IS', 'VO', 'Casal'].includes(result.owner)) throw new Error('Escolha quem pagou ou pagará a conta.');
    return result;
};
export const validateGoal = data => {
    const result = { ...data, title: nonEmpty(data.title, 'Título'), target: numberValue(data.target, 'Alvo', { min: 0.01 }), current: numberValue(data.current, 'Saldo inicial', { empty: true }) };
    if (!['financial', 'habit'].includes(result.type)) throw new Error('Tipo de meta inválido.');
    if (result.type === 'habit' && (!Number.isInteger(result.target) || !Number.isInteger(result.current))) throw new Error('Hábitos precisam de quantidades inteiras.');
    if (result.type === 'financial') {
        result.target = cents(result.target) / 100; result.current = cents(result.current) / 100;
        if (!result.target) throw new Error('O alvo precisa ser de pelo menos R$ 0,01.');
    }
    if (result.deadline && !validDate(result.deadline)) throw new Error('Prazo inválido.');
    return result;
};
export const goalForecast = (goal, today = localDate()) => {
    const { current, target } = goalProgress(goal);
    if (!goal.deadline || current >= target) return null;
    const days = dayNumber(goal.deadline) - dayNumber(today);
    return { days, remaining: (cents(target) - cents(current)) / 100, rate: days > 0 ? (cents(target) - cents(current)) / 100 / days * (days >= 30 ? 30.44 : 7) : null, period: days >= 30 ? 'mês equivalente (30,44 dias)' : 'semana equivalente' };
};