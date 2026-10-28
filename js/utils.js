import { store } from './store.js';
import { OWNER, localDate } from './rules.js';

export const triggerHaptic = (ms = 15) => {
    if (window.navigator && window.navigator.vibrate) { window.navigator.vibrate(ms); }
};

export const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.trim().slice(0, 2).toUpperCase();
};

export const formatCurrency = value => {
    if (value == null || !Number.isFinite(Number(value))) return 'Valor inválido';
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
export const getLocalDateString = localDate;
export const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
export const safeImageUrl = value => {
    if (typeof value !== 'string') return '';
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value)) return value;
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
};
export const imageBackground = value => {
    const safe = safeImageUrl(value);
    return safe ? `url(${JSON.stringify(safe)})` : 'none';
};
export const getAvatarHtml = (ownerId, size = '28px') => {
    const sizeClass = size === '24px' ? 'task-badge--compact' : 'task-badge--regular';
    if (ownerId === OWNER.COUPLE) return `<div class="task-badge task-badge--inline ${sizeClass} bg-casal">NÓS</div>`;
    const profile = store.profile || {};
    const isP1 = [OWNER.P1, 'p1', profile.p1].includes(ownerId);
    const name = isP1 ? profile.p1 || 'P1' : profile.p2 || 'P2';
    const avatar = isP1 ? profile.avatarP1 : profile.avatarP2;
    const photo = safeImageUrl(store.getPhotoDisplayUrl(avatar));
    const cls = isP1 ? 'my-avatar' : 'partner-avatar';
    return photo
        ? `<div class="task-badge task-badge--inline ${sizeClass} has-photo ${cls}"><img class="task-badge-photo" src="${escapeHTML(photo)}" alt=""></div>`
        : `<div class="task-badge task-badge--inline ${sizeClass} ${cls}">${escapeHTML(avatar || getInitials(name))}</div>`;
};

const busy = new WeakSet();
export const humanizeError = (error, fallback = 'Não foi possível concluir. Tente novamente.') => {
    const message = String(error?.message || '').trim();
    const lower = message.toLowerCase();

    if (error?.code === 'FINANCE_CONFLICT') {
        return message || 'As configurações financeiras mudaram em outro dispositivo. Atualizamos os dados para você.';
    }
    if (error?.code === 'EDIT_CONFLICT' || lower.includes('mudou desde que você abriu')) {
        return 'Essa alteração entrou em conflito com outra atualização. Reabra e tente novamente.';
    }
    if (lower.includes('row-level security') || lower.includes('permission denied') || lower.includes('jwt') || lower.includes('not authenticated')) {
        return 'Sua sessão pode ter expirado. Entre novamente e tente de novo.';
    }
    if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('networkerror') || lower.includes('load failed')) {
        return 'Sem conexão com o Nook. Verifique sua internet e tente novamente.';
    }
    if (lower.includes('duplicate key') || lower.includes('violates') || lower.includes('pgrst') || lower.includes('postgres') || lower.includes('supabase')) {
        return fallback;
    }
    return message && message.length <= 220 ? message : fallback;
};

export const runAction = async (element, work) => {
    if (element && busy.has(element)) return false;
    if (element) { busy.add(element); element.dataset.saving = 'true'; element.setAttribute('aria-busy', 'true'); }
    const buttons = element?.querySelectorAll('button[type="submit"]') || [];
    const previous = [...buttons].map(button => button.disabled);
    buttons.forEach(button => button.disabled = true);
    if (element?.tagName === 'BUTTON') element.disabled = true;
    try { await work(); return true; }
    catch (error) { console.error(error); showToast(humanizeError(error, 'Não foi possível concluir. Seus dados não foram confirmados. Tente novamente.'), 'ph-warning-circle'); return false; }
    finally {
        buttons.forEach((button, index) => button.disabled = previous[index]);
        if (element) { busy.delete(element); delete element.dataset.saving; element.setAttribute('aria-busy', 'false'); if (element.tagName === 'BUTTON') element.disabled = false; }
    }
};
export const validateImageFile = file => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG, WebP ou GIF.');
    if (file.size > 8 * 1024 * 1024) throw new Error('A foto deve ter no máximo 8 MB.');
    return file;
};

let confirmSheetAction = null;

