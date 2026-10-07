import { store } from './store.js';
import { localDate } from './rules.js';

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
    const safeSize = /^\d+(px|rem)$/.test(size) ? size : '28px';
    if (ownerId === 'Casal') return `<div class="task-badge bg-casal" style="width:${safeSize};height:${safeSize};margin-left:0">NÓS</div>`;
    const profile = store.profile || {};
    const isP1 = ['IS', 'p1', profile.p1].includes(ownerId);
    const name = isP1 ? profile.p1 || 'P1' : profile.p2 || 'P2';
    const avatar = isP1 ? profile.avatarP1 : profile.avatarP2;
    const photo = safeImageUrl(avatar);
    const cls = isP1 ? 'my-avatar' : 'partner-avatar';
    return photo
        ? `<div class="task-badge has-photo ${cls}" style="width:${safeSize};height:${safeSize};margin-left:0;background-image:${escapeHTML(imageBackground(photo))}"></div>`
        : `<div class="task-badge ${cls}" style="width:${safeSize};height:${safeSize};margin-left:0">${escapeHTML(avatar || getInitials(name))}</div>`;
};

const busy = new WeakSet();
export const runAction = async (element, work) => {
    if (element && busy.has(element)) return false;
    if (element) { busy.add(element); element.dataset.saving = 'true'; element.setAttribute('aria-busy', 'true'); }
    const buttons = element?.querySelectorAll('button[type="submit"]') || [];
    const previous = [...buttons].map(button => button.disabled);
    buttons.forEach(button => button.disabled = true);
    if (element?.tagName === 'BUTTON') element.disabled = true;
    try { await work(); return true; }
    catch (error) { showToast(error?.message || 'Não foi possível concluir. Seus dados não foram confirmados. Tente novamente.', 'ph-warning-circle'); return false; }
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

const activeSheets = () => [...document.querySelectorAll('.bottom-sheet')].filter(sheet => sheet.classList.contains('active'));
const dirtySheet = sheet => [...sheet.querySelectorAll('input:not([type="hidden"]), select, textarea')].some(input => (input.type === 'checkbox' ? String(input.checked) : input.value) !== (input.dataset.originalValue ?? (input.type === 'checkbox' ? 'false' : '')));
export const hasUnsavedChanges = () => activeSheets().some(dirtySheet);
const mayClose = (sheets, force) => {
    if (force === true) return true;
    if (document.querySelector('[data-saving="true"]')) { showToast('Aguarde a gravação terminar.'); return false; }
    return !sheets.some(dirtySheet) || window.confirm('Você tem alterações não salvas. Deseja descartar os dados?');
};
const syncOverlay = () => document.getElementById('general-overlay')?.classList.toggle('active', activeSheets().length > 0);
export const openModal = modalId => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    initModalController(); triggerHaptic(10);
    modal.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(input => { input.dataset.originalValue = input.type === 'checkbox' ? String(input.checked) : input.value; });
    modal.classList.add('active'); syncOverlay();
};
export const closeModal = (modalId, force = false) => {
    const modal = document.getElementById(modalId);
    if (!modal || !modal.classList.contains('active')) return true;
    if (!mayClose([modal], force)) return false;
    modal.classList.remove('active'); syncOverlay(); return true;
};
export const closeAllModals = (force = false) => {
    const sheets = activeSheets();
    if (!mayClose(sheets, force)) return false;
    sheets.forEach(sheet => sheet.classList.remove('active')); syncOverlay(); return true;
};
export const initModalController = () => {
    const overlay = document.getElementById('general-overlay');
    if (overlay && !overlay.dataset.modalController) {
        overlay.dataset.modalController = 'true'; overlay.addEventListener('click', () => closeAllModals());
        document.addEventListener('keydown', event => { if (event.key === 'Escape' && activeSheets().length) closeAllModals(); });
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
    toast.innerHTML = `<i class="ph-fill ${escapeHTML(icon)} text-primary" style="font-size: 1.2rem;"></i> <span>${escapeHTML(message)}</span>`;
    
    // Força o "reflow" para a animação funcionar
    void toast.offsetWidth; 
    toast.classList.add('show');
    triggerHaptic(10);
    
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