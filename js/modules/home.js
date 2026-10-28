import { store } from '../store.js';
import { getLocalDateString, escapeHTML, triggerHaptic, getAvatarHtml, openModal, openConfirmSheet, closeAllModals, formatCurrency, runAction, imageBackground, validateImageFile, initModalController, editWarning, saveFormEdit, showToast } from '../utils.js';

import { daysTogether, sameId, validDate, pendingSummary, NOTE_REACTIONS } from '../rules.js';

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
let viewingMemoryId = null;
let noteEditContext = null;
let editingNoteId = null;
let noteOriginalDuration = null;

const getNoteDurationValue = note => {
    if (!note?.expiresAt) return 'permanent';
    const start = Date.parse(note.date);
    const end = Date.parse(note.expiresAt);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return '168';
    const hours = Math.round((end - start) / 3600000);
    if (hours <= 48) return '24';
    if (hours <= 120) return '72';
    return '168';
};

const expiresAtFromDuration = value => {
    if (value === 'permanent') return null;
    const hours = Number(value);
    if (![24, 72, 168].includes(hours)) throw new Error('Escolha a duração do recado.');
    return new Date(Date.now() + hours * 3600000).toISOString();
};

const getFirstName = (fullName, fallback = '') => {
    if (!fullName) return fallback;
    const first = fullName.trim().split(/\s+/)[0];
    return first || fallback;
};

