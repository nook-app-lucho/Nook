import { store } from '../store.js';
import { triggerHaptic, getLocalDateString, getInitials, escapeHTML, openModal, closeAllModals, enableDesktopScroll } from '../utils.js';

let selectedDateStr = getLocalDateString(new Date());

export const renderDateScroller = () => {
    const scrollerEl = document.getElementById('agenda-date-scroller');
    if (!scrollerEl) return;
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
            
            // Remove a classe 'active' de todas as bolhas
            document.querySelectorAll('.date-bubble').forEach(b => b.classList.remove('active'));
            // Adiciona a classe 'active' apenas na bolha clicada, preservando a árvore DOM
            e.currentTarget.classList.add('active');
            
            // Renderiza apenas as listas abaixo
            renderAgendaView();
            
            // Scroll funcionará perfeitamente, já que a bolha não foi destruída
            e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
        scrollerEl.appendChild(bubble);
    }
    enableDesktopScroll(scrollerEl);
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
        const [ey, em, ed] = ev.date.split('-');
        const dateTag = showBadge ? `<span class="agenda-date-badge">${ed}/${em}</span>` : '';
        
        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = `
            <div class="task-text">
                <strong class="task-item-title">${safeTitle}</strong>
                <div class="task-item-subtitle">${dateTag} ${ev.time} ${safeSubtitle ? '- ' + safeSubtitle : ''}</div>
            </div>
            <div class="task-badge ${badgeClass}">${displayOwner}</div>
            <button class="btn-delete-event"><i class="ph ph-trash"></i></button>
        `;
        li.querySelector('.btn-delete-event').addEventListener('click', () => {
            triggerHaptic(20);
            store.setAgenda(store.agenda.filter(e => e.id !== ev.id));
            renderDateScroller(); // Aqui o recálculo faz sentido para atualizar os dots
            renderAgendaView();
        });
        return li;
    };

    const selectedEvents = store.agenda.filter(ev => ev.date === selectedDateStr).sort((a, b) => a.time.localeCompare(b.time));
    if (selectedEvents.length === 0) selectedListEl.innerHTML = `<li class="empty-state">Dia livre!</li>`;
    else selectedEvents.forEach(ev => selectedListEl.appendChild(createEl(ev, false)));

    const futureEvents = store.agenda.filter(ev => ev.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    if (futureEvents.length === 0) allListEl.innerHTML = `<li class="empty-state">Nenhum compromisso agendado para o futuro.</li>`;
    else futureEvents.forEach(ev => allListEl.appendChild(createEl(ev, true)));
};

export const initAgenda = () => {
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
        selectedDateStr = getLocalDateString(new Date()); // Define a data como hoje
        renderDateScroller(); // Centraliza o carrossel de dias
        renderAgendaView(); // Atualiza a lista abaixo
    });

    const form = document.getElementById('form-add-event');
    document.getElementById('btn-open-event-modal')?.addEventListener('click', () => {
        openModal('event-bottom-sheet');
        document.getElementById('event-date').value = selectedDateStr;
    });
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        store.setAgenda([...store.agenda, {
            id: Date.now(),
            title: document.getElementById('event-title').value,
            date: document.getElementById('event-date').value,
            time: document.getElementById('event-time').value,
            owner: document.getElementById('event-owner').value,
            subtitle: document.getElementById('event-subtitle').value
        }]);
        renderDateScroller();
        renderAgendaView();
        triggerHaptic(30);
        closeAllModals(true);
        form?.reset();
    });
    renderDateScroller();
    renderAgendaView();
};