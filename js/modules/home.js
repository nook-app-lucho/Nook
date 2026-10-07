import { store, supabase } from '../store.js';
import { getLocalDateString, escapeHTML, triggerHaptic, getAvatarHtml, openModal, closeAllModals, formatCurrency, runAction, safeImageUrl, imageBackground, validateImageFile, initModalController, editWarning, saveFormEdit } from '../utils.js';

import { daysTogether, sameId, validDate, pendingSummary } from '../rules.js';

const MOODS = [
    { id: 'energia', icon: '⚡', label: 'Cheio(a) de energia' },
    { id: 'cansado', icon: '😴', label: 'Cansado(a)' },
    { id: 'lanche', icon: '🍟', label: 'Querendo lanche' },
    { id: 'apaixonado', icon: '😍', label: 'Apaixonado(a)' },
    { id: 'estresse', icon: '🤯', label: 'Estressado(a)' },
    { id: 'feliz', icon: '🥳', label: 'Feliz da vida' }
];

const PRESET_COVERS = [
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop'
];

let targetPerson = 'p1';
let memoryPhotoUrl = null;
let memoryUploadPending = false;
let memoryEditContext = null;
let editingMemoryId = null; // Variável para controlar a edição

const getFirstName = (fullName, fallback = '') => {
    if (!fullName) return fallback;
    const first = fullName.trim().split(/\s+/)[0];
    return first || fallback;
};

