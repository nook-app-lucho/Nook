import { store } from './store.js';

export const triggerHaptic = (ms = 15) => {
    if (window.navigator && window.navigator.vibrate) { window.navigator.vibrate(ms); }
};

export const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.trim().slice(0, 2).toUpperCase();
};

export const formatCurrency = (val) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const getLocalDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const escapeHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
};

export const getAvatarHtml = (ownerId, size = '28px') => {
    const profile = store.profile || {};
    if (ownerId === 'Casal') {
        return `<div class="task-badge bg-casal" style="width: ${size}; height: ${size}; margin-left: 0;">NÓS</div>`;
    }
    const isP1 = ownerId === 'IS' || ownerId === 'p1' || ownerId === profile.p1;
    const name = isP1 ? (profile.p1 || 'P1') : (profile.p2 || 'P2');
    const avatarData = isP1 ? profile.avatarP1 : profile.avatarP2;
    const initials = getInitials(name);
    const baseClass = isP1 ? 'my-avatar' : 'partner-avatar';

    if (avatarData && avatarData.startsWith('data:image')) {
        return `<div class="task-badge has-photo ${baseClass}" style="width: ${size}; height: ${size}; background-image: url('${avatarData}'); margin-left: 0;"></div>`;
    } else if (avatarData) {
        return `<div class="task-badge ${baseClass}" style="width: ${size}; height: ${size}; font-size: 0.95rem; line-height: 1; margin-left: 0; display: flex; align-items: center; justify-content: center;">${avatarData}</div>`;
    } else {
        return `<div class="task-badge ${baseClass}" style="width: ${size}; height: ${size}; margin-left: 0;">${initials}</div>`;
    }
};

export const hasUnsavedChanges = () => {
    const activeBottomSheet = document.querySelector('.bottom-sheet.active');
    if (!activeBottomSheet) return false;
    
    const inputs = activeBottomSheet.querySelectorAll('input:not([type="hidden"]), select, textarea');
    for (const input of inputs) {
        const currentVal = input.type === 'checkbox' ? String(input.checked) : input.value;
        const originalVal = input.dataset.originalValue || (input.type === 'checkbox' ? 'false' : '');
        
        if (currentVal !== originalVal) return true;
    }
    return false;
};

export const openModal = (modalId) => {
    triggerHaptic(10);
    const modal = document.getElementById(modalId);
    if (modal) {
        // Tira uma "fotografia" do estado de cada campo na abertura do modal
        const inputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');
        inputs.forEach(input => {
            input.dataset.originalValue = input.type === 'checkbox' ? String(input.checked) : input.value;
        });
    }
    document.getElementById('general-overlay')?.classList.add('active');
    modal?.classList.add('active');
};

export const closeAllModals = (force = false) => {
    if (force !== true && hasUnsavedChanges()) {
        const confirmar = window.confirm("Você tem alterações não salvas. Deseja descartar os dados?");
        if (!confirmar) return;
    }
    document.getElementById('general-overlay')?.classList.remove('active');
    document.querySelectorAll('.bottom-sheet').forEach(sheet => sheet.classList.remove('active'));
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
    toast.innerHTML = `<i class="ph-fill ${icon} text-primary" style="font-size: 1.2rem;"></i> <span>${escapeHTML(message)}</span>`;
    
    // Força o "reflow" para a animação funcionar
    void toast.offsetWidth; 
    toast.classList.add('show');
    triggerHaptic(10);
    
    // Remove depois de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};