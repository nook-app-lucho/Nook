import { store } from '../store.js';
import { triggerHaptic, getLocalDateString, getInitials, escapeHTML, openModal, openConfirmSheet, closeAllModals, enableDesktopScroll, runAction, showToast, editWarning, saveFormEdit } from '../utils.js';
import { OWNER, sameId, validDate } from '../rules.js';

let selectedDateStr = getLocalDateString(new Date());
let currentAgendaView = 'week';
let agendaEditContext = null;
let editingAgendaId = null;

export const applyAgendaDateFilter = () => {
    const selectedListEl = document.getElementById('agenda-selected-list');
    if (!selectedListEl) return;
    
    const [y, m, d] = selectedDateStr.split('-');
    const todayStr = getLocalDateString(new Date());
    document.getElementById('agenda-selected-title').textContent = selectedDateStr === todayStr ? `HOJE - ${d}/${m}/${y}` : `DIA SELECIONADO - ${d}/${m}/${y}`;
    
    let visibleCount = 0;
    selectedListEl.querySelectorAll('.task-item').forEach(li => {
        const match = li.dataset.date === selectedDateStr;
        li.classList.toggle('d-none', !match);
        if (match) visibleCount++;
    });

    let emptyState = document.getElementById('empty-agenda-msg');
    if (visibleCount === 0) {
        if (!emptyState) {
            emptyState = document.createElement('li');
            emptyState.id = 'empty-agenda-msg';
            emptyState.className = 'empty-state empty-state-no-border';
            selectedListEl.appendChild(emptyState);
        }
        emptyState.innerHTML = `
            <div class="empty-state-with-action">
                <span>Nada marcado para este dia.</span>
                <button type="button" class="btn-primary btn-outline-primary btn-inline-action" id="btn-empty-agenda-add">Adicionar compromisso</button>
            </div>
        `;
        emptyState.querySelector('#btn-empty-agenda-add')?.addEventListener('click', () => document.getElementById('btn-open-event-modal')?.click());
        emptyState.classList.remove('d-none');
    } else if (emptyState) {
        emptyState.classList.add('d-none');
    }
};

export const renderDateScroller = () => {
    const scrollerEl = document.getElementById('agenda-date-scroller');
    const monthGridEl = document.getElementById('agenda-month-grid');
    if (!scrollerEl || !monthGridEl) return;
    
    if (currentAgendaView === 'week') {
        scrollerEl.classList.remove('d-none');
        monthGridEl.classList.add('d-none');
        scrollerEl.innerHTML = '';
        
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        const [y, m, d] = selectedDateStr.split('-').map(Number);
        const baseDate = new Date(y, m - 1, d);
        
        for (let i = -4; i <= 10; i++) {
            const tempDate = new Date(baseDate);
            tempDate.setDate(baseDate.getDate() + i);
            const dateStr = getLocalDateString(tempDate);
            const hasEvent = store.agenda.some(ev => ev.date === dateStr);
            
            const bubble = document.createElement('div');
            bubble.className = `date-bubble ${dateStr === selectedDateStr ? 'active' : ''} ${hasEvent ? 'has-events' : ''}`;
            bubble.innerHTML = `<span class="day-name">${diasSemana[tempDate.getDay()]}</span><span class="day-number">${tempDate.getDate()}</span><div class="event-dot"></div>`;
            
            bubble.addEventListener('click', (e) => {
                selectedDateStr = dateStr;
                document.querySelectorAll('.date-bubble').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // OTIMIZAÇÃO: Apenas esconde e mostra as li's usando a classe d-none em vez de remontar tudo
                applyAgendaDateFilter(); 
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            });
            scrollerEl.appendChild(bubble);
        }
        enableDesktopScroll(scrollerEl);
    } else {
        scrollerEl.classList.add('d-none');
        monthGridEl.classList.remove('d-none');
        monthGridEl.innerHTML = '';
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        diasSemana.forEach(d => {
            monthGridEl.insertAdjacentHTML('beforeend', `<div class="month-header-day">${d}</div>`);
        });
        const [y, m] = selectedDateStr.split('-').map(Number);
        const firstDay = new Date(y, m - 1, 1).getDay();
        const daysInMonth = new Date(y, m, 0).getDate();
        
        for (let i = 0; i < firstDay; i++) {
            monthGridEl.insertAdjacentHTML('beforeend', `<div class="month-day empty"></div>`);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const tempDate = new Date(y, m - 1, i);
            const dateStr = getLocalDateString(tempDate);
            const hasEvent = store.agenda.some(ev => ev.date === dateStr);
            const dayDiv = document.createElement('div');
            dayDiv.className = `month-day ${dateStr === selectedDateStr ? 'active' : ''} ${hasEvent ? 'has-events' : ''}`;
            dayDiv.innerHTML = `${i}<div class="event-dot"></div>`;
            dayDiv.addEventListener('click', () => {
                selectedDateStr = dateStr;
                renderDateScroller(); 
                // OTIMIZAÇÃO AQUI TAMBÉM
                applyAgendaDateFilter(); 
            });
            monthGridEl.appendChild(dayDiv);
        }
    }
};

