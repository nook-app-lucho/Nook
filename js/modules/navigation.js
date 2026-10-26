import { store } from '../store.js';
import { closeAllModals, showToast } from '../utils.js';
import { renderHome } from './home.js';
import { renderFinances } from './finances.js';
import { renderLists } from './lists.js';
import { renderAgendaView, renderDateScroller } from './agenda.js';
import { renderGoals } from './goals.js';
import { renderSettings } from './settings.js';

export const renderActiveView = () => {
    const readers = {
        'view-home': renderHome,
        'view-finances': renderFinances,
        'view-lists': renderLists,
        'view-agenda': () => { renderDateScroller(); renderAgendaView(); },
        'view-goals': renderGoals,
        'view-settings': renderSettings
    };
    for (const [id, render] of Object.entries(readers)) {
        if (document.getElementById(id)?.classList.contains('active')) render();
    }
};

export const initNavigation = () => {
    const items = [...document.querySelectorAll('.nav-item')];
    const views = [...document.querySelectorAll('.view')];

    const navigateTo = target => {
        if (store.profile?.approved !== true) return;
        if (document.body.classList.contains('app-data-loading') && !['view-home', 'view-finances', 'view-agenda'].includes(target)) {
            showToast('Carregando seus dados. Só mais um instante.', 'ph-info');
            return;
        }
        if (document.querySelector('[data-saving="true"]')) {
            showToast('Aguarde a gravação terminar.');
            return;
        }
        closeAllModals(false, () => {
            const targetView = document.getElementById(target);
            if (!targetView) return;

            items.forEach(nav => {
                const isActive = nav.getAttribute('data-target') === target;
                nav.classList.toggle('active', isActive);
                const icon = nav.querySelector('i');
                icon?.classList.toggle('ph-fill', isActive);
                icon?.classList.toggle('ph', !isActive);
            });

            views.forEach(view => view.classList.remove('active'));
            targetView.classList.add('active');
            renderActiveView();
        });
    };

    items.forEach(item => item.addEventListener('click', event => {
        event.preventDefault();
        navigateTo(item.getAttribute('data-target'));
    }));

    document.getElementById('btn-open-settings')?.addEventListener('click', () => navigateTo('view-settings'));
};