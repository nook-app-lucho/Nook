import { store } from './store.js';
import { initNavigation } from './modules/navigation.js';
import { initOnboarding } from './modules/onboarding.js';
import { initHome, renderHome } from './modules/home.js';
import { initLists, renderLists } from './modules/lists.js';
import { initAgenda, renderAgendaView } from './modules/agenda.js';
import { initGoals, renderGoals } from './modules/goals.js';
import { initFinances, renderFinances } from './modules/finances.js';
import { initSettings } from './modules/settings.js';
import { triggerHaptic } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const views = document.querySelectorAll('.view');
    const bottomBar = document.querySelector('.bottom-bar');

    const showView = (viewId, hideNav = false) => {
        views.forEach(v => v.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');
        if (hideNav) {
            bottomBar?.classList.add('hidden');
        } else {
            bottomBar?.classList.remove('hidden');
        }
    };

    window.addEventListener('nook:data-updated', () => {
        if (document.getElementById('view-home').classList.contains('active')) renderHome();
        if (document.getElementById('view-lists').classList.contains('active')) renderLists();
        if (document.getElementById('view-finances').classList.contains('active')) renderFinances();
        if (document.getElementById('view-agenda').classList.contains('active')) renderAgendaView();
        if (document.getElementById('view-goals').classList.contains('active')) renderGoals();
    });

    let isSignUpMode = false;
    const loginForm = document.getElementById('form-login');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authSubmitBtn = document.getElementById('btn-auth-submit');
    const toggleBtn = document.getElementById('btn-toggle-auth');
    const errEl = document.getElementById('login-error');

    toggleBtn?.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        if (errEl) errEl.classList.add('d-none');
        if (isSignUpMode) {
            if (authSubtitle) authSubtitle.textContent = 'Crie sua conta para começar.';
            if (authSubmitBtn) authSubmitBtn.textContent = 'Criar Minha Conta';
            if (toggleBtn) toggleBtn.textContent = 'Já tem uma conta? Fazer Login';
        } else {
            if (authSubtitle) authSubtitle.textContent = 'Entre para acessar o espaço do casal.';
            if (authSubmitBtn) authSubmitBtn.textContent = 'Entrar no Nook';
            if (toggleBtn) toggleBtn.textContent = 'Não tem conta? Criar conta nova';
        }
    });

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        try {
            if (errEl) errEl.classList.add('d-none');
            if (authSubmitBtn) {
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = isSignUpMode ? 'Criando conta...' : 'Entrando...';
            }
            if (isSignUpMode) {
                await store.signUp(email, password);
            } else {
                await store.login(email, password);
            }
            await routeApp();
        } catch (err) {
            if (errEl) {
                errEl.textContent = err.message || (isSignUpMode ? 'Erro ao criar conta.' : 'E-mail ou senha incorretos.');
                errEl.classList.remove('d-none');
            }
        } finally {
            if (authSubmitBtn) {
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = isSignUpMode ? 'Criar Minha Conta' : 'Entrar no Nook';
            }
        }
    });

    document.getElementById('btn-create-nook')?.addEventListener('click', async () => {
        triggerHaptic(20);
        await store.createNewNook();
        await routeApp();
    });

    document.getElementById('btn-join-nook')?.addEventListener('click', async () => {
        triggerHaptic(20);
        const inputEl = document.getElementById('input-invite-code');
        const code = inputEl ? inputEl.value.trim().toUpperCase() : '';
        const joinErrEl = document.getElementById('join-error');
        try {
            if (joinErrEl) joinErrEl.classList.add('d-none');
            await store.joinNook(code);
            await routeApp();
        } catch (e) {
            if (joinErrEl) { joinErrEl.textContent = e.message; joinErrEl.classList.remove('d-none'); }
        }
    });

    document.getElementById('btn-join-logout')?.addEventListener('click', () => { triggerHaptic(10); store.logout(); });
    document.getElementById('btn-pending-logout')?.addEventListener('click', () => { store.logout(); });

    let modulesInited = false;
    const routeApp = async () => {
        const session = await store.checkSession();
        if (!session) { showView('view-login', true); return; }

        if (typeof store.fetchProfile === 'function') await store.fetchProfile();
        else await store.init();

        if (!store.currentCoupleId) {
            showView('view-join', true);
        } else if (store.profile && store.profile.approved === false) {
            showView('view-pending-approval', true);
        } else if (!store.profile || !store.profile.p1) {
            showView('view-onboarding', true);
        } else {
            showView('view-home', false);
            renderHome();
        }

        if (!modulesInited && session && store.currentCoupleId) {
            initNavigation(); initOnboarding(); initHome(); initLists();
            initAgenda(); initGoals(); initFinances(); initSettings();
            modulesInited = true;
        }

        if (store.profile && store.profile.inviteCode) {
            const inviteDisplay = document.getElementById('setting-invite-code');
            if (inviteDisplay) inviteDisplay.textContent = store.profile.inviteCode;
        }

        if (store.currentCoupleId && typeof store.fetchProfile === 'function') {
            store.init().then(() => {
                window.dispatchEvent(new CustomEvent('nook:data-updated'));
            }).catch(err => console.error("Aviso: Falha ao carregar dados em segundo plano", err));
        }
    };

    await routeApp();
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn(err)));
    }
});