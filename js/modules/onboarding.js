import { store } from '../store.js'; 
import { triggerHaptic, getInitials, runAction, validateImageFile, imageBackground, openModal, closeModal, initModalController } from '../utils.js'; 
import { renderFinances } from './finances.js'; 
import { renderHome } from './home.js'; 

let tempAvatarP1 = null; 
let tempAvatarP2 = null; 
let currentTargetPerson = null;
let uploadsPending = 0; 

const EMOJI_LIST = [
    // 🐶 Animais e Bichinhos
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', 
    '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🐧', '🐤', '🦆', 
    '🦉', '🦄', '🐝', '🦋', '🐢', '🐙', '🐬', '🦥', '🦦', '🦩',

    // 🥰 Expressões e Vibes
    '🥰', '😊', '😍', '🤩', '🥳', '😎', '🤪', '😴', '😇', '🥹', 
    '🤗', '🫠', '🤖', '👻', '👑', '👒', '🧢',

    // ❤️ Amor e Símbolos
    '❤️', '💖', '💕', '💓', '💘', '✨', '🔥', '🌈', '🌸', '🌺', 
    '🍀', '☀️', '🌙', '🪐', '🎨', '🎧', '⚽',

    // ☕ Comidas e Bebidas
    '🥐', '☕', '🍕', '🍟', '🍷', '🍻', '🥑', '🍔', '🌮', '🍣', 
    '🍩', '🍦', '🧋', '🍓', '🍎', '🍉', '🍾'
];

export const renderAvatar = (elements, name, avatarData) => {
    const photoUrl = store.getPhotoDisplayUrl(avatarData);
    elements.forEach(el => {
        if (!el) return;
        if (photoUrl) {
            el.textContent = '';
            el.style.backgroundImage = imageBackground(photoUrl);
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

const processImageFile = async (file, personId) => {
    if (!file) return null;
    validateImageFile(file);
    return store.uploadPhoto('avatars', file, { prefix: `avatar-${personId}` });
};

const initEmojiPicker = () => {
    initModalController();
    const sheet = document.getElementById('emoji-picker-sheet');
    const grid = document.getElementById('emoji-grid');
    const btnClose = document.getElementById('btn-close-emoji-picker');
    
    if (grid && grid.children.length === 0) {
        EMOJI_LIST.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-btn';
            btn.textContent = emoji;
            btn.addEventListener('click', () => {
                const inputName = document.getElementById(`onboarding-${currentTargetPerson}`);
                const preview = document.getElementById(`preview-${currentTargetPerson}`);
                const previousTemp = currentTargetPerson === 'p1' ? tempAvatarP1 : tempAvatarP2;
                const persisted = currentTargetPerson === 'p1' ? store.profile?.avatarP1 : store.profile?.avatarP2;

                if (previousTemp && previousTemp !== persisted) store.deletePhoto(previousTemp).catch(() => {});
                if(currentTargetPerson === 'p1') tempAvatarP1 = emoji; else tempAvatarP2 = emoji;
                renderAvatar([preview], inputName?.value || '', emoji);
                closeEmojiPicker();
            });
            grid.appendChild(btn);
        });
    }
    const closeEmojiPicker = () => { 
        if (closeModal('emoji-picker-sheet')) currentTargetPerson = null; 
    };
    btnClose?.addEventListener('click', closeEmojiPicker);

};

export const openEmojiPicker = (personId) => {
    currentTargetPerson = personId;
    openModal('emoji-picker-sheet');
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
    
    fileInput?.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        await runAction(fileInput, async () => {
            uploadsPending++;
            try {
                const previousTemp = personId === 'p1' ? tempAvatarP1 : tempAvatarP2;
                const persisted = personId === 'p1' ? store.profile?.avatarP1 : store.profile?.avatarP2;
                const path = await processImageFile(file, personId);
                if (personId === 'p1') tempAvatarP1 = path; else tempAvatarP2 = path;
                renderAvatar([preview], inputName?.value || '', path);
                if (previousTemp && previousTemp !== persisted) store.deletePhoto(previousTemp).catch(() => {});
            } finally { uploadsPending--; }
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
    
    tempAvatarP1 = store.profile?.avatarP1 || null; tempAvatarP2 = store.profile?.avatarP2 || null;
    const isProfileValid = store.profile?.p1 && store.profile?.p2 && store.profile?.startDate;
    initEmojiPicker(); 
    setupAvatarPicker('p1'); 
    setupAvatarPicker('p2');
    
    // --- PREVENÇÃO DE ERROS: Bloqueia datas futuras no calendário ---
    const dateInput = document.getElementById('onboarding-date');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.setAttribute('max', `${yyyy}-${mm}-${dd}`);
    }

    if (isProfileValid) updateProfileUI();

    if (formOnboarding) {
        formOnboarding.addEventListener('submit', async e => {
            e.preventDefault(); const form = e.currentTarget;
            await runAction(form, async () => {
                if (uploadsPending) throw new Error('Aguarde o envio das fotos terminar.');
                await store.setProfile({ p1: document.getElementById('onboarding-p1').value.trim(), p2: document.getElementById('onboarding-p2').value.trim(), startDate: document.getElementById('onboarding-date').value, avatarP1: tempAvatarP1, avatarP2: tempAvatarP2 });
                triggerHaptic(30); updateProfileUI(); renderFinances(); renderHome();
                window.dispatchEvent(new CustomEvent('nook:profile-saved'));
            });
        });
    }

    if (btnReopen) {
        btnReopen.addEventListener('click', () => {
            if (store.profile?.approved !== true) return;
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