const activeSheets = () => [...document.querySelectorAll('.bottom-sheet')].filter(sheet => sheet.classList.contains('active'));
const dirtySheet = sheet => sheet.dataset.silentDiscard !== 'true' && [...sheet.querySelectorAll('input:not([type="hidden"]), select, textarea')].some(input => (input.type === 'checkbox' ? String(input.checked) : input.value) !== (input.dataset.originalValue ?? (input.type === 'checkbox' ? 'false' : '')));
export const hasUnsavedChanges = () => activeSheets().some(dirtySheet);
const syncOverlay = () => document.getElementById('general-overlay')?.classList.toggle('active', activeSheets().length > 0);
const closeSheets = (sheets, onConfirmed) => {
    sheets.forEach(sheet => sheet.classList.remove('active'));
    syncOverlay();
    if (typeof onConfirmed === 'function') onConfirmed();
};
const requestClose = (sheets, force, onConfirmed) => {
    if (force === true) { closeSheets(sheets, onConfirmed); return true; }
    if (document.querySelector('[data-saving="true"]')) { showToast('Aguarde a gravação terminar.'); return false; }
    if (!sheets.some(dirtySheet)) { closeSheets(sheets, onConfirmed); return true; }

    openConfirmSheet({
        title: 'Descartar alterações?',
        message: 'Você tem alterações não salvas. Se continuar, elas serão perdidas.',
        confirmLabel: 'Descartar',
        keepOpen: true,
        onConfirm: async () => closeSheets(sheets, onConfirmed)
    });
    return false;
};
export const openModal = modalId => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    initModalController();
    modal.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(input => { input.dataset.originalValue = input.type === 'checkbox' ? String(input.checked) : input.value; });
    modal.classList.add('active'); syncOverlay();
    if (window.matchMedia?.('(pointer: fine)')?.matches) {
        requestAnimationFrame(() => modal.querySelector('[data-autofocus]')?.focus());
    }
};
export const closeModal = (modalId, force = false, onConfirmed = null) => {
    const modal = document.getElementById(modalId);
    if (!modal || !modal.classList.contains('active')) {
        if (typeof onConfirmed === 'function') onConfirmed();
        return true;
    }
    const closed = requestClose([modal], force, onConfirmed);
    if (closed && modalId === 'confirm-action-bottom-sheet') {
        confirmSheetAction = null;
        document.body.classList.remove('confirm-over-sheet');
    }
    return closed;
};
export const closeAllModals = (force = false, onConfirmed = null) => requestClose(activeSheets(), force, onConfirmed);
export const openConfirmSheet = ({ title, message, confirmLabel = 'Excluir', onConfirm, keepOpen = false }) => {
    if (typeof onConfirm !== 'function') throw new Error('A confirmação precisa de uma ação válida.');
    const titleEl = document.getElementById('confirm-action-title');
    const messageEl = document.getElementById('confirm-action-message');
    const confirmButton = document.getElementById('btn-confirm-action');
    if (!titleEl || !messageEl || !confirmButton) throw new Error('O modal de confirmação não está disponível.');
    titleEl.textContent = title || 'Confirmar ação';
    messageEl.textContent = message || 'Esta ação não poderá ser desfeita.';
    confirmButton.textContent = confirmLabel;
    confirmSheetAction = onConfirm;
    document.body.classList.toggle('confirm-over-sheet', keepOpen);
    if (!keepOpen) closeAllModals(true);
    openModal('confirm-action-bottom-sheet');
};
export const initModalController = () => {
    const closeTopSheet = () => {
        const confirmSheet = document.getElementById('confirm-action-bottom-sheet');
        if (confirmSheet?.classList.contains('active')) { closeModal('confirm-action-bottom-sheet', true); return; }
        const sheets = activeSheets();
        const top = sheets[sheets.length - 1];
        if (top) closeModal(top.id);
    };

    const overlay = document.getElementById('general-overlay');
    if (overlay && !overlay.dataset.modalController) {
        overlay.dataset.modalController = 'true';
        overlay.addEventListener('click', closeTopSheet);
        document.addEventListener('keydown', event => { if (event.key === 'Escape' && activeSheets().length) closeTopSheet(); });
    }
    const confirmButton = document.getElementById('btn-confirm-action');
    if (confirmButton && !confirmButton.dataset.modalController) {
        confirmButton.dataset.modalController = 'true';
        confirmButton.addEventListener('click', async () => {
            const action = confirmSheetAction;
            if (!action) return;
            const completed = await runAction(confirmButton, action);
            if (completed) {
                confirmSheetAction = null;
                closeModal('confirm-action-bottom-sheet', true);
            }
        });
    }
    document.querySelectorAll('.btn-close-modal').forEach(button => {
        if (button.dataset.modalController) return;
        button.dataset.modalController = 'true';
        button.addEventListener('click', () => { const sheet = button.closest('.bottom-sheet'); if (sheet) closeModal(sheet.id); });
    });
};

export const enableDesktopScroll = (container) => {
    if (!container || container.dataset.desktopScrollEnabled) return;
    container.dataset.desktopScrollEnabled = "true";
    let isDown = false, startX, scrollLeft;
    container.addEventListener('mousedown', (e) => {
        isDown = true;
        container.classList.add('dragging-desktop');
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    container.addEventListener('mouseleave', () => { isDown = false; container.classList.remove('dragging-desktop'); });
    container.addEventListener('mouseup', () => { isDown = false; container.classList.remove('dragging-desktop'); });
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 1.8;
        container.scrollLeft = scrollLeft - walk;
    });
    container.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) { e.preventDefault(); container.scrollLeft += e.deltaY; }
    }, { passive: false });
};

export const showToast = (message, icon = 'ph-check-circle') => {
    let toast = document.getElementById('nook-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'nook-toast';
        document.body.appendChild(toast);
    }
    toast.className = 'toast-notification';
    toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `<i class="ph-fill ${escapeHTML(icon)} text-primary toast-icon"></i> <span>${escapeHTML(message)}</span>`;
    
    // Força o "reflow" para a animação funcionar
    void toast.offsetWidth; 
    toast.classList.add('show');
    // Remove depois de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};
export const editWarning = (id, error = null) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = error?.code === 'EDIT_CONFLICT' ? error.message : '';
    node.classList.toggle('d-none', !node.textContent);
};
export const saveFormEdit = async (context, patch, warningId) => {
    try { return await store.saveEdit(context, patch); }
    catch (error) { editWarning(warningId, error); throw error; }
};