const firstName = (value, fallback) => String(value || '').trim().split(/\s+/)[0] || fallback;
const eventTimeLabel = event => event?.time ? String(event.time).slice(0, 5) : 'Dia todo';
const compareAgendaTime = (a, b) => {
    const aAllDay = !a?.time;
    const bAllDay = !b?.time;
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
    return String(a?.time || '').localeCompare(String(b?.time || ''));
};
const syncAllDayControls = () => {
    const allDay = document.getElementById('event-all-day')?.checked === true;
    const timeInput = document.getElementById('event-time');
    const timeGroup = document.getElementById('event-time-group');
    if (timeInput) {
        timeInput.required = !allDay;
        timeInput.disabled = allDay;
    }
    timeGroup?.classList.toggle('d-none', allDay);
};

const openAgendaEditor = event => {
    agendaEditContext = store.captureEdit('agenda', event.id);
    const opened = agendaEditContext.record;
    editingAgendaId = opened.id;
    editWarning('agenda-edit-warning');

    document.getElementById('event-id').value = opened.id;
    document.getElementById('event-title').value = opened.title || '';
    document.getElementById('event-date').value = opened.date || '';
    document.getElementById('event-time').value = String(opened.time || '').slice(0, 5);
    document.getElementById('event-all-day').checked = !opened.time;
    syncAllDayControls();
    document.getElementById('event-owner').value = opened.owner || OWNER.COUPLE;
    document.getElementById('event-subtitle').value = opened.subtitle || '';
    document.getElementById('event-modal-title').textContent = 'Editar Compromisso';
    document.getElementById('btn-submit-event').textContent = 'Salvar Alterações';
    openModal('event-bottom-sheet');
};

export const renderAgendaView = () => {
    const selectedListEl = document.getElementById('agenda-selected-list');
    const allListEl = document.getElementById('agenda-all-list');
    if (!selectedListEl || !allListEl) return;
    
    selectedListEl.innerHTML = '';
    allListEl.innerHTML = '';
    
    const todayStr = getLocalDateString(new Date());
    
    const p1Init = store.profile ? getInitials(store.profile.p1) : 'IS';
    const p2Init = store.profile ? getInitials(store.profile.p2) : 'VO';
    
    const createEl = (ev, showBadge) => {
        let displayOwner = ev.owner;
        if (ev.owner === OWNER.P2) displayOwner = p2Init;
        if (ev.owner === OWNER.P1) displayOwner = p1Init;

        let badgeClass = (ev.owner === OWNER.P2 || ev.owner === p2Init) ? 'bg-muted' : '';
        if (ev.owner === OWNER.COUPLE) { badgeClass = 'bg-casal'; displayOwner = 'NÓS'; }

        const safeTitle = escapeHTML(ev.title);
        const safeSubtitle = ev.subtitle ? escapeHTML(ev.subtitle) : '';
        const [, em, ed] = validDate(ev.date) ? ev.date.split('-') : ['', '?', '?'];
        const dateTag = showBadge ? `<span class="agenda-date-badge">${ed}/${em}</span>` : '';
        const timeLabel = eventTimeLabel(ev);
        const myPersonId = store.getLoggedUser();
        const creatorName = ev.createdBy === 'p1'
            ? firstName(store.profile?.p1, 'P1')
            : ev.createdBy === 'p2'
                ? firstName(store.profile?.p2, 'P2')
                : '';
        const partnerName = myPersonId === 'p1' ? firstName(store.profile?.p2, 'seu parceiro') : firstName(store.profile?.p1, 'seu parceiro');
        const creatorText = ev.createdBy
            ? (ev.createdBy === myPersonId ? 'Criado por você' : `Criado por ${creatorName}`)
            : 'Criador não identificado';

        let awarenessSection = '';
        if (ev.owner === OWNER.COUPLE) {
            if (ev.confirmed) {
                awarenessSection = `<div class="agenda-rsvp-confirmed"><i class="ph-bold ph-check-double"></i> Ambos cientes</div>`;
            } else if (ev.createdBy && ev.createdBy !== myPersonId) {
                awarenessSection = `<button class="action-btn btn-rsvp agenda-rsvp-action"><i class="ph-bold ph-check"></i> Ciente</button>`;
            } else if (ev.createdBy === myPersonId) {
                awarenessSection = `<div class="agenda-rsvp-waiting">Aguardando ${escapeHTML(partnerName)} ficar ciente</div>`;
            } else {
                awarenessSection = `<div class="agenda-rsvp-waiting">Confirmação indisponível para compromisso antigo</div>`;
            }
        }

        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = `
            <div class="task-text flex-col flex-1">
                <strong class="task-item-title">${safeTitle}</strong>
                <div class="task-item-subtitle">${dateTag} ${escapeHTML(timeLabel)} ${safeSubtitle ? '- ' + safeSubtitle : ''}</div>
                <div class="agenda-created-by">${escapeHTML(creatorText)}</div>
                ${awarenessSection}
            </div>
            <div class="task-badge ${badgeClass}">${escapeHTML(displayOwner)}</div>
            <div class="agenda-item-actions">
                <button class="btn-edit-item btn-edit-event" title="Editar compromisso"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-delete-event" title="Excluir compromisso"><i class="ph ph-trash"></i></button>
            </div>
        `;

        li.querySelector('.btn-rsvp')?.addEventListener('click', async () => {
            await runAction(li, async () => {
                await store.saveRecord('agenda', { ...ev, confirmed: true });
                renderAgendaView();
                showToast('Marcado como ciente ✓');
            });
        });
        li.querySelector('.btn-edit-event')?.addEventListener('click', () => openAgendaEditor(ev));
        li.querySelector('.btn-delete-event').addEventListener('click', () => {
            openConfirmSheet({
                title: 'Excluir compromisso?',
                message: `“${ev.title}” será removido da agenda. Esta ação não poderá ser desfeita.`,
                confirmLabel: 'Excluir compromisso',
                onConfirm: async () => {
                    await store.deleteRecord('agenda', ev.id);
                    renderDateScroller();
                    renderAgendaView();
                    showToast('Compromisso excluído.');
                }
            });
        });
        return li;
    };
    
    // Alocamos TODOS os eventos na lista principal, mas ocultos
    const allEvents = [...store.agenda].sort(compareAgendaTime);
    allEvents.forEach(ev => {
        const li = createEl(ev, false);
        li.dataset.date = ev.date;
        selectedListEl.appendChild(li);
    });

    const futureEvents = store.agenda.filter(ev => ev.date >= todayStr).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || compareAgendaTime(a, b));
    if (futureEvents.length === 0) allListEl.innerHTML = `<li class="empty-state">Nenhum compromisso agendado para o futuro.</li>`;
    else futureEvents.forEach(ev => allListEl.appendChild(createEl(ev, true)));

    // Filtramos para a data correta logo na primeira renderização
    applyAgendaDateFilter();
};

