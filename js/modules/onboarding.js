import { store } from '../store.js'; 
import { triggerHaptic, getInitials } from '../utils.js'; 
import { renderFinances } from './finances.js'; 
import { renderHome } from './home.js'; 

let tempAvatarP1 = null; 
let tempAvatarP2 = null; 
let currentTargetPerson = null; 

const EMOJI_LIST = ['🥰', '❤️', '😊', '😍', '🥳', '😎', '😴', '🙈', '🐱', '🐶', '👑', '✨', '🔥', '🥐', '☕', '🍕', '🍟', '🍷', '🍻', '🥑'];

export const renderAvatar = (elements, name, avatarData) => {
    elements.forEach(el => {
        if (!el) return;
        if (avatarData && avatarData.startsWith('data:image')) {
            el.textContent = '';
            el.style.backgroundImage = `url(${avatarData})`;
            el.classList.add('has-photo');
        } else if (avatarData) {
            el.textContent = avatarData;
            el.style.backgroundImage = 'none';
            el.classList.remove('has-photo');
        } else {
            el.textContent = getInitials(name);
            el.style.backgroundImage = 'none';
            el.classList.remove('has-photo');
        }
    });
};

export const updateProfileUI = () => {
    if (!store.profile) return;
    const p1 = store.profile.p1;
    const p2 = store.profile.p2;
    renderAvatar(document.querySelectorAll('.my-avatar'), p1, store.profile.avatarP1);
    renderAvatar(document.querySelectorAll('.partner-avatar'), p2, store.profile.avatarP2);
    
    document.querySelectorAll('option[value="IS"]').forEach(opt => opt.textContent = p1);
    document.querySelectorAll('option[value="VO"]').forEach(opt => opt.textContent = p2);
    
    const opt100P1 = document.getElementById('opt-100-p1');
    const opt100P2 = document.getElementById('opt-100-p2');
    if (opt100P1) opt100P1.textContent = `100% pago por ${p1}`;
    if (opt100P2) opt100P2.textContent = `100% pago por ${p2}`;
    
    const lblIncP1 = document.getElementById('label-fin-inc-p1');
    const lblIncP2 = document.getElementById('label-fin-inc-p2');
    if (lblIncP1) lblIncP1.textContent = `Renda de ${p1} (R$)`;
    if (lblIncP2) lblIncP2.textContent = `Renda de ${p2} (R$)`;
    
    const propLabelIs = document.getElementById('prop-label-is');
    const propLabelVo = document.getElementById('prop-label-vo');
    if (propLabelIs) propLabelIs.textContent = `${p1}: `;
    if (propLabelVo) propLabelVo.textContent = `${p2}: `;
};

const processImageFile = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 150;
            let width = img.width;
            let height = img.height;
            if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
            else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

const initEmojiPicker = () => {
    const overlay = document.getElementById('general-overlay');
    const sheet = document.getElementById('emoji-picker-sheet');
    const grid = document.getElementById('emoji-grid');
    const btnClose = document.getElementById('btn-close-emoji-picker');
    
    if (grid && grid.children.length === 0) {
        EMOJI_LIST.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-btn';
            btn.textContent = emoji;
            btn.addEventListener('click', () => {
                triggerHaptic(20);
                const inputName = document.getElementById(`onboarding-${currentTargetPerson}`);
                const preview = document.getElementById(`preview-${currentTargetPerson}`);
                
                if(currentTargetPerson === 'p1') tempAvatarP1 = emoji; else tempAvatarP2 = emoji;
                renderAvatar([preview], inputName?.value || '', emoji);
                closeEmojiPicker();
            });
            grid.appendChild(btn);
        });
    }
    const closeEmojiPicker = () => { 
        overlay?.classList.remove('active'); 
        sheet?.classList.remove('active'); 
        currentTargetPerson = null; 
    };
    btnClose?.addEventListener('click', closeEmojiPicker);
    overlay?.addEventListener('click', closeEmojiPicker);
};

export const openEmojiPicker = (personId) => {
    currentTargetPerson = personId;
    triggerHaptic(10);
    document.getElementById('general-overlay')?.classList.add('active');
    document.getElementById('emoji-picker-sheet')?.classList.add('active');
};