export const renderHome = () => {
    const heroEl = document.getElementById('main-hero');
    if (heroEl && store.profile) {
        const cover = store.profile.heroCover || PRESET_COVERS[0];
        heroEl.style.backgroundImage = imageBackground(cover);
    }
    
    const greetingElement = document.getElementById('dynamic-greeting');
    if (greetingElement) {
        const hour = new Date().getHours();
        const day = new Date().getDay();
        let text = "Boa noite! Descansem 😴";
        
        if (day === 5 && hour > 17) text = "Sextou, casal! 🍻";
        else if (day === 0 && hour < 12) text = "Domingo de preguiça ☕";
        else if (hour >= 5 && hour < 12) text = "Bom dia, amores! ☀️";
        else if (hour >= 12 && hour < 18) text = "Boa tarde! 🌅";
        
        greetingElement.textContent = text;
    }
    
    const daysElement = document.getElementById('days-together');
    if (daysElement) {
        if (store.profile && store.profile.startDate) {
            try { daysElement.textContent = daysTogether(store.profile.startDate); } catch { daysElement.textContent = '--'; }
        } else {
            daysElement.textContent = '--';
        }
    }
    
    const todayStr = getLocalDateString(new Date());
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
        
        const moodData = (store.moods?.date === todayStr && store.moods[personId]) ? MOODS.find(m => m.id === store.moods[personId]) : null;
        const iconEl = document.getElementById(`mood-icon-${slot}`);
        const textEl = document.getElementById(`mood-text-${slot}`);
        
        if (moodData) {
            if (iconEl) iconEl.textContent = moodData.icon;
            if (textEl) { 
                textEl.textContent = moodData.label; 
                textEl.className = 'mood-text active'; 
            }
        } else {
            if (iconEl) iconEl.textContent = '☁️';
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
        const pendingCount = (store.lists || []).reduce((acc, list) => acc + (list.items || []).filter(i => i && !i.completed).length, 0);
        const invalidCount = store.lists.reduce((sum, list) => sum + (list._invalidItems?.length || 0), 0);
        tasksDescEl.textContent = pendingCount === 0 ? "Tudo em dia!" : `${pendingCount} item(s) pendente(s)`;
        if (invalidCount) tasksDescEl.textContent += ` — ${invalidCount} item(ns) inválido(s). Revise em Listas.`;
    }
    
    const finDescEl = document.getElementById('home-fin-desc');
    if (finDescEl) {
        try {
            const summary = pendingSummary(store.expenses);
            finDescEl.textContent = summary.count === 0 ? 'Tudo pago!' : `${formatCurrency(summary.amount / 100)} (${summary.count} pendente${summary.count > 1 ? 's' : ''})`;
            if (summary.invalid.length) finDescEl.textContent += ` — ${summary.invalid.length} conta(s) inválida(s) excluída(s). Revise em Finanças.`;
        } catch (error) { finDescEl.textContent = error.message; }
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
                        <div class="task-item-subtitle">${escapeHTML(ev.time || '')}</div>
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
            document.getElementById('capsule-bg').style.backgroundImage = imageBackground(capsuleMemory.photo);
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
        const sortedMemories = [...memories].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        sortedMemories.forEach(mem => {
            const [y, m, d] = validDate(mem.date) ? mem.date.split('-') : ['?', '?', '?'];
            const card = document.createElement('div');
            card.className = 'memory-card';
            
            // Adicionado botão de editar na grid sobrescrevendo inline positions para não quebrar o CSS
            card.innerHTML = `
                <div class="memory-photo" style="background-image: ${escapeHTML(imageBackground(mem.photo || PRESET_COVERS[0]))}">
                    <span class="memory-date-badge">${d}/${m}/${y}</span>
                    <div style="position: absolute; top: 6px; right: 6px; display: flex; gap: 6px; z-index: 10;">
                        <button class="btn-edit-memory" title="Editar memória" style="position: static; background: rgba(0, 0, 0, 0.5); color: white; border: none; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; cursor: pointer;"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-delete-memory" title="Apagar memória" style="position: static; background: rgba(0, 0, 0, 0.5); color: white; border: none; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; cursor: pointer;"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
                <div class="memory-info">
                    <strong>${escapeHTML(mem.title)}</strong>
                    ${mem.note ? `<p>${escapeHTML(mem.note)}</p>` : ''}
                </div>
            `;
            
            card.querySelector('.btn-edit-memory').addEventListener('click', (e) => {
                e.stopPropagation();
                triggerHaptic(10);
                
                if (memoryUploadPending) { alert('Aguarde o envio da foto terminar.'); return; }
                memoryEditContext = store.captureEdit('memories', mem.id);
                const opened = memoryEditContext.record;
                editWarning('memory-edit-warning');
                editingMemoryId = opened.id;
                memoryPhotoUrl = null;
                document.getElementById('file-memory-photo').value = ''; 
                
                document.getElementById('memory-title').value = opened.title || '';
                document.getElementById('memory-date').value = opened.date || '';
                document.getElementById('memory-note').value = opened.note || '';
                
                const prev = document.getElementById('memory-photo-preview');
                if (opened.photo) {
                    prev.style.backgroundImage = imageBackground(opened.photo);
                    prev.classList.remove('d-none');
                } else {
                    prev.style.backgroundImage = 'none';
                    prev.classList.add('d-none');
                }
                
                const modalTitle = document.querySelector('#memory-bottom-sheet .sheet-header h2');
                if(modalTitle) modalTitle.textContent = "Editar Memória";
                
                openModal('memory-bottom-sheet');
            });

            card.querySelector('.btn-delete-memory').addEventListener('click', async e => {
                e.stopPropagation();
                if (!confirm('Excluir esta memória?')) return;
                await runAction(card, async () => { await store.deleteRecord('memories', mem.id); triggerHaptic(20); renderMemoriesSection(); });
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
    
    const sortedNotes = [...validNotes].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    sortedNotes.forEach((note, index) => {
        const card = document.createElement('div');
        const rotation = index % 2 === 0 ? 'rotate(2deg)' : 'rotate(-2deg)';
        card.className = `note-card ${['yellow', 'pink', 'blue'].includes(note.color) ? note.color : 'yellow'}`;
        card.style.transform = rotation;
        
        const reactionsDisplay = escapeHTML((note.reactions || []).join(''));
        
        card.innerHTML = `
            <i class="ph-fill ph-push-pin note-pin"></i>
            <p class="note-text-content">${escapeHTML(note.text)}</p>
            <div class="note-reactions-display">${reactionsDisplay}</div>
            <span class="note-author">- ${escapeHTML(note.owner)}</span>
            
            <div class="note-actions">
                <button type="button" class="btn-reaction" data-emoji="❤️">❤️</button>
                <button type="button" class="btn-reaction" data-emoji="😘">😘</button>
                <button type="button" class="btn-reaction" data-emoji="☕">☕</button>
            </div>
            
            <button class="btn-delete-note" title="Apagar recado"><i class="ph ph-trash"></i></button>
        `;
        
        card.querySelectorAll('.btn-reaction').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation(); const emoji = e.currentTarget.dataset.emoji;
                await runAction(card, async () => {
                    const latest = store.notes.find(item => sameId(item.id, note.id));
                    if (!latest) throw new Error('Este recado não está disponível.');
                    await store.saveRecord('notes', { ...latest, reactions: [...(latest.reactions || []), emoji] });
                    triggerHaptic(10); renderNotesSection();
                });
            });
        });
        card.querySelector('.btn-delete-note').addEventListener('click', async () => {
            if (!confirm('Excluir este recado?')) return;
            await runAction(card, async () => { await store.deleteRecord('notes', note.id); renderNotesSection(); });
        });
        grid.appendChild(card);
    });
};

const imageExtension = file => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type]);