export const initAgenda = () => {
    document.getElementById('btn-view-week')?.addEventListener('click', (e) => {
        currentAgendaView = 'week';
        e.target.classList.add('active');
        e.target.classList.remove('outline');
        document.getElementById('btn-view-month')?.classList.remove('active');
        document.getElementById('btn-view-month')?.classList.add('outline');
        renderDateScroller();
    });
    
    document.getElementById('btn-view-month')?.addEventListener('click', (e) => {
        currentAgendaView = 'month';
        e.target.classList.add('active');
        e.target.classList.remove('outline');
        document.getElementById('btn-view-week')?.classList.remove('active');
        document.getElementById('btn-view-week')?.classList.add('outline');
        renderDateScroller();
    });

    const jumpDateInput = document.getElementById('agenda-jump-date');
    if (jumpDateInput) {
        jumpDateInput.addEventListener('change', (e) => {
            const selectedDate = e.target.value;
            if (selectedDate) {
                selectedDateStr = selectedDate;
                renderDateScroller();
                applyAgendaDateFilter();
            }
        });
    }

    document.getElementById('btn-go-today')?.addEventListener('click', () => {
        selectedDateStr = getLocalDateString(new Date()); 
        renderDateScroller(); 
        applyAgendaDateFilter(); 
    });

    const form = document.getElementById('form-add-event');
    document.getElementById('event-all-day')?.addEventListener('change', syncAllDayControls);
    document.getElementById('btn-open-event-modal')?.addEventListener('click', () => {
        agendaEditContext = null;
        editingAgendaId = null;
        editWarning('agenda-edit-warning');
        form?.reset();
        document.getElementById('event-id').value = '';
        document.getElementById('event-date').value = selectedDateStr;
        document.getElementById('event-all-day').checked = false;
        syncAllDayControls();
        document.getElementById('event-modal-title').textContent = 'Novo Compromisso';
        document.getElementById('btn-submit-event').textContent = 'Salvar Compromisso';
        openModal('event-bottom-sheet');
    });

    form?.addEventListener('submit', async e => {
        e.preventDefault(); const target = e.currentTarget;
        await runAction(target, async () => {
            const id = document.getElementById('event-id').value;
            const patch = {
                title: document.getElementById('event-title').value,
                date: document.getElementById('event-date').value,
                time: document.getElementById('event-all-day').checked ? null : document.getElementById('event-time').value,
                owner: document.getElementById('event-owner').value,
                subtitle: document.getElementById('event-subtitle').value
            };

            let saved;
            if (id) {
                if (!agendaEditContext || !sameId(editingAgendaId, id)) throw new Error('Reabra a edição deste compromisso.');
                saved = await saveFormEdit(agendaEditContext, patch, 'agenda-edit-warning');
                showToast('Compromisso atualizado ✓');
            } else {
                saved = await store.saveRecord('agenda', { ...patch, createdBy: store.getLoggedUser(), confirmed: false }, { create: true });
                showToast('Compromisso salvo ✓');
            }

            selectedDateStr = saved.date;
            agendaEditContext = null;
            editingAgendaId = null;
            renderDateScroller();
            renderAgendaView();
            triggerHaptic(30);
            closeAllModals(true);
            target.reset();
        });
    });

    renderDateScroller();
    renderAgendaView();
};