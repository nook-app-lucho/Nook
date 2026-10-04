// js/store.js
const SUPABASE_URL = 'https://ovjuaxcbtjykjlkudtay.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UaYVZI-rhN-Bi2pdwjiqJA_oO2RzbbL';
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export const store = {
    profile: null,
    currentCoupleId: null,
    currentUserEmail: null,
    
    // 1. Sustituye el "theme: 'system'," por esta línea:
    theme: localStorage.getItem('nook_theme') ? JSON.parse(localStorage.getItem('nook_theme')) : 'system',
    
    finances: { model: '50/50', incomeIS: '', incomeVO: '', focus: 'acerto', configured: false },
    expenses: [],
    list: [], 
    lists: [],
    agenda: [],
    goals: [],
    moods: { p1: null, p2: null, date: '' },
    memories: [],
    notes: [],
    _realtimeSubscription: null,

    // 2. Añade la función setTheme justo aquí:
    setTheme(newTheme) {
        this.theme = newTheme;
        localStorage.setItem('nook_theme', JSON.stringify(newTheme));
    },
    
    async init() {
        await this.fetchProfile();
        // Só carrega os dados se o usuário já estiver vinculado a um espaço de casal
        if (this.currentCoupleId) {
            await Promise.all([
                this.fetchFinances(),
                this.fetchExpenses(),
                this.fetchLists(),
                this.fetchAgenda(),
                this.fetchGoals(),
                this.fetchMemories(),
                this.fetchMoods(),
                this.fetchNotes()
            ]);
            this.subscribeRealtime();
        }
    },
    
    async checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            this.currentUserEmail = session.user.email;
        }
        return session;
    },
    
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data && data.user) {
            this.currentUserEmail = data.user.email;
        }
        return data;
    },
    
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data && data.user) {
            this.currentUserEmail = data.user.email;
        }
        return data;
    },

    async logout() {
        await supabase.auth.signOut();
        window.location.reload(); // Continua mantendo reload para limpar todo cash e store seguro
    },

    // --- NOVA LÓGICA DE PERFIL E CONVITES ---
    async fetchProfile() {
        try {
            if (!this.currentUserEmail) return;
            const email = this.currentUserEmail.toLowerCase();
            const { data } = await supabase.from('profiles')
                .select('*')
                .or(`p1_email.eq.${email},p2_email.eq.${email}`)
                .maybeSingle();
                
            if (data) {
                this.currentCoupleId = data.couple_id;
                this.profile = {
                    p1: data.p1_name,
                    p2: data.p2_name,
                    p1Email: data.p1_email,
                    p2Email: data.p2_email,
                    startDate: data.start_date,
                    avatarP1: data.avatar_p1,
                    avatarP2: data.avatar_p2,
                    heroCover: data.hero_cover,
                    inviteCode: data.invite_code,
                    approved: data.approved
                };
            }
        } catch (e) {
            console.warn("Erro ao buscar perfil:", e);
        }
    },

    async createNewNook() {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data, error } = await supabase.from('profiles').insert({
            p1_email: this.currentUserEmail.toLowerCase(),
            invite_code: code,
            approved: false // Permanece bloqueado até você liberar manualmente no Supabase
        }).select().single();
        
        if (error) throw error;
        this.currentCoupleId = data.couple_id;
        await this.fetchProfile();
    },

    async joinNook(code) {
        const { data } = await supabase.from('profiles').select('*').eq('invite_code', code).maybeSingle();
        if (!data) throw new Error("Código não encontrado.");
        if (data.p2_email && data.p2_email !== this.currentUserEmail.toLowerCase()) throw new Error("Espaço lotado.");
        await supabase.from('profiles').update({ p2_email: this.currentUserEmail.toLowerCase() }).eq('couple_id', data.couple_id);
        this.currentCoupleId = data.couple_id;
        await this.fetchProfile();
    },

    async setProfile(data) {
        this.profile = { ...this.profile, ...data };
        if (!this.currentCoupleId) return;
        await supabase.from('profiles').update({
            p1_name: data.p1,
            p2_name: data.p2,
            start_date: data.startDate,
            avatar_p1: data.avatarP1,
            avatar_p2: data.avatarP2,
            hero_cover: data.heroCover
        }).eq('couple_id', this.currentCoupleId);
    },

    getLoggedUser() {
        if (!this.profile || !this.currentUserEmail) return 'p1';
        const email = this.currentUserEmail.toLowerCase();
        if (this.profile.p2Email && email === this.profile.p2Email.toLowerCase()) {
            return 'p2';
        }
        return 'p1';
    },

    async clearProfile() {
        this.profile = null;
        if (!this.currentCoupleId) return;
        try {
            await supabase.from('profiles').delete().eq('couple_id', this.currentCoupleId);
            this.currentCoupleId = null;
        } catch(e) {
            console.warn("Erro ao limpar perfil:", e);
        }
    },

    // --- MÉTODOS DOS DADOS DO CASAL (Filtrando por couple_id) ---
    async fetchMoods() {
        try {
            const { data } = await supabase.from('moods').select('*').eq('couple_id', this.currentCoupleId).maybeSingle();
            if (data && data.date) {
                this.moods = { p1: data.p1, p2: data.p2, date: data.date };
                localStorage.setItem('nook_moods', JSON.stringify(this.moods));
            } else {
                const local = localStorage.getItem('nook_moods');
                if (local) this.moods = JSON.parse(local);
            }
        } catch (e) {
            console.warn("Erro ao buscar humor:", e);
            const local = localStorage.getItem('nook_moods');
            if (local) this.moods = JSON.parse(local);
        }
    },
    
    async setMoods(data) {
        this.moods = data;
        localStorage.setItem('nook_moods', JSON.stringify(data));
        if (!this.currentCoupleId) return;
        
        try {
            const { data: exist } = await supabase.from('moods').select('id').eq('couple_id', this.currentCoupleId).maybeSingle();
            if (exist) {
                await supabase.from('moods').update({ p1: data.p1, p2: data.p2, date: data.date }).eq('couple_id', this.currentCoupleId);
            } else {
                await supabase.from('moods').insert({ couple_id: this.currentCoupleId, p1: data.p1, p2: data.p2, date: data.date });
            }
        } catch (e) {
            console.warn("Erro ao salvar humor:", e);
        }
    },

    async fetchExpenses() {
        const { data } = await supabase.from('expenses').select('*').eq('couple_id', this.currentCoupleId);
        if (data) this.expenses = data;
    },
    
    async setExpenses(data) {
        this.expenses = data;
        if (!this.currentCoupleId) return;
        await supabase.from('expenses').upsert(data.map(e => ({
            id: typeof e.id === 'number' ? undefined : e.id,
            couple_id: this.currentCoupleId,
            title: e.title,
            amount: e.amount,
            category: e.category,
            date: e.date,
            owner: e.owner,
            completed: e.completed
        })));
    },

    async fetchLists() {
        const { data } = await supabase.from('lists').select('*').eq('couple_id', this.currentCoupleId);
        if (data && data.length > 0) this.lists = data;
    },
    
    async setLists(data) {
        this.lists = data;
        if (!this.currentCoupleId) return;
        await supabase.from('lists').upsert(data.map(l => ({ ...l, couple_id: this.currentCoupleId })));
    },

    async fetchAgenda() {
        const { data } = await supabase.from('agenda').select('*').eq('couple_id', this.currentCoupleId);
        if (data) {
            // Mapeia do formato do banco (created_by) para o do frontend (createdBy)
            this.agenda = data.map(a => {
                const item = { ...a, createdBy: a.created_by };
                delete item.created_by; 
                return item;
            });
        }
    },
    
    async setAgenda(data) {
        this.agenda = data;
        if (!this.currentCoupleId) return;
        
        await supabase.from('agenda').upsert(data.map(a => {
            // Traduz a propriedade do frontend de volta para o padrão da coluna do banco
            const row = { ...a, couple_id: this.currentCoupleId, created_by: a.createdBy };
            delete row.createdBy; // Remove a chave do JS para não causar erro no Postgres
            return row;
        }));
    },

    async fetchGoals() {
        const { data } = await supabase.from('goals').select('*').eq('couple_id', this.currentCoupleId);
        if (data) this.goals = data;
    },
    
    async setGoals(data) {
        this.goals = data;
        if (!this.currentCoupleId) return;
        await supabase.from('goals').upsert(data.map(g => ({ ...g, couple_id: this.currentCoupleId })));
    },

    async fetchMemories() {
        const { data } = await supabase.from('memories').select('*').eq('couple_id', this.currentCoupleId);
        if (data) this.memories = data;
    },
    
    async setMemories(data) {
        this.memories = data;
        if (!this.currentCoupleId) return;
        await supabase.from('memories').upsert(data.map(m => ({ ...m, couple_id: this.currentCoupleId })));
    },

    async fetchNotes() {
        const { data } = await supabase.from('notes').select('*').eq('couple_id', this.currentCoupleId);
        if (data) {
            const now = new Date();
            // Filtra e ignora recados que já passaram da data de expiração
            this.notes = data
                .filter(n => !n.expires_at || new Date(n.expires_at) > now)
                .map(n => ({
                    id: n.id,
                    text: n.text,
                    color: n.color,
                    owner: n.owner,
                    date: n.date,
                    expiresAt: n.expires_at
                }));
        }
    },
    
    async setNotes(data) {
        this.notes = data;
        if (!this.currentCoupleId) return;
        await supabase.from('notes').upsert(data.map(n => ({
            id: typeof n.id === 'number' ? undefined : n.id,
            couple_id: this.currentCoupleId,
            text: n.text,
            color: n.color,
            owner: n.owner,
            date: n.date,
            expires_at: n.expiresAt
        })));
    },

    async fetchFinances() {
        try {
            const { data } = await supabase.from('finances').select('*').eq('couple_id', this.currentCoupleId).maybeSingle();
            if (data) {
                this.finances = {
                    model: data.model,
                    incomeIS: data.income_is,
                    incomeVO: data.income_vo,
                    settleMode: data.settle_mode,
                    configured: data.configured
                };
            }
        } catch (e) {
            console.warn("Erro ao buscar financas:", e);
        }
    },
    
    async setFinances(data) {
        this.finances = data;
        if (!this.currentCoupleId) return;
        
        const { data: exist } = await supabase.from('finances').select('id').eq('couple_id', this.currentCoupleId).maybeSingle();
        if (exist) {
            await supabase.from('finances').update({
                model: data.model,
                income_is: data.incomeIS,
                income_vo: data.incomeVO,
                settle_mode: data.settleMode,
                configured: data.configured
            }).eq('couple_id', this.currentCoupleId);
        } else {
            await supabase.from('finances').insert({
                couple_id: this.currentCoupleId,
                model: data.model,
                income_is: data.incomeIS,
                income_vo: data.incomeVO,
                settle_mode: data.settleMode,
                configured: data.configured
            });
        }
    },

    subscribeRealtime() {
        if (this._realtimeSubscription) {
            supabase.removeChannel(this._realtimeSubscription);
        }
        
        let debounceTimer = null;

        this._realtimeSubscription = supabase.channel('public-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(async () => {
                    // Atualiza apenas os dados impactados baseando-se na tabela do payload
                    switch (payload.table) {
                        case 'lists': await this.fetchLists(); break;
                        case 'expenses': await this.fetchExpenses(); break;
                        case 'agenda': await this.fetchAgenda(); break;
                        case 'goals': await this.fetchGoals(); break;
                        case 'finances': await this.fetchFinances(); break;
                        case 'memories': await this.fetchMemories(); break;
                        case 'moods': await this.fetchMoods(); break;
                        case 'notes': await this.fetchNotes(); break;
                        default: await this.init(); // Fallback para outras mudanças
                    }
                    window.dispatchEvent(new CustomEvent('nook:data-updated'));
                }, 300);
            })
            .subscribe();
    }
};