export const initHome = () => {
    document.getElementById('home-tasks-card')?.addEventListener('click', () => { triggerHaptic(10); document.querySelector('.nav-item[data-target="view-lists"]')?.click(); });
    document.getElementById('home-fin-card')?.addEventListener('click', () => { triggerHaptic(10); document.querySelector('.nav-item[data-target="view-finances"]')?.click(); });
    
    initModalController();
    
    document.getElementById('btn-edit-hero')?.addEventListener('click', () => {
        const grid = document.getElementById('hero-gallery-grid');
        if (grid) {
            grid.innerHTML = '';
            PRESET_COVERS.forEach(url => {
                const btn = document.createElement('div');
                btn.className = 'hero-preset';
                btn.style.backgroundImage = imageBackground(url);
                btn.addEventListener('click', async () => { await runAction(btn, async () => { await store.setProfile({ heroCover: url }); triggerHaptic(20); renderHome(); closeAllModals(true); }); });
                grid.appendChild(btn);
            });
        }
        openModal('hero-bottom-sheet');
    });
    
    document.getElementById('btn-upload-hero')?.addEventListener('click', () => document.getElementById('file-hero-upload')?.click());
    
    document.getElementById('file-hero-upload')?.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        await runAction(document.getElementById('hero-bottom-sheet'), async () => {
            validateImageFile(file);
            const fileName = `covers/${crypto.randomUUID()}.${imageExtension(file)}`;
            const { error } = await supabase.storage.from('photos').upload(fileName, file);
            if (error) throw error;
            const { data } = supabase.storage.from('photos').getPublicUrl(fileName);
            await store.setProfile({ heroCover: data.publicUrl });
            triggerHaptic(30); renderHome(); closeAllModals(true);
        });
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
            btn.addEventListener('click', async () => {
                await runAction(optionsContainer, async () => { await store.setMood(mood.id); triggerHaptic(30); renderHome(); closeAllModals(true); });
            });
            optionsContainer.appendChild(btn);
        });
    }
    
    document.getElementById('btn-open-memory-modal')?.addEventListener('click', () => {
        if (memoryUploadPending) { alert('Aguarde o envio da foto terminar.'); return; }
        memoryEditContext = null; editWarning('memory-edit-warning');
        editingMemoryId = null; // Garante modo de criação novo
        document.getElementById('form-add-memory')?.reset();
        const prev = document.getElementById('memory-photo-preview');
        if (prev) { prev.style.backgroundImage = 'none'; prev.classList.add('d-none'); }
        memoryPhotoUrl = null;
        const dateInput = document.getElementById('memory-date');
        if (dateInput) dateInput.value = getLocalDateString(new Date());
        
        const modalTitle = document.querySelector('#memory-bottom-sheet .sheet-header h2');
        if(modalTitle) modalTitle.textContent = "Guardar Memória";
        
        openModal('memory-bottom-sheet');
    });
    
    document.getElementById('btn-upload-memory-photo')?.addEventListener('click', () => document.getElementById('file-memory-photo')?.click());
    
    document.getElementById('file-memory-photo')?.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        await runAction(document.getElementById('form-add-memory'), async () => {
            validateImageFile(file); memoryUploadPending = true;
            try {
                const fileName = `memories/${crypto.randomUUID()}.${imageExtension(file)}`;
                const { error } = await supabase.storage.from('photos').upload(fileName, file);
                if (error) throw error;
                const { data } = supabase.storage.from('photos').getPublicUrl(fileName);
                memoryPhotoUrl = data.publicUrl;
                const preview = document.getElementById('memory-photo-preview');
                preview.style.backgroundImage = imageBackground(memoryPhotoUrl); preview.classList.remove('d-none'); triggerHaptic(20);
            } finally { memoryUploadPending = false; }
        });
    });

    document.getElementById('form-add-memory')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            if (memoryUploadPending) throw new Error('Aguarde o envio da foto.');
            const existing = editingMemoryId != null ? memoryEditContext?.record : null;
            if (editingMemoryId != null && !existing) throw new Error('Esta memória mudou. Recarregue.');
            const data = { ...(existing || {}), title: document.getElementById('memory-title').value.trim(), date: document.getElementById('memory-date').value, note: document.getElementById('memory-note').value.trim(), photo: memoryPhotoUrl || existing?.photo || null };
            const saved = editingMemoryId != null ? await saveFormEdit(memoryEditContext, data, 'memory-edit-warning') : await store.saveRecord('memories', data, { create: true });
            editingMemoryId = saved.id; memoryPhotoUrl = null;
            triggerHaptic(30); renderHome(); closeAllModals(true);
        });
    });

    document.getElementById('btn-open-note-modal')?.addEventListener('click', () => { document.getElementById('form-add-note')?.reset(); openModal('note-bottom-sheet'); });
    document.getElementById('form-add-note')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const hours = Number(document.getElementById('note-duration').value || 168);
            if (![24, 72, 168].includes(hours)) throw new Error('Escolha a duração do recado.');
            await store.saveRecord('notes', { text: document.getElementById('note-text').value.trim(), color: document.getElementById('note-color').value, owner: store.getAuthorName(), date: new Date().toISOString(), expiresAt: new Date(Date.now() + hours * 3600000).toISOString(), reactions: [] }, { create: true });
            triggerHaptic(30); renderHome(); closeAllModals(true); form.reset();
        });
    });

    renderHome();
};