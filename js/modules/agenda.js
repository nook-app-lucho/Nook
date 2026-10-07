import { store } from '../store.js';
import { triggerHaptic, getLocalDateString, getInitials, escapeHTML, openModal, closeAllModals, enableDesktopScroll, runAction } from '../utils.js';

import { validDate } from '../rules.js';

let selectedDateStr = getLocalDateString(new Date());
let currentAgendaView = 'week';

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
                triggerHaptic(10);
                selectedDateStr = dateStr;
                
                document.querySelectorAll('.date-bubble').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                renderAgendaView();
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            });
            scrollerEl.appendChild(bubble);
        }
        enableDesktopScroll(scrollerEl);
    } else {
        // Visão Mensal
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

        // Células vazias do início do mês
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
                triggerHaptic(10);
                selectedDateStr = dateStr;
                renderDateScroller(); 
                renderAgendaView();
            });
            monthGridEl.appendChild(dayDiv);
        }
    }
};

export const renderAgendaView = () => {
    const selectedListEl = document.getElementById('agenda-selected-list');
    const allListEl = document.getElementById('agenda-all-list');
    if (!selectedListEl || !allListEl) return;
    
    selectedListEl.innerHTML = '';
    allListEl.innerHTML = '';
    
    const [y, m, d] = selectedDateStr.split('-');
    const todayStr = getLocalDateString(new Date());
    document.getElementById('agenda-selected-title').textContent = selectedDateStr === todayStr ? `HOJE - ${d}/${m}/${y}` : `DIA SELECIONADO - ${d}/${m}/${y}`;
    
    const p1Init = store.profile ? getInitials(store.profile.p1) : 'IS';
    const p2Init = store.profile ? getInitials(store.profile.p2) : 'VO';
    
    const createEl = (ev, showBadge) => {
        let displayOwner = ev.owner;
        if (ev.owner === 'VO') displayOwner = p2Init;
        if (ev.owner === 'IS') displayOwner = p1Init;
        
        let badgeClass = (ev.owner === 'VO' || ev.owner === p2Init) ? 'bg-muted' : '';
        if (ev.owner === 'Casal') { badgeClass = 'bg-casal'; displayOwner = 'NÓS'; }
        
        const safeTitle = escapeHTML(ev.title);
        const safeSubtitle = ev.subtitle ? escapeHTML(ev.subtitle) : '';
        const [, em, ed] = validDate(ev.date) ? ev.date.split('-') : ['', '?', '?'];
        const dateTag = showBadge ? `<span class="agenda-date-badge">${ed}/${em}</span>` : '';
        
        // Lógica de RSVP para o Casal
        let rsvpSection = '';
        if (ev.owner === 'Casal') {
            const myPersonId = typeof store.getLoggedUser === 'function' ? store.getLoggedUser() : 'p1';
            if (ev.createdBy && ev.createdBy !== myPersonId && !ev.confirmed) {
                rsvpSection = `<button class="action-btn btn-rsvp" style="padding: 4px 10px; font-size: 0.75rem; margin-top: 6px; width: fit-content;"><i class="ph-bold ph-check"></i> Confirmar Ciente</button>`;
            } else if (ev.confirmed) {
                rsvpSection = `<div style="font-size: 0.7rem; color: var(--primary); margin-top: 6px; font-weight: 700;"><i class="ph-bold ph-check-double"></i> Ambos cientes</div>`;
            }
        }
        
        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = `
            <div class="task-text flex-col" style="flex: 1;">
                <strong class="task-item-title">${safeTitle}</strong>
                <div class="task-item-subtitle">${dateTag} ${escapeHTML(ev.time)} ${safeSubtitle ? '- ' + safeSubtitle : ''}</div>
                ${rsvpSection}
            </div>
            <div class="task-badge ${badgeClass}">${escapeHTML(displayOwner)}</div>
            <button class="btn-delete-event"><i class="ph ph-trash"></i></button>
        `;
        
        // Listener para confirmar ciente (RSVP)
        const rsvpBtn = li.querySelector('.btn-rsvp');
        if (rsvpBtn) {
            rsvpBtn.addEventListener('click', async () => { await runAction(li, async () => { await store.saveRecord('agenda', { ...ev, confirmed: true }); triggerHaptic(15); renderAgendaView(); }); });
        }

        li.querySelector('.btn-delete-event').addEventListener('click', async () => {
            if (!confirm('Excluir este compromisso?')) return;
            await runAction(li, async () => { await store.deleteRecord('agenda', ev.id); renderDateScroller(); renderAgendaView(); });
        });

        return li;
    };

    const selectedEvents = store.agenda.filter(ev => ev.date === selectedDateStr).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    if (selectedEvents.length === 0) selectedListEl.innerHTML = `<li class="empty-state">Dia livre!</li>`;
    else selectedEvents.forEach(ev => selectedListEl.appendChild(createEl(ev, false)));

    const futureEvents = store.agenda.filter(ev => ev.date >= todayStr).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.time || '').localeCompare(String(b.time || '')));
    if (futureEvents.length === 0) allListEl.innerHTML = `<li class="empty-state">Nenhum compromisso agendado para o futuro.</li>`;
    else futureEvents.forEach(ev => allListEl.appendChild(createEl(ev, true)));
};

export const initAgenda = () => {
    // Toggles de visualização
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
                renderAgendaView();
                triggerHaptic(15);
            }
        });
    }

    document.getElementById('btn-go-today')?.addEventListener('click', () => {
        triggerHaptic(10);
        selectedDateStr = getLocalDateString(new Date()); 
        renderDateScroller(); 
        renderAgendaView(); 
    });

    const form = document.getElementById('form-add-event');
    document.getElementById('btn-open-event-modal')?.addEventListener('click', () => {
        document.getElementById('event-date').value = selectedDateStr;
        openModal('event-bottom-sheet');
    });

    form?.addEventListener('submit', async e => {
        e.preventDefault(); const target = e.currentTarget;
        await runAction(target, async () => {
            await store.saveRecord('agenda', { title: document.getElementById('event-title').value, date: document.getElementById('event-date').value, time: document.getElementById('event-time').value, owner: document.getElementById('event-owner').value, subtitle: document.getElementById('event-subtitle').value, createdBy: store.getLoggedUser(), confirmed: false }, { create: true });
            renderDateScroller(); renderAgendaView(); triggerHaptic(30); closeAllModals(true); target.reset();
        });
    });

    renderDateScroller();
    renderAgendaView();
};