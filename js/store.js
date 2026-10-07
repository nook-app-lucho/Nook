const SUPABASE_URL = 'https://ovjuaxcbtjykjlkudtay.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UaYVZI-rhN-Bi2pdwjiqJA_oO2RzbbL';
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
import { localDate, sameId, nonEmpty, numberValue, validDate, validateExpense, validateGoal, normalizeListItems, normalizeGoalHistory } from './rules.js';

const copy = value => JSON.parse(JSON.stringify(value));
const tableKeys = ['expenses', 'lists', 'agenda', 'goals', 'memories', 'notes'];
const emptyFinances = () => ({ model: '50/50', incomeIS: 0, incomeVO: 0, settleMode: 'transfer', configured: false });
const readTheme = () => {
    try { const value = JSON.parse(localStorage.getItem('nook_theme') || '"system"'); return ['system', 'light', 'dark'].includes(value) ? value : 'system'; }
    catch { return 'system'; }
};
export const unwrap = result => {
    if (result.error) throw new Error(result.error.message || 'O banco recusou a operação.');
    return result.data;
};
const fields = {
    expenses: ['title', 'amount', 'category', 'date', 'owner', 'completed'],
    lists: ['name', 'type', 'items'],
    agenda: ['title', 'date', 'time', 'owner', 'subtitle', 'confirmed'],
    goals: ['type', 'title', 'icon', 'owner', 'target', 'current', 'unit', 'deadline', 'history'],
    memories: ['title', 'date', 'note', 'photo'],
    notes: ['text', 'color', 'owner', 'date', 'reactions']
};
const toRow = (table, item) => {
    const row = {};
    for (const key of fields[table]) if (item[key] !== undefined) row[key] = item[key];
    if (table === 'agenda' && item.createdBy !== undefined) row.created_by = item.createdBy;
    if (table === 'notes' && item.expiresAt !== undefined) row.expires_at = item.expiresAt;
    return row;
};
const fromRow = (table, row) => {
    const item = { ...row };
    if (table === 'agenda') { item.createdBy = row.created_by; delete item.created_by; }
    if (table === 'notes') { item.expiresAt = row.expires_at; item.reactions = Array.isArray(row.reactions) ? row.reactions : []; delete item.expires_at; }
    if (table === 'lists') {
        const normalized = normalizeListItems(row.items);
        item.items = normalized.items;
        if (normalized.invalid.length) { item._invalidItems = normalized.invalid; item._rawItems = copy(row.items ?? null); }
    }
    if (table === 'goals') {
        item.target = Number(row.target); item.current = Number(row.current);
        const normalized = normalizeGoalHistory(row.history);
        item.history = normalized.history;
        if (normalized.invalid.length) { item._invalidHistory = normalized.invalid; item._rawHistory = copy(row.history ?? null); }
    }
    if (table === 'expenses') item.amount = Number(row.amount);
    return item;
};
const validate = (table, input) => {
    if (table === 'expenses') return validateExpense(input);
    if (table === 'goals') {
        if (input._invalidHistory?.length || normalizeGoalHistory(input.history).invalid.length) throw new Error('Esta meta tem histórico inválido. Os dados originais estão preservados; revise o histórico antes de registrar novos valores.');
        return validateGoal(input);
    }
    const item = { ...input };
    if (table === 'lists') { item.name = nonEmpty(item.name, 'Nome da lista'); if (item._invalidItems?.length || normalizeListItems(item.items).invalid.length) throw new Error('Esta lista tem itens inválidos. Os dados originais estão preservados; revise a lista antes de alterá-la.'); }
    if (table === 'agenda') {
        item.title = nonEmpty(item.title, 'Título');
        if (!validDate(item.date) || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(item.time || '')) throw new Error('Informe data e horário válidos.');
    }
    if (table === 'memories') { item.title = nonEmpty(item.title, 'Título'); if (!validDate(item.date)) throw new Error('Data da memória inválida.'); }
    if (table === 'notes') {
        item.text = nonEmpty(item.text, 'Recado'); if (!Array.isArray(item.reactions)) item.reactions = [];
        if (!item.reactions.every(emoji => ['❤️', '😘', '☕'].includes(emoji))) throw new Error('Reação inválida.');
        if (!Number.isFinite(Date.parse(item.date)) || (item.expiresAt && !Number.isFinite(Date.parse(item.expiresAt)))) throw new Error('Data do recado inválida.');
    }
    return item;
};

