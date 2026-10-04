import { triggerHaptic, hasUnsavedChanges, closeAllModals } from '../utils.js';
import { renderHome } from './home.js';

export const initNavigation = () => {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); 

            const targetId = item.getAttribute('data-target');
            if (!targetId) return; 

            if (hasUnsavedChanges()) {
                const confirmar = window.confirm("Você tem alterações não salvas neste formulário. Deseja realmente sair e descartar os dados?");
                if (!confirmar) return; 
                
                closeAllModals(true); // Força o fechamento dos modais se confirmado
            }

            triggerHaptic(10);

            if (targetId === 'view-home') {
                renderHome();
            }

            navItems.forEach(nav => {
                nav.classList.remove('active');
                const icon = nav.querySelector('i');
                if(icon) { icon.classList.remove('ph-fill'); icon.classList.add('ph'); }
            });
                         
            item.classList.add('active');
            const activeIcon = item.querySelector('i');
            if(activeIcon) { activeIcon.classList.remove('ph'); activeIcon.classList.add('ph-fill'); }
            
            views.forEach(view => view.classList.remove('active'));
            const targetView = document.getElementById(targetId);
            if(targetView) targetView.classList.add('active');
        });
    });
};