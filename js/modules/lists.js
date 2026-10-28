import { store } from '../store.js';
import { triggerHaptic, escapeHTML, getAvatarHtml, openModal, openConfirmSheet, closeAllModals, enableDesktopScroll, showToast, runAction, editWarning, saveFormEdit } from '../utils.js';
import { OWNER, sameId, nonEmpty, listDisplayName } from '../rules.js';

let itemEditContext = null;
let editingItemId = null;
let activeListId = null;
let draggedItemIndex = null;
let activeFilter = 'all';
let clearCompletedListId = null;
let clearCompletedCount = 0;
const expandedCompletedLists = new Set();

const togglePriority = (current) => {
    if (!current || current === 'none') return 'urgent';
    if (current === 'urgent') return 'casual';
    return 'none';
};

const updateListsSummary = () => {
    const currentList = store.lists.find(list => sameId(list.id, activeListId));
    const count = document.getElementById('metric-lists-count');
    const pending = document.getElementById('metric-pending-count');
    if (count) count.textContent = store.lists.length;
    if (pending) pending.textContent = store.lists.reduce((sum, list) => sum + (list.items || []).filter(item => !item.completed).length, 0);
    if (!currentList) return;

    const filteredItems = activeFilter === 'all' ? currentList.items : currentList.items.filter(item => item.owner === activeFilter);
    const pendingCount = filteredItems.filter(item => !item.completed).length;
    const completedCount = filteredItems.filter(item => item.completed).length;
    const sectionTitle = document.getElementById('lists-section-title');
    const completedTitle = document.getElementById('lists-completed-title');
    if (sectionTitle) sectionTitle.textContent = `PENDENTES (${pendingCount})`;
    if (completedTitle) completedTitle.textContent = `CONCLUÍDAS (${completedCount})`;
};

export const renderAllListsModal = () => {
    const grid = document.getElementById('all-lists-grid');
    const searchInput = document.getElementById('search-all-lists');
    if (!grid) return;
    const query = (searchInput?.value || '').toLowerCase().trim();
    grid.innerHTML = '';
    const filteredLists = (store.lists || []).filter(l => listDisplayName(l).toLowerCase().includes(query));
    if (filteredLists.length === 0) {
        grid.innerHTML = `<div class="empty-state empty-state-grid-full">Nenhuma lista encontrada.</div>`;
        return;
    }
    filteredLists.forEach(list => {
        const itemCount = list.items ? list.items.length : 0;
        const pendingCount = list.items ? list.items.filter(i => !i.completed).length : 0;
        const isDecision = list.type === 'decision';
        const isActive = list.id === activeListId;
        const card = document.createElement('div');
        card.className = `list-card-item ${isActive ? 'active-list' : ''}`;
        card.innerHTML = `
            <div class="list-card-title">
                ${isDecision ? '<i class="ph-bold ph-dice-five text-primary mr-4"></i>' : ''}${escapeHTML(listDisplayName(list))}
            </div>
            <div class="list-card-meta">
                <span>${itemCount} ${itemCount === 1 ? 'item' : 'itens'}</span>
                <strong>${pendingCount} pendente(s)</strong>
            </div>
        `;
        card.addEventListener('click', () => {
            activeListId = list.id;
            renderLists();
            closeAllModals(true);
        });
        grid.appendChild(card);
    });
};

