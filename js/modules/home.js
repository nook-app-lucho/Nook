import { store } from '../store.js';
import { getLocalDateString, escapeHTML, triggerHaptic, getAvatarHtml, openModal, closeAllModals, formatCurrency } from '../utils.js';

const MOODS = [
    { id: 'energia', icon: '🔋', label: 'Cheio(a) de energia' },
    { id: 'cansado', icon: '🥱', label: 'Cansado(a)' },
    { id: 'lanche', icon: '🍟', label: 'Querendo lanche' },
    { id: 'apaixonado', icon: '🥰', label: 'Apaixonado(a)' },
    { id: 'estresse', icon: '🤯', label: 'Estressado(a)' },
    { id: 'feliz', icon: '😁', label: 'Feliz da vida' }
];

const PRESET_COVERS = [
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop'
];

let targetPerson = 'p1';

const getFirstName = (fullName, fallback = '') => {
    if (!fullName) return fallback;
    const first = fullName.trim().split(/\s+/)[0];
    return first || fallback;
};

export const renderHome = () => {
    const heroEl = document.getElementById('main-hero');
    if (heroEl && store.profile) {
        const cover = store.profile.heroCover || PRESET_COVERS[0];
        heroEl.style.backgroundImage = `url(${cover})`;
    }
    
    const greetingElement = document.getElementById('dynamic-greeting');
    if (greetingElement) {
        const hour = new Date().getHours();
        const day = new Date().getDay();
        let text = "Boa noite! Descansem ✨";
        if (day === 5 && hour > 17) text = "Sextou, casal! 🍻";
        else if (day === 0 && hour < 12) text = "Domingo de preguiça 😴";
        else if (hour >= 5 && hour < 12) text = "Bom dia, amores! ☕";
        else if (hour >= 12 && hour < 18) text = "Boa tarde! ☀️";
        greetingElement.textContent = text;
    }
    
    const daysElement = document.getElementById('days-together');
    if (daysElement) {
        if (store.profile && store.profile.startDate) {
            const [year, month, day] = store.profile.startDate.split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            const diffDays = Math.max(0, Math.ceil(Math.abs(new Date() - startDate) / (1000 * 60 * 60 * 24)));
            daysElement.textContent = diffDays;
        } else {
            daysElement.textContent = '--';
        }
    }
    
    const todayStr = getLocalDateString(new Date());
    if (!store.moods) { store.moods = { p1: null, p2: null, date: todayStr }; }
    else if (store.moods.date && store.moods.date !== todayStr) {
        if (typeof store.setMoods === 'function') store.setMoods({ p1: null, p2: null, date: todayStr });
        else store.moods = { p1: null, p2: null, date: todayStr };
    } else { store.moods.date = todayStr; }
    
    const myPersonId = typeof store.getLoggedUser === 'function' ? store.getLoggedUser() : 'p1';
    const partnerPersonId = myPersonId === 'p1' ? 'p2' : 'p1';

    const renderMoodCard = (slot, personId) => {
        const rawName = personId === 'p1' ? store.profile?.p1 : store.profile?.p2;
        const fallbackDefault = personId === 'p1' ? 'Você' : 'Parceiro(a)';
        const firstName = getFirstName(rawName, fallbackDefault);

        const nameEl = document.getElementById(`mood-name-${slot}`);
        if (nameEl) nameEl.textContent = firstName;

        const avatarEl = document.getElementById(`mood-avatar-${slot}`);
        if (avatarEl) avatarEl.innerHTML = getAvatarHtml(personId, '24px');

        const moodData = (store.moods && store.moods[personId]) ? MOODS.find(m => m.id === store.moods[personId]) : null;
        const iconEl = document.getElementById(`mood-icon-${slot}`);
        const textEl = document.getElementById(`mood-text-${slot}`);

        if (moodData) {
            if (iconEl) iconEl.textContent = moodData.icon;
            if (textEl) { 
                textEl.textContent = moodData.label; 
                textEl.className = 'mood-text active'; 
            }
        } else {
            if (iconEl) iconEl.textContent = '💭';
            if (textEl) {
                textEl.textContent = 'Como está?';
                textEl.className = 'mood-text';
            }
        }
    };

    renderMoodCard('p1', myPersonId); 
    renderMoodCard('p2', partnerPersonId);
    
    const cardP2 = document.getElementById('btn-mood-p2');
    if (cardP2) cardP2.classList.add('cursor-default');
    
    const tasksDescEl = document.getElementById('home-tasks-desc');
    if (tasksDescEl) {
        const pendingCount = (store.lists || []).reduce((acc, list) => acc + (list.items || []).filter(i => !i.completed).length, 0);
        tasksDescEl.textContent = pendingCount === 0 ? "Tudo em dia!" : `${pendingCount} item(s) pendente(s)`;
    }
    
    const finDescEl = document.getElementById('home-fin-desc');
    if (finDescEl) {
        const pendingExpenses = (store.expenses || []).filter(e => !e.completed);
        const totalPendingAmount = pendingExpenses.reduce((acc, exp) => acc + (parseFloat(exp.amount) || 0), 0);
        finDescEl.textContent = pendingExpenses.length === 0 ? "Tudo pago!" : `${formatCurrency(totalPendingAmount)} (${pendingExpenses.length} pendente${pendingExpenses.length > 1 ? 's' : ''})`;
    }
    
    const agendaList = document.getElementById('home-agenda-list');
    if (agendaList) {
        agendaList.innerHTML = '';
        const todayEvents = (store.agenda || []).filter(ev => ev.date === todayStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        if (todayEvents.length === 0) {
            agendaList.innerHTML = `<li class="empty-state empty-state-no-border"><i class="ph ph-coffee empty-icon"></i>Dia livre para vocês curtirem!</li>`;
        } else {
            todayEvents.forEach(ev => {
                const li = document.createElement('li');
                li.className = 'task-item';
                li.innerHTML = `
                    <div class="task-text">
                        <strong class="task-item-title">${escapeHTML(ev.title)}</strong>
                        <div class="task-item-subtitle">${ev.time || ''}</div>
                    </div>
                    ${getAvatarHtml(ev.owner)}
                `;
                agendaList.appendChild(li);
            });
        }
    }
    
    renderMemoriesSection();
    renderNotesSection();
};

const renderMemoriesSection = () => {
    const capsuleContainer = document.getElementById('home-capsule-card');
    const memoriesGrid = document.getElementById('home-memories-grid');
    if (!memoriesGrid) return;
    
    memoriesGrid.innerHTML = '';
    const memories = store.memories || [];
    const today = new Date();
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const capsuleMemory = memories.find(m => {
        if (!m.date) return false;
        const [y, mm, dd] = m.date.split('-');
        return `${mm}-${dd}` === todayMonthDay && Number(y) < today.getFullYear();
    });
    
    if (capsuleContainer) {
        if (capsuleMemory) {
            capsuleContainer.classList.remove('d-none');
            const [y] = capsuleMemory.date.split('-');
            const diffAnos = today.getFullYear() - Number(y);
            document.getElementById('capsule-title').textContent = `Há ${diffAnos} ano${diffAnos > 1 ? 's' : ''} atrás...`;
            document.getElementById('capsule-text').textContent = capsuleMemory.title;
            if (capsuleMemory.photo) document.getElementById('capsule-bg').style.backgroundImage = `url('${capsuleMemory.photo}')`;
        } else {
            capsuleContainer.classList.add('d-none');
        }
    }
    
    if (memories.length === 0) {
        memoriesGrid.innerHTML = `
            <div class="empty-state-card">
                <i class="ph ph-heart-break text-primary empty-icon"></i>
                Nenhuma memória registada ainda.<br>Clique em "+ Nova Memória" para guardar um momento!
            </div>
        `;
    } else {
        const sortedMemories = [...memories].sort((a, b) => b.date.localeCompare(a.date));
        sortedMemories.forEach(mem => {
            const [y, m, d] = mem.date.split('-');
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.innerHTML = `
                <div class="memory-photo" style="background-image: url('${mem.photo || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=400'}')">
                    <span class="memory-date-badge">${d}/${m}/${y}</span>
                    <button class="btn-delete-memory" title="Apagar memória"><i class="ph ph-trash"></i></button>
                </div>
                <div class="memory-info">
                    <strong>${escapeHTML(mem.title)}</strong>
                    ${mem.note ? `<p>${escapeHTML(mem.note)}</p>` : ''}
                </div>
            `;
            
            // MANIPULAÇÃO DIRETA: Eliminar Memória
            card.querySelector('.btn-delete-memory').addEventListener('click', (e) => {
                e.stopPropagation(); triggerHaptic(20);
                if (confirm('Deseja realmente apagar esta memória?')) {
                    store.setMemories(store.memories.filter(m => m.id !== mem.id));
                    card.remove(); // Remove o card do DOM sem reconstruir a lista
                    if (store.memories.length === 0) renderMemoriesSection();
                }
            });
            memoriesGrid.appendChild(card);
        });
    }
};

const renderNotesSection = () => {
    const grid = document.getElementById('home-notes-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const now = new Date();
    const validNotes = (store.notes || []).filter(n => !n.expiresAt || new Date(n.expiresAt) > now);
    
    if (validNotes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-card">
                <i class="ph ph-note-blank text-muted empty-icon"></i>
                Nenhum recadinho hoje.<br>Seja o primeiro a deixar uma mensagem!
            </div>
        `;
        return;
    }
    
    const sortedNotes = [...validNotes].sort((a, b) => b.id - a.id);
    sortedNotes.forEach((note, index) => {
        const card = document.createElement('div');
        const rotation = index % 2 === 0 ? 'rotate(2deg)' : 'rotate(-2deg)';
        card.className = `note-card ${note.color || 'yellow'}`;
        card.style.transform = rotation;
        card.innerHTML = `
            <i class="ph-fill ph-push-pin note-pin"></i>
            <p class="note-text-content">${escapeHTML(note.text)}</p>
            <span class="note-author">- ${escapeHTML(note.owner)}</span>
            <button class="btn-delete-note" title="Apagar recado"><i class="ph ph-trash"></i></button>
        `;
        
        // MANIPULAÇÃO DIRETA: Eliminar Recado (Post-it)
        card.querySelector('.btn-delete-note').addEventListener('click', () => {
            triggerHaptic(20);
            if(confirm('Apagar este recadinho?')) {
                store.setNotes(store.notes.filter(n => n.id !== note.id));
                card.remove(); // Remove apenas o post-it da interface
                if (store.notes.length === 0) renderNotesSection();
            }
        });
        grid.appendChild(card);
    });
};

export const initHome = () => {
    document.getElementById('home-tasks-card')?.addEventListener('click', () => { triggerHaptic(10); document.querySelector('.nav-item[data-target="view-lists"]')?.click(); });
    document.getElementById('home-fin-card')?.addEventListener('click', () => { triggerHaptic(10); document.querySelector('.nav-item[data-target="view-finances"]')?.click(); });
    document.getElementById('general-overlay')?.addEventListener('click', () => closeAllModals(false));
    document.querySelectorAll('.btn-close-modal').forEach(btn => btn.addEventListener('click', () => closeAllModals(false)));
    
    document.getElementById('btn-edit-hero')?.addEventListener('click', () => {
        const grid = document.getElementById('hero-gallery-grid');
        if (grid) {
            grid.innerHTML = '';
            PRESET_COVERS.forEach(url => {
                const btn = document.createElement('div');
                btn.className = 'hero-preset';
                btn.style.backgroundImage = `url(${url})`;
                btn.addEventListener('click', () => {
                    store.setProfile({ ...store.profile, heroCover: url });
                    triggerHaptic(20); renderHome(); closeAllModals(true);
                });
                grid.appendChild(btn);
            });
        }
        openModal('hero-bottom-sheet');
    });
    
    document.getElementById('btn-upload-hero')?.addEventListener('click', () => document.getElementById('file-hero-upload')?.click());
    document.getElementById('file-hero-upload')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                store.setProfile({ ...store.profile, heroCover: ev.target.result });
                triggerHaptic(30); renderHome(); closeAllModals(true);
            };
            reader.readAsDataURL(file);
        }
    });
    
    const optionsContainer = document.getElementById('mood-options-container');
    document.getElementById('btn-mood-p1')?.addEventListener('click', () => {
        targetPerson = typeof store.getLoggedUser === 'function' ? store.getLoggedUser() : 'p1';
        openModal('mood-bottom-sheet');
    });
    
    document.getElementById('btn-mood-p2')?.addEventListener('click', () => {
        triggerHaptic(10);
        const myPersonId = typeof store.getLoggedUser === 'function' ? store.getLoggedUser() : 'p1';
        const partnerName = myPersonId === 'p1' ? (store.profile?.p2 || 'Seu parceiro') : (store.profile?.p1 || 'Seu parceiro');
        alert(`Apenas ${partnerName} pode atualizar o próprio humor!`);
    });
    
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        MOODS.forEach(mood => {
            const btn = document.createElement('div');
            btn.className = 'mood-option';
            btn.innerHTML = `<span class="mood-option-emoji">${mood.icon}</span><span class="mood-option-text">${mood.label}</span>`;
            btn.addEventListener('click', () => {
                const todayStr = getLocalDateString(new Date());
                const currentMoods = store.moods ? { ...store.moods } : { p1: null, p2: null, date: todayStr };
                currentMoods[targetPerson] = mood.id; currentMoods.date = todayStr;
                if (typeof store.setMoods === 'function') store.setMoods(currentMoods); else store.moods = currentMoods;
                triggerHaptic(30); renderHome(); closeAllModals(true);
            });
            optionsContainer.appendChild(btn);
        });
    }
    
    let memoryPhotoBase64 = null;
    document.getElementById('btn-open-memory-modal')?.addEventListener('click', () => {
        document.getElementById('form-add-memory')?.reset();
        const prev = document.getElementById('memory-photo-preview');
        if (prev) { prev.style.backgroundImage = 'none'; prev.classList.add('d-none'); }
        memoryPhotoBase64 = null;
        const dateInput = document.getElementById('memory-date');
        if (dateInput) dateInput.value = getLocalDateString(new Date());
        openModal('memory-bottom-sheet');
    });
    
    document.getElementById('btn-upload-memory-photo')?.addEventListener('click', () => document.getElementById('file-memory-photo')?.click());
    document.getElementById('file-memory-photo')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                memoryPhotoBase64 = ev.target.result;
                const prev = document.getElementById('memory-photo-preview');
                if (prev) { prev.style.backgroundImage = `url('${memoryPhotoBase64}')`; prev.classList.remove('d-none'); }
                triggerHaptic(20);
            };
            reader.readAsDataURL(file);
        }
    });
    
    document.getElementById('form-add-memory')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('memory-title').value.trim();
        const date = document.getElementById('memory-date').value;
        const note = document.getElementById('memory-note').value.trim();
        if (!title || !date) return;
        const newMemory = { id: Date.now(), title, date, note, photo: memoryPhotoBase64 };
        store.setMemories([...store.memories, newMemory]);
        triggerHaptic(30); renderHome(); closeAllModals(true);
    });
    
    document.getElementById('btn-open-note-modal')?.addEventListener('click', () => { document.getElementById('form-add-note')?.reset(); openModal('note-bottom-sheet'); });
    document.getElementById('form-add-note')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('note-text').value.trim();
        const color = document.getElementById('note-color').value;
        const durationHours = parseInt(document.getElementById('note-duration')?.value || '168');
        if (!text) return;
        
        const myPersonId = typeof store.getLoggedUser === 'function' ? store.getLoggedUser() : 'p1';
        const myName = myPersonId === 'p1' ? (store.profile?.p1 || 'P1') : (store.profile?.p2 || 'P2');
        const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
        
        const newNote = { id: Date.now(), text, color, owner: myName, date: new Date().toISOString(), expiresAt: expiresAt };
        store.setNotes([...(store.notes || []), newNote]);
        triggerHaptic(30); renderHome(); closeAllModals(true);
    });
    
    renderHome();
};