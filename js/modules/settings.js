import { store } from '../store.js';
import { showToast, runAction, openModal as openSheet, closeModal as closeSheet, openConfirmSheet } from '../utils.js';

let settingsInitialized = false;

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

const getInviteText = () => {
    const code = store.profile?.inviteCode;
    if (!code) throw new Error('O código do convite ainda não está disponível.');
    return `Vem pro nosso Nook 💛
Código: ${code}`;
};

const copyInviteText = async (text) => {
    if (!navigator.clipboard?.writeText) throw new Error('Seu navegador não permite copiar o convite automaticamente.');
    await navigator.clipboard.writeText(text);
};

const bindInviteButton = (id, action) => {
    const button = document.getElementById(id);
    if (!button || button.dataset.inviteBound === 'true') return;
    button.dataset.inviteBound = 'true';
    button.addEventListener('click', event => action(event.currentTarget));
};

const copyInviteCode = button => runAction(button, async () => {
    const code = store.profile?.inviteCode;
    if (!code) throw new Error('O código do convite ainda não está disponível.');
    await copyInviteText(code);
    showToast('Convite copiado ✓');
});

const shareInvite = button => runAction(button, async () => {
    const text = getInviteText();

    if (typeof navigator.share === 'function') {
        try {
            await navigator.share({ title: 'Nook', text });
            showToast('Convite compartilhado ✓');
            return;
        } catch (error) {
            if (error?.name === 'AbortError') return;
        }
    }

    try {
        await copyInviteText(text);
        showToast('Convite copiado ✓');
    } catch {
        throw new Error('Não foi possível compartilhar nem copiar o convite.');
    }
});

export const renderSettings = () => {
    const profile = store.profile;
    const partnerConnected = Boolean(profile?.p2Email && profile?.approved === true);
    const status = partnerConnected ? 'Parceiro conectado ✓' : 'Esperando seu parceiro entrar';

    document.querySelectorAll('[data-invite-code]').forEach(element => {
        element.textContent = profile?.inviteCode || '---';
    });
    document.querySelectorAll('[data-invite-status]').forEach(element => {
        element.textContent = status;
    });

    document.getElementById('setting-invite-actions')?.classList.toggle('d-none', partnerConnected);
};

export const initSettings = () => {
    applyTheme(store.theme);
    renderSettings();

    bindInviteButton('btn-copy-invite', copyInviteCode);
    bindInviteButton('btn-share-invite', shareInvite);
    bindInviteButton('btn-pending-copy-invite', copyInviteCode);
    bindInviteButton('btn-pending-share-invite', shareInvite);

    if (settingsInitialized) return;
    settingsInitialized = true;

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (store.theme === 'system') applyTheme('system');
    });

    const btnOpen = document.getElementById('btn-open-theme-modal');
    const themeBtns = document.querySelectorAll('.btn-theme-option');

    const openModal = () => {
        openSheet('theme-bottom-sheet');
        themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme-value') === store.theme);
        });
    };

    const closeModal = () => {
        closeSheet('theme-bottom-sheet');
    };

    btnOpen?.addEventListener('click', openModal);

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newTheme = btn.getAttribute('data-theme-value');
            store.setTheme(newTheme);
            applyTheme(newTheme);
            closeModal();
        });
    });

    document.getElementById('btn-logout-app')?.addEventListener('click', () => {
        openConfirmSheet({
            title: 'Sair do Nook?',
            message: 'Você precisará entrar novamente para acessar o espaço do casal.',
            confirmLabel: 'Sair',
            onConfirm: () => store.logout()
        });
    });
};