export const applyListFilters = () => {
    const currentList = store.lists.find(list => sameId(list.id, activeListId)) || store.lists[0];
    if (!currentList) return;
    activeListId = currentList.id;

    const headerTitle = document.getElementById('active-list-header-title');
    if (headerTitle) headerTitle.textContent = listDisplayName(currentList);

    const decisionBanner = document.getElementById('decision-roulette-banner');
    if (decisionBanner) {
        decisionBanner.classList.toggle('d-none', currentList.type !== 'decision');
        const decisionTitle = document.getElementById('decision-banner-title');
        if (decisionTitle) decisionTitle.textContent = `Dúvida no ${listDisplayName(currentList)}?`;
    }

    document.querySelectorAll('#lists-tabs-container .tab-pill[data-list-id]').forEach(button => {
        button.classList.toggle('active', button.dataset.listId === activeListId);
        button.classList.toggle('outline', button.dataset.listId !== activeListId);
    });
    document.querySelectorAll('#list-filters-container .tab-pill[data-filter]').forEach(button => {
        button.classList.toggle('active', button.dataset.filter === activeFilter);
        button.classList.toggle('outline', button.dataset.filter !== activeFilter);
    });

    let pendingVisible = 0;
    let completedVisible = 0;
    document.querySelectorAll('#task-list-container .task-item, #completed-task-list-container .task-item').forEach(item => {
        const match = activeFilter === 'all' || item.dataset.owner === activeFilter;
        item.classList.toggle('d-none', !match);
        if (match) {
            if (item.dataset.completed === 'true') completedVisible++;
            else pendingVisible++;
        }
    });

    updateListsSummary();

    const taskContainer = document.getElementById('task-list-container');
    let emptyState = document.getElementById('empty-list-msg');
    if (pendingVisible === 0) {
        if (!emptyState && taskContainer) {
            emptyState = document.createElement('li');
            emptyState.id = 'empty-list-msg';
            emptyState.className = 'empty-state';
            taskContainer.appendChild(emptyState);
        }
        if (emptyState) {
            if (completedVisible > 0) {
                emptyState.textContent = 'Nada pendente por aqui ✓';
            } else if (activeFilter !== 'all') {
                emptyState.textContent = 'Nenhum item para este filtro.';
            } else {
                emptyState.innerHTML = `
                    <div class="empty-state-with-action">
                        <span>Sua lista está vazia.</span>
                        <button type="button" class="btn-primary btn-outline-primary btn-inline-action" id="btn-empty-add-task">Adicionar primeiro item</button>
                    </div>
                `;
                emptyState.querySelector('#btn-empty-add-task')?.addEventListener('click', () => document.getElementById('input-task-text')?.focus());
            }
            emptyState.classList.remove('d-none');
        }
    } else if (emptyState) {
        emptyState.classList.add('d-none');
    }

    const completedSection = document.getElementById('lists-completed-section');
    const completedGroup = document.getElementById('lists-completed-group');
    const completedToggle = document.getElementById('btn-toggle-completed');
    const completedCaret = document.getElementById('lists-completed-caret');
    const expanded = expandedCompletedLists.has(String(activeListId));
    completedSection?.classList.toggle('d-none', completedVisible === 0);
    completedGroup?.classList.toggle('d-none', !expanded || completedVisible === 0);
    if (completedToggle) completedToggle.setAttribute('aria-expanded', String(expanded && completedVisible > 0));
    if (completedCaret) completedCaret.className = `ph ph-caret-${expanded ? 'up' : 'down'}`;
};

