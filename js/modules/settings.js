import { store } from '../store.js';
import { triggerHaptic, showToast, runAction, openModal as openSheet, closeModal as closeSheet } from '../utils.js';

export const applyTheme = (themeValue) => {
    const isDark = themeValue === 'dark' || (themeValue === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    const labelEl = document.getElementById('current-theme-label');
    if (labelEl) {
        if (themeValue === 'system') labelEl.textContent = 'Sistema';
        else if (themeValue === 'light') labelEl.textContent = 'Claro';
        else labelEl.textContent = 'Escuro';
    }
};

export const initSettings = () => {
    applyTheme(store.theme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (store.theme === 'system') applyTheme('system');
    });

    const btnOpen = document.getElementById('btn-open-theme-modal');

    const sheet = document.getElementById('theme-bottom-sheet');
    const themeBtns = document.querySelectorAll('.btn-theme-option');

    const openModal = () => {
        triggerHaptic(10);
        openSheet('theme-bottom-sheet');
        
        themeBtns.forEach(btn => {
            if (btn.getAttribute('data-theme-value') === store.theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    // --- COPIAR CÓDIGO DO CASAL ---
    const inviteCodeEl = document.getElementById('setting-invite-code');
    const inviteCodeLi = inviteCodeEl?.closest('.setting-item');

    if (inviteCodeLi) {
        // Muda o mouse para parecer clicável e adiciona o evento
        inviteCodeLi.classList.add('cursor-pointer');
        inviteCodeLi.classList.remove('cursor-default');
        
        inviteCodeLi.addEventListener('click', () => {
            const code = store.profile?.inviteCode;
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    showToast('Código copiado para a área de transferência!');
                }).catch(() => {
                    showToast('Não foi possível copiar o código.', 'ph-warning');
                });
            }
        });
    }

    const closeModal = () => {
        closeSheet('theme-bottom-sheet');
    };

    btnOpen?.addEventListener('click', openModal);


    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            triggerHaptic(20);
            const newTheme = btn.getAttribute('data-theme-value');
            store.setTheme(newTheme);
            applyTheme(newTheme);
            closeModal();
        });
    });

    document.getElementById('btn-logout-app')?.addEventListener('click', () => {
        if (confirm('Deseja realmente sair do Nook?')) {
            runAction(document.getElementById('btn-logout-app'), () => store.logout());
        }
    });
};