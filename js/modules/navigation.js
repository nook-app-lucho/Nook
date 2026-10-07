import { store } from '../store.js';
import { triggerHaptic, hasUnsavedChanges, closeAllModals, showToast } from '../utils.js';
import { renderHome } from './home.js';
import { renderFinances } from './finances.js';
import { renderLists } from './lists.js';
import { renderAgendaView, renderDateScroller } from './agenda.js';
import { renderGoals } from './goals.js';

export const renderActiveView = () => {
    const readers = { 'view-home': renderHome, 'view-finances': renderFinances, 'view-lists': renderLists, 'view-agenda': () => { renderDateScroller(); renderAgendaView(); }, 'view-goals': renderGoals };
    for (const [id, render] of Object.entries(readers)) if (document.getElementById(id)?.classList.contains('active')) render();
};
export const initNavigation = () => {
    const items = document.querySelectorAll('.nav-item');
    items.forEach(item => item.addEventListener('click', e => {
        e.preventDefault();
        if (store.profile?.approved !== true) return;
        if (document.querySelector('[data-saving="true"]')) { showToast('Aguarde a gravação terminar.'); return; }
        if (hasUnsavedChanges() && !confirm('Descartar as alterações não salvas?')) return;
        closeAllModals(true);
        const target = item.getAttribute('data-target');
        if (!document.getElementById(target)) return;
        items.forEach(nav => {
            nav.classList.toggle('active', nav === item);
            const icon = nav.querySelector('i');
            icon?.classList.toggle('ph-fill', nav === item); icon?.classList.toggle('ph', nav !== item);
        });
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        triggerHaptic(10); renderActiveView();
    }));
};