export const renderLists = () => {
    const warning = document.getElementById('lists-data-warning');
    const affected = store.lists.filter(list => list._invalidItems?.length || typeof list.name !== 'string' || !list.name.trim());
    if (warning) { warning.textContent = affected.length ? `${affected.length} lista(s) precisa(m) de revisão. Use as opções para corrigir nomes. Itens inválidos foram isolados; o conteúdo original continua no banco e alterações dessa lista ficam bloqueadas até a revisão.` : ''; warning.classList.toggle('d-none', !affected.length); }
    
    const tabsContainer = document.getElementById('lists-tabs-container');
    const taskContainer = document.getElementById('task-list-container');
    const completedTaskContainer = document.getElementById('completed-task-list-container');
    const completedSection = document.getElementById('lists-completed-section');
    const listActions = document.querySelector('.list-actions');
    const addForm = document.getElementById('form-add-task');
    const sectionTitle = document.getElementById('lists-section-title');
    
    if (!tabsContainer || !taskContainer || !completedTaskContainer) return;
    
    tabsContainer.innerHTML = '';
    taskContainer.innerHTML = '';
    completedTaskContainer.innerHTML = '';
    
    if (!store.lists || store.lists.length === 0) {
        activeListId = null; updateListsSummary();
        if (document.getElementById('active-list-header-title')) {
            document.getElementById('active-list-header-title').textContent = 'Sem Listas';
        }
        if (sectionTitle) sectionTitle.textContent = 'BEM-VINDO(A)';
        
        if (listActions) listActions.classList.add('d-none');
        if (addForm) addForm.classList.add('d-none');
        if (completedSection) completedSection.classList.add('d-none');
        document.getElementById('list-filters-container')?.classList.add('d-none');
        tabsContainer.classList.add('d-none');
        taskContainer.innerHTML = `
            <div class="empty-state-card empty-state-card--plain flex-col align-center gap-12">
                <div class="dash-icon dash-icon--empty bg-primary-light mb-8">
                    <i class="ph-fill ph-list-dashes text-primary"></i>
                </div>
                <p class="mb-0 text-muted">Ainda não possui nenhuma lista.</p>
                <button class="btn-primary btn-outline-primary btn-inline-action mt-8" id="btn-empty-create-list">
                    Criar a Primeira Lista
                </button>
            </div>
        `;
        document.getElementById('btn-empty-create-list')?.addEventListener('click', () => {
            openModal('create-list-bottom-sheet');
        });
        return;
    }
    
    if (listActions) listActions.classList.remove('d-none');
    if (addForm) addForm.classList.remove('d-none');
    tabsContainer.classList.remove('d-none');
    document.getElementById('list-filters-container')?.classList.remove('d-none');
    
    const currentListCheck = store.lists.find(l => sameId(l.id, activeListId));
    activeListId = currentListCheck ? currentListCheck.id : store.lists[0].id;
    
    store.lists.forEach(list => {
        const btn = document.createElement('button');
        const isDecision = list.type === 'decision';
        
        btn.className = `tab-pill ${list.id === activeListId ? 'active' : 'outline'} ${isDecision ? 'tab-decision' : ''}`;
        btn.dataset.listId = list.id;
        
        if (isDecision) btn.innerHTML = `<i class="ph-bold ph-dice-five mr-4"></i>${escapeHTML(listDisplayName(list))}`;
        else btn.innerHTML = escapeHTML(listDisplayName(list));
        
        btn.addEventListener('click', () => { 
            activeListId = list.id; 
            renderLists();
        });
        tabsContainer.appendChild(btn);
    });
    
    const btnAddList = document.createElement('button');
    btnAddList.className = 'tab-pill outline text-primary';
    btnAddList.innerHTML = '<i class="ph ph-plus"></i>';
    btnAddList.title = 'Criar Lista ou Módulo de Decisão';
    btnAddList.addEventListener('click', () => openModal('create-list-bottom-sheet'));
    tabsContainer.appendChild(btnAddList);
    enableDesktopScroll(tabsContainer);
    
    let filtersContainer = document.getElementById('list-filters-container');
    if (!filtersContainer && sectionTitle) {
        filtersContainer = document.createElement('div');
        filtersContainer.id = 'list-filters-container';
        filtersContainer.className = 'tabs list-filters';
        sectionTitle.parentNode.insertBefore(filtersContainer, sectionTitle.nextSibling);
    }
    if (filtersContainer) {
        filtersContainer.innerHTML = '';
        const p1Name = store.profile?.p1 || 'Minhas';
        const p2Name = store.profile?.p2 || 'Parceiro';
        const filters = [{ id: 'all', label: 'Todas' }, { id: OWNER.P1, label: p1Name }, { id: OWNER.P2, label: p2Name }, { id: OWNER.COUPLE, label: 'Nós (Casal)' }];
        
        filters.forEach(f => {
            const btn = document.createElement('button');
            btn.className = `tab-pill tab-pill-sm ${activeFilter === f.id ? 'active' : 'outline'}`;
            btn.dataset.filter = f.id;
            btn.textContent = f.label;
            btn.addEventListener('click', () => { 
                    activeFilter = f.id; 
                applyListFilters(); // Substitui a chamada completa de re-render
            });
            filtersContainer.appendChild(btn);
        });
        enableDesktopScroll(filtersContainer);
    }
    
    // Renderiza somente os itens da lista ativa. As abas continuam conhecendo todas as listas.
    const activeList = store.lists.find(list => sameId(list.id, activeListId));
    if (activeList) {
        const list = activeList;
        list.items.forEach((item) => {
            let priorityUI = '<i class="ph ph-flag text-muted"></i>';
            let prioritySubtext = '';
            if (item.priority === 'urgent') { priorityUI = '<i class="ph-fill ph-flag text-danger"></i>'; prioritySubtext = '<span class="badge-urgent">Urgente</span>'; }
            else if (item.priority === 'casual') { priorityUI = '<i class="ph-fill ph-flag text-primary"></i>'; prioritySubtext = '<span class="badge-casual">Quando der</span>'; }
            
            const li = document.createElement('li');
            li.className = `task-item ${item.completed ? 'completed' : ''} d-none`;
            li.draggable = true;
            li.dataset.id = item.id;
            li.dataset.owner = item.owner;
            li.dataset.completed = String(item.completed);
            
            li.innerHTML = `
                <div class="checkbox"><i class="ph-bold ph-check"></i></div>
                <div class="task-content flex-col flex-1" title="Arraste para reordenar">
                    <span class="task-text">${escapeHTML(item.text)}</span>
                    ${prioritySubtext}
                </div>
                <button class="btn-priority">${priorityUI}</button>
                ${getAvatarHtml(item.owner)}
                <button class="btn-edit-item" title="Editar Tarefa"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-delete-event"><i class="ph ph-trash"></i></button>
            `;
            
            li.querySelector('.checkbox').addEventListener('click', async () => {
                await runAction(li, async () => { await editListItem(list.id, item.id, task => ({ ...task, completed: !task.completed })); triggerHaptic(15); renderLists(); });
            });
            li.querySelector('.btn-delete-event').addEventListener('click', () => {
                openConfirmSheet({
                    title: 'Excluir item?',
                    message: `“${item.text}” será removido da lista. Esta ação não poderá ser desfeita.`,
                    confirmLabel: 'Excluir item',
                    onConfirm: async () => {
                        await editListItem(list.id, item.id, () => null);
                        renderLists();
                        showToast('Item excluído.');
                    }
                });
            });
            li.querySelector('.btn-priority').addEventListener('click', async () => {
                await runAction(li, async () => { await editListItem(list.id, item.id, task => ({ ...task, priority: togglePriority(task.priority) })); renderLists(); });
            });
            li.querySelector('.btn-edit-item').addEventListener('click', () => {
                itemEditContext = store.captureEdit('lists', list.id);
                const opened = itemEditContext.record.items.find(entry => sameId(entry.id, item.id));
                editingItemId = opened.id; editWarning('task-edit-warning');
                document.getElementById('edit-task-id').value = opened.id;
                document.getElementById('edit-task-text').value = opened.text;
                document.getElementById('edit-task-owner').value = opened.owner || OWNER.COUPLE;
                openModal('task-edit-bottom-sheet');
            });
            
            li.addEventListener('dragstart', () => { draggedItemIndex = list.items.findIndex(i => i.id === item.id); setTimeout(() => li.classList.add('dragging'), 0); });
            li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('drag-over'); });
            li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
            li.addEventListener('drop', async e => {
                e.preventDefault(); e.stopPropagation(); li.classList.remove('drag-over');
                if (draggedItemIndex === null) return;
                const sourceId = list.items[draggedItemIndex]?.id;
                if (sourceId == null) return;
                await runAction(li, async () => {
                    const latest = store.lists.find(l => sameId(l.id, list.id));
                    const items = [...latest.items];
                    const source = items.findIndex(task => sameId(task.id, sourceId));
                    const target = items.findIndex(task => sameId(task.id, item.id));
                    if (source < 0 || target < 0 || source === target) return;
                    const [moved] = items.splice(source, 1); items.splice(target, 0, moved);
                    await store.saveRecord('lists', { ...latest, items }); renderLists();
                });
            });
            li.addEventListener('dragend', () => { li.classList.remove('dragging'); li.classList.remove('drag-over'); draggedItemIndex = null; });
            (item.completed ? completedTaskContainer : taskContainer).appendChild(li);
        });
    }

    applyListFilters();
};