export const store = {
    profile: null, currentCoupleId: null, currentUserEmail: null,
    theme: readTheme(), finances: emptyFinances(), expenses: [], lists: [], agenda: [], goals: [], memories: [], notes: [],
    moods: { p1: null, p2: null, date: '' }, _realtimeSubscription: null, _queues: new Map(), _generation: 0, _revisions: {},
    resetData() {
        for (const key of tableKeys) this[key] = [];
        this._revisions = {}; this.finances = emptyFinances(); this.moods = { p1: null, p2: null, date: '' }; this._generation++;
    },
    setTheme(value) {
        this.theme = ['system', 'light', 'dark'].includes(value) ? value : 'system';
        try { localStorage.setItem('nook_theme', JSON.stringify(this.theme)); } catch { /* Tema ainda vale nesta sessão. */ }
    },
    requireCouple() {
        if (!this.currentCoupleId || !this.profile || this.profile.approved !== true || !this.getLoggedUser()) throw new Error('O espaço ainda não está liberado. Entre novamente ou aguarde a aprovação.');
        return this.currentCoupleId;
    },
    notify() { window.dispatchEvent(new CustomEvent('nook:data-updated')); },
    async init() {
        await this.fetchProfile();
        if (!this.currentCoupleId || this.profile?.approved !== true) return;
        await Promise.all([this.fetchFinances(), ...tableKeys.map(key => this.fetchRecords(key)), this.fetchMoods()]);
        this.subscribeRealtime();
    },
    async checkSession() {
        const data = unwrap(await supabase.auth.getSession());
        this.currentUserEmail = data.session?.user?.email?.toLowerCase() || null;
        if (!data.session) { this.profile = null; this.currentCoupleId = null; this.resetData(); }
        return data.session;
    },
    async login(email, password) {
        const data = unwrap(await supabase.auth.signInWithPassword({ email, password }));
        this.currentUserEmail = data.user?.email?.toLowerCase() || null; return data;
    },
    async signUp(email, password) { return unwrap(await supabase.auth.signUp({ email, password })); },
    async logout() {
        unwrap(await supabase.auth.signOut());
        if (this._realtimeSubscription) supabase.removeChannel(this._realtimeSubscription);
        try { localStorage.removeItem('nook_moods'); } catch { /* Não usado como fallback. */ }
        this.profile = null; this.currentCoupleId = null; this.currentUserEmail = null; this.resetData(); window.location.reload();
    },
    async fetchProfile() {
        if (!this.currentUserEmail) return;
        // Duas consultas de igualdade evitam interpolar email em expressão .or().
        const p1 = unwrap(await supabase.from('profiles').select('*').eq('p1_email', this.currentUserEmail).maybeSingle());
        const data = p1 || unwrap(await supabase.from('profiles').select('*').eq('p2_email', this.currentUserEmail).maybeSingle());
        if (!sameId(data?.couple_id, this.currentCoupleId)) this.resetData();
        this.currentCoupleId = data?.couple_id ?? null;
        this.profile = data ? { p1: data.p1_name, p2: data.p2_name, p1Email: data.p1_email, p2Email: data.p2_email, startDate: data.start_date, avatarP1: data.avatar_p1, avatarP2: data.avatar_p2, heroCover: data.hero_cover, inviteCode: data.invite_code, approved: data.approved } : null;
    },
    async createNewNook() {
        if (!this.currentUserEmail) throw new Error('Entre na sua conta.');
        await this.fetchProfile();
        if (this.currentCoupleId) throw new Error('Você já participa de um espaço.');
        const code = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
        unwrap(await supabase.from('profiles').insert({ p1_email: this.currentUserEmail, invite_code: code, approved: false }).select().single());
        await this.fetchProfile();
    },
    async joinNook(code) {
        if (!this.currentUserEmail) throw new Error('Entre na sua conta.');
        const normalized = String(code || '').trim().toUpperCase();
        if (!/^[A-Z0-9]{6,12}$/.test(normalized)) throw new Error('Informe o código de convite completo.');
        if (this.profile?.p1Email?.toLowerCase() === this.currentUserEmail && this.profile.inviteCode === normalized) throw new Error('Você já é o criador deste espaço. Compartilhe o código com seu parceiro.');
        const result = await supabase.rpc('nook_join', { p_code: normalized });
        if (result.error) {
            if (result.error.code === 'PGRST202' || result.error.code === '42883') throw new Error('A entrada por convite precisa ser configurada no Supabase. Consulte INSTRUCOES.md, etapa 2.');
            unwrap(result);
        }
        await this.fetchProfile();
        if (!this.currentCoupleId) throw new Error('O convite foi processado, mas o perfil não pôde ser lido. Verifique as políticas do Supabase.');
    },
    getLoggedUser() {
        const email = this.currentUserEmail?.toLowerCase();
        if (!email || !this.profile) return null;
        if (this.profile.p1Email?.toLowerCase() === email) return 'p1';
        if (this.profile.p2Email?.toLowerCase() === email) return 'p2';
        return null;
    },
    getAuthorName() { const user = this.getLoggedUser(); if (!user) throw new Error('Usuário não vinculado ao espaço.'); return this.profile[user] || user.toUpperCase(); },
    async setProfile(patch) {
        this.requireCouple();
        const merged = { ...this.profile, ...patch };
        merged.p1 = nonEmpty(merged.p1, 'Nome da primeira pessoa'); merged.p2 = nonEmpty(merged.p2, 'Nome da segunda pessoa');
        if (!validDate(merged.startDate) || merged.startDate > localDate()) throw new Error('A data inicial deve ser válida e não pode estar no futuro.');
        const row = {};
        const mapping = { p1: 'p1_name', p2: 'p2_name', startDate: 'start_date', avatarP1: 'avatar_p1', avatarP2: 'avatar_p2', heroCover: 'hero_cover' };
        for (const key of Object.keys(patch)) if (mapping[key]) row[mapping[key]] = merged[key];
        unwrap(await supabase.from('profiles').update(row).eq('couple_id', this.currentCoupleId).select('couple_id').single());
        this.profile = merged; this.notify();
    },
    async fetchRecords(table) {
        if (!tableKeys.includes(table)) throw new Error('Tabela inválida.');
        const couple = this.requireCouple(), generation = this._generation, revision = this._revisions[table] || 0;
        const data = unwrap(await supabase.from(table).select('*').eq('couple_id', couple));
        if (generation === this._generation && revision === (this._revisions[table] || 0) && sameId(couple, this.currentCoupleId)) this[table] = (data || []).map(row => fromRow(table, row));
        return this[table];
    },
    async _serialized(key, work) {
        const previous = this._queues.get(key) || Promise.resolve();
        const next = previous.catch(() => {}).then(work); this._queues.set(key, next);
        try { return await next; } finally { if (this._queues.get(key) === next) this._queues.delete(key); }
    },
    captureEdit(table, id) {
        const couple = this.requireCouple();
        const record = this[table]?.find(item => sameId(item.id, id));
        if (!record) throw new Error('Este registro não está disponível. Reabra a edição.');
        return { table, id: record.id, couple, record: copy(record), fingerprint: JSON.stringify(record) };
    },
    async saveEdit(context, patch) {
        const conflict = () => {
            const error = new Error('Este registro mudou desde que você abriu a edição. Seus dados digitados foram mantidos. Feche e reabra a edição para conferir a versão atual antes de salvar.');
            error.code = 'EDIT_CONFLICT'; return error;
        };
        if (!context || !sameId(context.couple, this.requireCouple())) throw conflict();
        const latest = this[context.table]?.find(item => sameId(item.id, context.id));
        if (!latest || JSON.stringify(latest) !== context.fingerprint) throw conflict();
        if ((!Number.isSafeInteger(context.record.nook_version) || context.record.nook_version < 0)) throw new Error('O controle de versões desta tabela não foi encontrado. Confira nook_version e o trigger do SQL já aplicado antes de editar.');
        try { return await this.saveRecord(context.table, { ...context.record, ...patch, id: context.id, nook_version: context.record.nook_version }); }
        catch (error) {
            if (error.code === 'EDIT_CONFLICT') throw conflict();
            throw error;
        }
    },
    async saveRecord(table, input, { create = false } = {}) {
        if (!tableKeys.includes(table)) throw new Error('Tabela inválida.');
        const couple = this.requireCouple(), generation = this._generation;
        const current = create ? null : this[table].find(record => sameId(record.id, input.id));
        if (current?._invalidItems?.length || current?._invalidHistory?.length) throw new Error('Este registro tem itens ou histórico inválidos. O conteúdo original está preservado; revise-o antes de alterar o registro.');
        const item = validate(table, copy(input)), row = { ...toRow(table, item), couple_id: couple };
        return this._serialized(`${table}:${create ? 'new' : item.id}`, async () => {
            let query;
            if (create) {
                // O banco gera os IDs conforme o tipo/default real; listas usam ID textual próprio.
                if (table === 'lists') row.id = item.id || `list_${crypto.randomUUID()}`;
                query = supabase.from(table).insert(row);
            } else {
                if (item.id == null) throw new Error('O registro não tem identificação. Recarregue o app.');
                query = supabase.from(table).update(row).eq('id', item.id).eq('couple_id', couple);
                if (item.nook_version != null) query = query.eq('nook_version', item.nook_version);
            }
            const response = await query.select().single();
            if (!create && response.error?.code === 'PGRST116') {
                const error = new Error('Este registro mudou ou sua conta não pode alterá-lo. Recarregue para conferir antes de tentar novamente.'); error.code = 'EDIT_CONFLICT'; throw error;
            }
            const saved = unwrap(response);
            if (saved?.id == null) throw new Error('O banco não retornou o registro salvo. Verifique permissões e geração de ID.');
            const record = fromRow(table, saved);
            if (generation === this._generation && sameId(couple, this.currentCoupleId)) {
                this._revisions[table] = (this._revisions[table] || 0) + 1;
                const index = this[table].findIndex(entry => sameId(entry.id, record.id));
                if (index < 0) this[table].push(record); else this[table][index] = record;
                this.notify();
            }
            return record;
        });
    },
    async deleteRecord(table, id) {
        if (!tableKeys.includes(table) || id == null) throw new Error('Registro inválido.');
        const couple = this.requireCouple(), generation = this._generation;
        return this._serialized(`${table}:${id}`, async () => {
            let query = supabase.from(table).delete().eq('id', id).eq('couple_id', couple);
            const existing = this[table].find(item => sameId(item.id, id));
            if (existing?.nook_version != null) query = query.eq('nook_version', existing.nook_version);
            const deleted = unwrap(await query.select('id'));
            if (!deleted?.some(row => sameId(row.id, id))) throw new Error('O registro não foi excluído. Ele pode ter mudado ou a política do banco não permite excluir. Recarregue para conferir.');
            if (generation === this._generation && sameId(couple, this.currentCoupleId)) { this._revisions[table] = (this._revisions[table] || 0) + 1; this[table] = this[table].filter(item => !sameId(item.id, id)); this.notify(); }
        });
    },
    async fetchFinances() {
        const data = unwrap(await supabase.from('finances').select('*').eq('couple_id', this.requireCouple()).maybeSingle());
        this.finances = data ? { model: data.model, incomeIS: data.income_is, incomeVO: data.income_vo, settleMode: data.settle_mode, configured: data.configured } : emptyFinances();
    },
    async setFinances(data) {
        const couple = this.requireCouple();
        const validated = { ...data, incomeIS: numberValue(data.incomeIS, 'Renda da primeira pessoa', { empty: true }), incomeVO: numberValue(data.incomeVO, 'Renda da segunda pessoa', { empty: true }) };
        if (!['50/50', 'proportional', '100-p1', '100-p2', 'single', 'custom'].includes(data.model)) throw new Error('Modelo de divisão inválido.');
        const row = { model: validated.model, income_is: validated.incomeIS, income_vo: validated.incomeVO, settle_mode: validated.settleMode, configured: true };
        await this._serialized('finances', async () => {
            const existing = unwrap(await supabase.from('finances').select('id').eq('couple_id', couple).maybeSingle());
            const query = existing ? supabase.from('finances').update(row).eq('id', existing.id).eq('couple_id', couple) : supabase.from('finances').insert({ ...row, couple_id: couple });
            unwrap(await query.select().single()); this.finances = validated; this.notify();
        });
    },
    async fetchMoods() {
        // Sem fallback genérico no navegador: não mistura contas ou casais.
        const data = unwrap(await supabase.from('moods').select('*').eq('couple_id', this.requireCouple()).maybeSingle());
        this.moods = data ? { p1: data.p1, p2: data.p2, date: data.date } : { p1: null, p2: null, date: '' };
    },
    async setMood(mood) {
        const user = this.getLoggedUser(), couple = this.requireCouple();
        if (!['energia', 'cansado', 'lanche', 'apaixonado', 'estresse', 'feliz'].includes(mood)) throw new Error('Humor inválido.');
        await this._serialized('moods', async () => {
            // A função no banco preserva o humor do parceiro inclusive na virada do dia.
            const result = await supabase.rpc('nook_set_mood', { p_mood: mood, p_date: localDate() });
            if (result.error?.code === 'PGRST202') throw new Error('Configure o humor no Supabase conforme INSTRUCOES.md, etapa 2.');
            unwrap(result); await this.fetchMoods(); this.notify();
        });
        return { user, couple };
    },
    subscribeRealtime() {
        if (this._realtimeSubscription) supabase.removeChannel(this._realtimeSubscription);
        const dirty = new Set(); let timer;
        const readers = { expenses: () => this.fetchExpenses(), lists: () => this.fetchLists(), agenda: () => this.fetchAgenda(), goals: () => this.fetchGoals(), memories: () => this.fetchMemories(), notes: () => this.fetchNotes(), finances: () => this.fetchFinances(), moods: () => this.fetchMoods(), profiles: () => this.fetchProfile() };
        this._realtimeSubscription = supabase.channel(`nook-${this.currentCoupleId}`)
            .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
                const id = payload.new?.couple_id ?? payload.old?.couple_id;
                if (id != null && !sameId(id, this.currentCoupleId)) return;
                if (readers[payload.table]) dirty.add(payload.table);
                clearTimeout(timer);
                timer = setTimeout(async () => {
                    const tables = [...dirty]; dirty.clear();
                    const results = await Promise.allSettled(tables.map(table => readers[table]()));
                    if (results.some(result => result.status === 'rejected')) window.dispatchEvent(new CustomEvent('nook:sync-error'));
                    this.notify();
                }, 300);
            }).subscribe();
    },
    async fetchExpenses() { return this.fetchRecords('expenses'); },
    async fetchLists() { return this.fetchRecords('lists'); },
    async fetchAgenda() { return this.fetchRecords('agenda'); },
    async fetchGoals() { return this.fetchRecords('goals'); },
    async fetchMemories() { return this.fetchRecords('memories'); },
    async fetchNotes() { return this.fetchRecords('notes'); }
};