export const renderHome = () => {
    const heroEl = document.getElementById('main-hero');
    if (heroEl && store.profile) {
        const cover = store.profile.heroCover || PRESET_COVERS[0];
        heroEl.style.backgroundImage = imageBackground(store.getPhotoDisplayUrl(cover) || PRESET_COVERS[0]);
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
    
    const renderMoodCard = (slot, personId, editable) => {
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
        const hintEl = document.getElementById(`mood-hint-${slot}`);
        
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
        if (hintEl) hintEl.textContent = editable ? 'Toque para alterar' : 'Somente leitura';
    };
    
    renderMoodCard('p1', myPersonId, true); 
    renderMoodCard('p2', partnerPersonId, false);
    
    const cardP1 = document.getElementById('btn-mood-p1');
    const cardP2 = document.getElementById('btn-mood-p2');
    cardP1?.classList.add('mood-card--editable');
    cardP2?.classList.add('mood-card--readonly', 'cursor-default');
    
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
        const todayEvents = (store.agenda || []).filter(ev => ev.date === todayStr).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
        if (todayEvents.length === 0) {
            agendaList.innerHTML = `<li class="empty-state empty-state-no-border"><i class="ph ph-coffee empty-icon"></i>Dia livre para vocês curtirem!</li>`;
        } else {
            todayEvents.forEach(ev => {
                const li = document.createElement('li');
                li.className = 'task-item';
                li.innerHTML = `
                    <div class="task-text">
                        <strong class="task-item-title">${escapeHTML(ev.title)}</strong>
                        <div class="task-item-subtitle">${escapeHTML(ev.time ? String(ev.time).slice(0, 5) : 'Dia todo')}</div>
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

const formatMemoryDate = value => {
    if (!validDate(value)) return 'Data não disponível';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(year, month - 1, day)));
};

const openMemoryEditor = memory => {
    if (!memory) return;
    if (memoryUploadPending) { showToast('Aguarde o envio da foto terminar.', 'ph-info'); return; }

    memoryEditContext = store.captureEdit('memories', memory.id);
    const opened = memoryEditContext.record;
    editWarning('memory-edit-warning');
    editingMemoryId = opened.id;
    memoryPhotoUrl = null;
    document.getElementById('file-memory-photo').value = '';
    document.getElementById('memory-title').value = opened.title || '';
    document.getElementById('memory-date').value = opened.date || '';
    document.getElementById('memory-note').value = opened.note || '';

    const preview = document.getElementById('memory-photo-preview');
    const openedPhotoUrl = store.getPhotoDisplayUrl(opened.photo);
    if (openedPhotoUrl) {
        preview.style.backgroundImage = imageBackground(openedPhotoUrl);
        preview.classList.remove('d-none');
    } else {
        preview.style.backgroundImage = 'none';
        preview.classList.add('d-none');
    }

    const modalTitle = document.querySelector('#memory-bottom-sheet .sheet-header h2');
    if (modalTitle) modalTitle.textContent = 'Editar Memória';
    closeAllModals(true);
    openModal('memory-bottom-sheet');
};

const openMemoryViewer = memory => {
    if (!memory) return;
    viewingMemoryId = memory.id;
    const image = document.getElementById('memory-viewer-image');
    const photoUrl = store.getPhotoDisplayUrl(memory.photo) || PRESET_COVERS[0];
    if (image) {
        image.src = photoUrl;
        image.alt = `Foto da memória: ${memory.title || 'momento do casal'}`;
    }
    const date = document.getElementById('memory-viewer-date');
    const title = document.getElementById('memory-viewer-title');
    const note = document.getElementById('memory-viewer-note');
    if (date) date.textContent = formatMemoryDate(memory.date);
    if (title) title.textContent = memory.title || 'Memória';
    if (note) {
        note.textContent = memory.note || 'Sem descrição adicional.';
        note.classList.toggle('text-muted', !memory.note);
    }
    openModal('memory-viewer-bottom-sheet');
};

const renderMemoriesSection = () => {
    const capsuleContainer = document.getElementById('home-capsule-card');
    const memoriesGrid = document.getElementById('home-memories-grid');
    if (!memoriesGrid) return;

    memoriesGrid.innerHTML = '';
    const memories = store.memories || [];
    const today = new Date();
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const capsuleMemory = memories.find(memory => {
        if (!memory.date) return false;
        const [year, month, day] = memory.date.split('-');
        return `${month}-${day}` === todayMonthDay && Number(year) < today.getFullYear();
    });

    if (capsuleContainer) {
        if (capsuleMemory) {
            capsuleContainer.classList.remove('d-none');
            const [year] = capsuleMemory.date.split('-');
            const yearsAgo = today.getFullYear() - Number(year);
            document.getElementById('capsule-title').textContent = `Há ${yearsAgo} ano${yearsAgo > 1 ? 's' : ''} atrás...`;
            document.getElementById('capsule-text').textContent = capsuleMemory.title;
            document.getElementById('capsule-bg').style.backgroundImage = imageBackground(store.getPhotoDisplayUrl(capsuleMemory.photo));
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
        return;
    }

    const sortedMemories = [...memories].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    sortedMemories.forEach(memory => {
        const [year, month, day] = validDate(memory.date) ? memory.date.split('-') : ['?', '?', '?'];
        const photoUrl = store.getPhotoDisplayUrl(memory.photo) || PRESET_COVERS[0];
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'memory-card memory-card-button';
        card.setAttribute('aria-label', `Abrir memória: ${memory.title || 'momento do casal'}`);
        card.innerHTML = `
            <span class="memory-photo">
                <img
                    src="${escapeHTML(photoUrl)}"
                    alt="${escapeHTML(`Foto da memória: ${memory.title || 'momento do casal'}`)}"
                    loading="lazy"
                    decoding="async"
                    class="memory-card-image"
                >
                <span class="memory-date-badge">${day}/${month}/${year}</span>
            </span>
            <span class="memory-info">
                <strong>${escapeHTML(memory.title)}</strong>
                ${memory.note ? `<span class="memory-info-note">${escapeHTML(memory.note)}</span>` : ''}
            </span>
        `;
        card.addEventListener('click', () => openMemoryViewer(memory));
        memoriesGrid.appendChild(card);
    });
};

const noteBelongsToCurrentUser = note => {
    const currentPerson = store.getLoggedUser();
    if (note?.createdBy) return note.createdBy === currentPerson;
    // Compatibilidade para recados legacy sem created_by.
    return note?.owner === store.getAuthorName();
};

const noteAuthorLabel = note => {
    if (note?.createdBy === 'p1') return store.profile?.p1 || note.owner || 'P1';
    if (note?.createdBy === 'p2') return store.profile?.p2 || note.owner || 'P2';
    return note?.owner || 'Autor';
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
        const tiltClass = index % 2 === 0 ? 'note-card--tilt-right' : 'note-card--tilt-left';
        const canManage = noteBelongsToCurrentUser(note);
        const authorLabel = noteAuthorLabel(note);
        card.className = `note-card ${tiltClass} ${['yellow', 'pink', 'blue'].includes(note.color) ? note.color : 'yellow'}`;
        
        const reactionsDisplay = escapeHTML((note.reactions || []).join(''));
        
        card.innerHTML = `
            <i class="ph-fill ph-push-pin note-pin"></i>
            <p class="note-text-content">${escapeHTML(note.text)}</p>
            <div class="note-reactions-display">${reactionsDisplay}</div>
            <span class="note-author">- ${escapeHTML(authorLabel)}</span>
            
            <div class="note-actions">
                ${NOTE_REACTIONS.map(emoji => `<button type="button" class="btn-reaction" data-emoji="${escapeHTML(emoji)}">${escapeHTML(emoji)}</button>`).join('')}
            </div>

            <div class="note-card-controls">
                ${canManage ? '<button type="button" class="btn-note-control btn-edit-note" title="Editar recado"><i class="ph ph-pencil-simple"></i></button><button type="button" class="btn-note-control btn-delete-note" title="Apagar recado"><i class="ph ph-trash"></i></button>' : ''}
            </div>
        `;
        
        card.querySelectorAll('.btn-reaction').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation(); const emoji = e.currentTarget.dataset.emoji;
                await runAction(card, async () => {
                    const latest = store.notes.find(item => sameId(item.id, note.id));
                    if (!latest) throw new Error('Este recado não está disponível.');
                    const currentReactions = (latest.reactions || []).filter(reaction => NOTE_REACTIONS.includes(reaction));
                    await store.saveRecord('notes', { ...latest, reactions: [...currentReactions, emoji] });
                    renderNotesSection();
                });
            });
        });

        card.querySelector('.btn-edit-note')?.addEventListener('click', () => {
            const latest = store.notes.find(item => sameId(item.id, note.id));
            if (!latest || !noteBelongsToCurrentUser(latest)) {
                showToast('Você só pode editar os seus próprios recados.', 'ph-info');
                return;
            }
            noteEditContext = store.captureEdit('notes', latest.id);
            editingNoteId = latest.id;
            noteOriginalDuration = getNoteDurationValue(noteEditContext.record);
            editWarning('note-edit-warning');

            document.getElementById('note-text').value = noteEditContext.record.text;
            document.getElementById('note-duration').value = noteOriginalDuration;
            document.getElementById('note-color').value = noteEditContext.record.color || 'yellow';
            document.getElementById('note-color-group')?.classList.add('d-none');
            const title = document.getElementById('note-modal-title');
            const submit = document.getElementById('btn-submit-note');
            if (title) title.textContent = 'Editar recado';
            if (submit) submit.textContent = 'Salvar alterações';
            openModal('note-bottom-sheet');
        });

        card.querySelector('.btn-delete-note')?.addEventListener('click', () => {
            openConfirmSheet({
                title: 'Excluir recado?',
                message: `“${note.text}” será removido do mural. Esta ação não poderá ser desfeita.`,
                confirmLabel: 'Excluir recado',
                onConfirm: async () => {
                    await store.deleteRecord('notes', note.id);
                    renderNotesSection();
                    showToast('Recado excluído.');
                }
            });
        });
        grid.appendChild(card);
    });
};

export const initHome = () => {
    document.getElementById('home-tasks-card')?.addEventListener('click', () => { document.querySelector('.nav-item[data-target="view-lists"]')?.click(); });
    document.getElementById('home-fin-card')?.addEventListener('click', () => { document.querySelector('.nav-item[data-target="view-finances"]')?.click(); });
    
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
const path = await store.uploadPhoto('covers', file, { prefix: 'cover' });
await store.setProfile({ heroCover: path });
            triggerHaptic(30); renderHome(); closeAllModals(true);
        });
    });

    const optionsContainer = document.getElementById('mood-options-container');
    document.getElementById('btn-mood-p1')?.addEventListener('click', () => {
        targetPerson = typeof store.getLoggedUser === 'function' ? store.getLoggedUser() : 'p1';
        openModal('mood-bottom-sheet');
    });
    
    document.getElementById('btn-mood-p2')?.addEventListener('click', () => {
        const myPersonId = typeof store.getLoggedUser === 'function' ? store.getLoggedUser() : 'p1';
        const partnerName = myPersonId === 'p1' ? (store.profile?.p2 || 'Seu parceiro') : (store.profile?.p1 || 'Seu parceiro');
        showToast(`Esse mood só pode ser atualizado por ${partnerName}.`, 'ph-info');
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
    
    document.getElementById('btn-viewer-edit-memory')?.addEventListener('click', () => {
        const memory = store.memories.find(item => sameId(item.id, viewingMemoryId));
        if (!memory) { showToast('Esta memória não está mais disponível.', 'ph-warning-circle'); return; }
        openMemoryEditor(memory);
    });

    document.getElementById('btn-viewer-delete-memory')?.addEventListener('click', () => {
        const memory = store.memories.find(item => sameId(item.id, viewingMemoryId));
        if (!memory) { showToast('Esta memória não está mais disponível.', 'ph-warning-circle'); return; }
        openConfirmSheet({
            title: 'Excluir memória?',
            message: `“${memory.title || 'Esta memória'}” será removida. Esta ação não poderá ser desfeita.`,
            confirmLabel: 'Excluir memória',
            onConfirm: async () => {
                await store.deleteRecord('memories', memory.id);
                viewingMemoryId = null;
                triggerHaptic(20);
                renderMemoriesSection();
                showToast('Memória excluída.');
            }
        });
    });

    document.getElementById('btn-open-memory-modal')?.addEventListener('click', () => {
        if (memoryUploadPending) { showToast('Aguarde o envio da foto terminar.', 'ph-info'); return; }
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
memoryPhotoUrl = await store.uploadPhoto('memories', file, { prefix: 'memory' });
const preview = document.getElementById('memory-photo-preview');
preview.style.backgroundImage = imageBackground(store.getPhotoDisplayUrl(memoryPhotoUrl));
preview.classList.remove('d-none');
triggerHaptic(20);
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
            const wasEditing = editingMemoryId != null;
            editingMemoryId = saved.id; memoryPhotoUrl = null;
            triggerHaptic(30); renderHome(); closeAllModals(true);
            showToast(wasEditing ? 'Memória atualizada ✓' : 'Memória salva ✓');
        });
    });

    document.getElementById('btn-open-note-modal')?.addEventListener('click', () => {
        const form = document.getElementById('form-add-note');
        form?.reset();
        noteEditContext = null;
        editingNoteId = null;
        noteOriginalDuration = null;
        editWarning('note-edit-warning');
        document.getElementById('note-color-group')?.classList.remove('d-none');
        const title = document.getElementById('note-modal-title');
        const submit = document.getElementById('btn-submit-note');
        if (title) title.textContent = 'Deixar um Recado';
        if (submit) submit.textContent = 'Fixar no Mural';
        const duration = document.getElementById('note-duration');
        if (duration) duration.value = '168';
        openModal('note-bottom-sheet');
    });
    document.getElementById('form-add-note')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const durationValue = document.getElementById('note-duration').value;
            if (!['24', '72', '168', 'permanent'].includes(durationValue)) throw new Error('Escolha a duração do recado.');
            const text = document.getElementById('note-text').value.trim();

            if (editingNoteId != null) {
                const existing = noteEditContext?.record;
                if (!existing || !sameId(existing.id, editingNoteId)) throw new Error('Este recado mudou. Reabra a edição.');
                if (!noteBelongsToCurrentUser(existing)) throw new Error('Você só pode editar os seus próprios recados.');
                const expiresAt = durationValue === noteOriginalDuration ? existing.expiresAt : expiresAtFromDuration(durationValue);
                await saveFormEdit(noteEditContext, { text, expiresAt }, 'note-edit-warning');
                showToast('Recado atualizado ✓');
            } else {
                await store.saveRecord('notes', {
                    text,
                    color: document.getElementById('note-color').value,
                    owner: store.getAuthorName(),
                    createdBy: store.getLoggedUser(),
                    date: new Date().toISOString(),
                    expiresAt: expiresAtFromDuration(durationValue),
                    reactions: []
                }, { create: true });
                showToast('Recado criado ✓');
            }

            noteEditContext = null;
            editingNoteId = null;
            noteOriginalDuration = null;
            triggerHaptic(30);
            renderHome();
            closeAllModals(true);
            form.reset();
        });
    });

    renderHome();
};