const runDecisionRoulette = () => {
    const currentList = store.lists.find(l => l.id === activeListId);
    if (!currentList) return;
    const pending = currentList.items.filter(i => !i.completed);
    if (pending.length === 0) { showToast('Todos os itens desta lista já foram concluídos. Adicione mais opções.', 'ph-info'); return; }
    
    const modalTitle = document.getElementById('roulette-modal-title');
    const resultBox = document.getElementById('roulette-result-display');
    const btnConfirm = document.getElementById('btn-accept-decision');
    modalTitle.textContent = `Sortear: ${listDisplayName(currentList)}`;
    resultBox.textContent = "Girando a roleta...";
    btnConfirm.classList.add('d-none');
    openModal('roulette-bottom-sheet');
    
    let counter = 0;
    const interval = setInterval(() => {
        const randomTemp = pending[Math.floor(Math.random() * pending.length)];
        resultBox.textContent = randomTemp.text;
        counter++;
        if (counter > 15) {
            clearInterval(interval);
            const chosen = pending[Math.floor(Math.random() * pending.length)];
            resultBox.textContent = chosen.text;
            btnConfirm.classList.remove('d-none');
            triggerHaptic([80, 40, 80]);
            btnConfirm.onclick = async () => { await runAction(btnConfirm, async () => { await editListItem(currentList.id, chosen.id, item => ({ ...item, completed: true })); renderLists(); closeAllModals(true); }); };
        }
    }, 100);
};