const setupAvatarPicker = (personId) => {
    const btnFoto = document.getElementById(`btn-foto-${personId}`);
    const btnEmoji = document.getElementById(`btn-emoji-${personId}`);
    const fileInput = document.getElementById(`file-${personId}`);
    const preview = document.getElementById(`preview-${personId}`);
    const inputName = document.getElementById(`onboarding-${personId}`);
    
    inputName?.addEventListener('input', (e) => {
        const val = e.target.value;
        const currentAvatar = personId === 'p1' ? tempAvatarP1 : tempAvatarP2;
        if (!currentAvatar) renderAvatar([preview], val, null);
    });
    btnFoto?.addEventListener('click', () => fileInput?.click());
    btnEmoji?.addEventListener('click', () => openEmojiPicker(personId));
    fileInput?.addEventListener('change', (e) => {
        processImageFile(e.target.files[0], (base64) => {
            if(personId === 'p1') tempAvatarP1 = base64; else tempAvatarP2 = base64;
            renderAvatar([preview], inputName?.value || '', base64);
            triggerHaptic(20);
        });
    });
};

export const initOnboarding = () => {
    const onboardingView = document.getElementById('view-onboarding');
    const homeView = document.getElementById('view-home');
    const bottomBar = document.querySelector('.bottom-bar');
    const formOnboarding = document.getElementById('form-onboarding');
    const btnReopen = document.getElementById('btn-reopen-onboarding');
    const views = document.querySelectorAll('.view');
    
    const isProfileValid = store.profile?.p1 && store.profile?.p2 && store.profile?.startDate;
    initEmojiPicker(); 
    setupAvatarPicker('p1'); 
    setupAvatarPicker('p2');
    
// --- PREVENÇÃO DE ERROS: Bloqueia datas futuras no calendário ---
    const dateInput = document.getElementById('onboarding-date');
    if (dateInput) {
        // Pega a data de hoje no fuso local e formata como YYYY-MM-DD
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.setAttribute('max', `${yyyy}-${mm}-${dd}`);
    }

    if (store.currentCoupleId) {
        views.forEach(v => v.classList.remove('active'));
        if (!isProfileValid) {
            if (onboardingView) onboardingView.classList.add('active');
            if (bottomBar) bottomBar.classList.add('hidden');
        } else {
            if (homeView) homeView.classList.add('active');
            if (bottomBar) bottomBar.classList.remove('hidden');
            updateProfileUI(); 
            renderHome();
        }
    }
    
    if (formOnboarding) {
        formOnboarding.addEventListener('submit', (e) => {
            e.preventDefault();
            const p1 = document.getElementById('onboarding-p1').value.trim();
            const p2 = document.getElementById('onboarding-p2').value.trim();
            const startDate = document.getElementById('onboarding-date').value;
            if (!p1 || !p2 || !startDate) return;
            store.setProfile({ p1, p2, startDate, avatarP1: tempAvatarP1, avatarP2: tempAvatarP2 });
            triggerHaptic(30);
            views.forEach(v => v.classList.remove('active'));
            if (homeView) homeView.classList.add('active');
            if (bottomBar) bottomBar.classList.remove('hidden');
            updateProfileUI(); 
            renderFinances(); 
            renderHome();
        });
    }
    
    if (btnReopen) {
        btnReopen.addEventListener('click', () => {
            triggerHaptic(10);
            if (store.profile) {
                document.getElementById('onboarding-p1').value = store.profile.p1;
                document.getElementById('onboarding-p2').value = store.profile.p2;
                document.getElementById('onboarding-date').value = store.profile.startDate;
                tempAvatarP1 = store.profile.avatarP1 || null; 
                tempAvatarP2 = store.profile.avatarP2 || null;
                renderAvatar([document.getElementById('preview-p1')], store.profile.p1, tempAvatarP1);
                renderAvatar([document.getElementById('preview-p2')], store.profile.p2, tempAvatarP2);
            }
            views.forEach(v => v.classList.remove('active'));
            if (onboardingView) onboardingView.classList.add('active');
            if (bottomBar) bottomBar.classList.add('hidden');
        });
    }
};