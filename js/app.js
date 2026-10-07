import { store } from './store.js';
import { initNavigation, renderActiveView } from './modules/navigation.js';
import { initOnboarding, updateProfileUI } from './modules/onboarding.js';
import { initHome } from './modules/home.js';
import { initLists } from './modules/lists.js';
import { initAgenda } from './modules/agenda.js';
import { initGoals } from './modules/goals.js';
import { initFinances } from './modules/finances.js';
import { initSettings } from './modules/settings.js';
import { runAction, showToast } from './utils.js';

// Independe da duração da consulta de sessão e de um evento load futuro.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
        console.warn('Não foi possível ativar os recursos de instalação/offline.');
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    let initialized = false, signUp = false, routing = false;
    const views = document.querySelectorAll('.view');
    const bar = document.querySelector('.bottom-bar');
    const showView = (id, hideNav = true) => {
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        bar?.classList.toggle('hidden', hideNav);
        if (!hideNav) document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.getAttribute('data-target') === id));
    };
    const routeApp = async () => {
        if (routing) return;
        routing = true;
        const loading = document.getElementById('app-status');
        const retry = document.getElementById('btn-retry-load');
        retry?.classList.add('d-none');
        if (loading) { loading.textContent = 'Carregando seu espaço…'; loading.classList.remove('d-none'); }
        try {
            const session = await store.checkSession();
            if (!session) { showView('view-login'); return; }
            await store.fetchProfile();
            if (!store.currentCoupleId) { showView('view-join'); return; }
            if (store.profile?.approved !== true) { showView('view-pending-approval'); return; }
            await store.init();
            if (!initialized) {
                initOnboarding(); initHome(); initLists(); initAgenda(); initGoals(); initFinances(); initSettings(); initNavigation();
                initialized = true;
            }
            const complete = store.profile?.p1 && store.profile?.p2 && store.profile?.startDate;
            showView(complete ? 'view-home' : 'view-onboarding', !complete);
            updateProfileUI(); renderActiveView();
            const invite = document.getElementById('setting-invite-code'); if (invite) invite.textContent = store.profile.inviteCode || '---';
        } catch (error) {
            // Falha de carregamento não deve ser confundida com coleções vazias.
            showToast(error.message || 'Não foi possível carregar o espaço.');
            retry?.classList.remove('d-none');
            if (loading) { loading.textContent = 'Não foi possível carregar. Use “Tentar novamente”.'; loading.classList.remove('d-none'); }
            throw error;
        } finally {
            routing = false;
            if (loading?.textContent === 'Carregando seu espaço…') loading.classList.add('d-none');
        }
    };
    window.addEventListener('nook:data-updated', () => {
        if (store.profile?.approved !== true && store.currentCoupleId) { showView('view-pending-approval'); return; }
        updateProfileUI(); renderActiveView();
    });
    window.addEventListener('nook:profile-saved', () => { routeApp().catch(() => {}); });
    window.addEventListener('nook:sync-error', () => showToast('A sincronização falhou. Tente carregar novamente antes de alterar os dados.'));
    const refresh = e => runAction(e.currentTarget, routeApp);
    document.getElementById('btn-retry-load')?.addEventListener('click', refresh);
    document.getElementById('btn-check-approval')?.addEventListener('click', refresh);
    document.getElementById('btn-toggle-auth')?.addEventListener('click', () => {
        signUp = !signUp;
        document.getElementById('auth-subtitle').textContent = signUp ? 'Crie sua conta para começar.' : 'Entre para acessar o espaço do casal.';
        document.getElementById('btn-auth-submit').textContent = signUp ? 'Criar Minha Conta' : 'Entrar no Nook';
        document.getElementById('btn-toggle-auth').textContent = signUp ? 'Já tem uma conta? Fazer Login' : 'Não tem conta? Criar conta nova';
    });
    document.getElementById('form-login')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            document.getElementById('login-error')?.classList.add('d-none');
            if (signUp) {
                const result = await store.signUp(email, password);
                if (!result.session) { showToast('Conta criada. Verifique seu email para confirmar o cadastro e depois entre.'); return; }
            } else await store.login(email, password);
            await routeApp();
        });
    });
    document.getElementById('btn-create-nook')?.addEventListener('click', e => runAction(e.currentTarget, async () => { await store.createNewNook(); await routeApp(); }));
    document.getElementById('btn-join-nook')?.addEventListener('click', e => runAction(e.currentTarget, async () => { await store.joinNook(document.getElementById('input-invite-code').value); await routeApp(); }));
    for (const id of ['btn-join-logout', 'btn-pending-logout']) document.getElementById(id)?.addEventListener('click', e => runAction(e.currentTarget, () => store.logout()));
    await runAction(null, routeApp);
});