const editListItem = async (listId, itemId, change) => {
    const list = store.lists.find(item => sameId(item.id, listId));
    if (!list || !list.items.some(item => sameId(item.id, itemId))) throw new Error('Este item mudou. Recarregue a lista.');
    const items = list.items.map(item => sameId(item.id, itemId) ? change({ ...item }) : item).filter(Boolean);
    await store.saveRecord('lists', { ...list, items });
};

export const initLists = () => {
    document.getElementById('btn-list-options')?.addEventListener('click', () => openModal('list-options-bottom-sheet'));
    document.getElementById('btn-toggle-completed')?.addEventListener('click', () => {
        if (activeListId == null) return;
        const key = String(activeListId);
        if (expandedCompletedLists.has(key)) expandedCompletedLists.delete(key);
        else expandedCompletedLists.add(key);
        applyListFilters();
    });
    
    document.getElementById('btn-open-all-lists')?.addEventListener('click', () => {
        const searchInput = document.getElementById('search-all-lists');
        if (searchInput) searchInput.value = '';
        renderAllListsModal();
        openModal('all-lists-bottom-sheet');
    });
    document.getElementById('search-all-lists')?.addEventListener('input', () => {
        renderAllListsModal();
    });
    document.getElementById('btn-rename-list')?.addEventListener('click', () => {
        const list = store.lists.find(item => sameId(item.id, activeListId));
        if (!list) return;
        const input = document.getElementById('rename-list-name');
        if (!input) return;
        input.value = listDisplayName(list);
        closeAllModals(true);
        openModal('rename-list-bottom-sheet');
    });
    document.getElementById('form-rename-list')?.addEventListener('submit', async e => {
        e.preventDefault();
        const form = e.currentTarget;
        const list = store.lists.find(item => sameId(item.id, activeListId));
        if (!list) { showToast('Esta lista não está mais disponível.', 'ph-warning-circle'); closeAllModals(true); return; }
        await runAction(form, async () => {
            const name = nonEmpty(document.getElementById('rename-list-name').value, 'Nome');
            await store.saveRecord('lists', { ...list, name });
            renderLists();
            closeAllModals(true);
            showToast('Lista renomeada.');
        });
    });
    document.getElementById('btn-delete-list')?.addEventListener('click', () => {
        const list = store.lists.find(item => sameId(item.id, activeListId));
        if (!list) return;
        openConfirmSheet({
            title: 'Excluir lista?',
            message: `“${listDisplayName(list)}” e todos os seus itens serão removidos. Esta ação não poderá ser desfeita.`,
            confirmLabel: 'Excluir lista',
            onConfirm: async () => {
                await store.deleteRecord('lists', list.id);
                activeListId = store.lists[0]?.id ?? null;
                renderLists();
                showToast('Lista excluída.');
            }
        });
    });
    document.getElementById('form-create-list')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const list = await store.saveRecord('lists', { name: nonEmpty(document.getElementById('create-list-name').value, 'Nome'), type: document.getElementById('create-list-type').value, items: [] }, { create: true });
            activeListId = list.id; renderLists(); closeAllModals(true); form.reset();
        });
    });
    document.getElementById('btn-trigger-roulette')?.addEventListener('click', runDecisionRoulette);
    
    document.getElementById('form-edit-task')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const id = document.getElementById('edit-task-id').value;
            const text = nonEmpty(document.getElementById('edit-task-text').value, 'Tarefa');
            const owner = document.getElementById('edit-task-owner').value;
            if (!itemEditContext || !sameId(id, editingItemId)) throw new Error('Reabra a edição deste item.');
            const items = itemEditContext.record.items.map(item => sameId(item.id, id) ? { ...item, text, owner } : item);
            await saveFormEdit(itemEditContext, { items }, 'task-edit-warning'); renderLists(); closeAllModals(true);
        });
    });
    document.getElementById('form-add-task')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const text = nonEmpty(document.getElementById('input-task-text').value, 'Tarefa');
            const owner = document.getElementById('input-task-owner').value;
            const list = store.lists.find(item => sameId(item.id, activeListId));
            if (!list) throw new Error('Selecione uma lista.');
            await store.saveRecord('lists', { ...list, items: [...list.items, { id: crypto.randomUUID(), text, completed: false, priority: 'none', owner }] });
            if (activeFilter !== 'all' && activeFilter !== owner) activeFilter = 'all';
            document.getElementById('input-task-text').value = ''; renderLists();
        });
    });
    document.getElementById('btn-list-archive')?.addEventListener('click', () => {
    const list = store.lists.find(item => sameId(item.id, activeListId));
    if (!list) return;
    const completed = list.items.filter(item => item.completed);
    if (!completed.length) { showToast('Nenhum item concluído.'); return; }

    clearCompletedListId = list.id;
    clearCompletedCount = completed.length;
    const message = document.getElementById('clear-completed-message');
    if (message) message.textContent = `Excluir ${clearCompletedCount} ${clearCompletedCount === 1 ? 'item concluído' : 'itens concluídos'}? Esta ação não poderá ser desfeita.`;
    openModal('clear-completed-bottom-sheet');
});

document.getElementById('btn-confirm-clear-completed')?.addEventListener('click', async e => {
    const list = store.lists.find(item => sameId(item.id, clearCompletedListId));
    if (!list) { closeAllModals(true); showToast('Esta lista não está mais disponível.'); return; }

    const completed = list.items.filter(item => item.completed);
    if (!completed.length) { closeAllModals(true); showToast('Nenhum item concluído.'); return; }

    if (completed.length !== clearCompletedCount) {
        clearCompletedCount = completed.length;
        const message = document.getElementById('clear-completed-message');
        if (message) message.textContent = `Excluir ${clearCompletedCount} ${clearCompletedCount === 1 ? 'item concluído' : 'itens concluídos'}? Esta ação não poderá ser desfeita.`;
        showToast('A lista mudou. Confira a nova quantidade antes de confirmar.');
        return;
    }

    await runAction(e.currentTarget, async () => {
        await store.saveRecord('lists', { ...list, items: list.items.filter(item => !item.completed) });
        clearCompletedListId = null;
        clearCompletedCount = 0;
        renderLists();
        closeAllModals(true);
        showToast('Itens concluídos excluídos.');
    });
});
    
    if (store.lists.length > 0) activeListId = store.lists[0].id;
    renderLists();
};