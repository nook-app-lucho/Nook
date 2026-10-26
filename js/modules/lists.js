import { store } from '../store.js';
import { triggerHaptic, escapeHTML, getAvatarHtml, openModal, closeAllModals, enableDesktopScroll, showToast, runAction, editWarning, saveFormEdit } from '../utils.js';
import { sameId, nonEmpty, listDisplayName } from '../rules.js';

let itemEditContext = null;
let editingItemId = null;
let activeListId = null;
let draggedItemIndex = null;
let activeFilter = 'all';
let clearCompletedListId = null;
let clearCompletedCount = 0;

const togglePriority = (current) => {
    if (!current || current === 'none') return 'urgent';
    if (current === 'urgent') return 'casual';
    return 'none';
};

const updateListsSummary = () => {
    const currentList = store.lists.find(l => l.id === activeListId);
    const count = document.getElementById('metric-lists-count');
    const pending = document.getElementById('metric-pending-count');
    if (count) count.textContent = store.lists.length;
    if (pending) pending.textContent = store.lists.reduce((sum, list) => sum + (list.items || []).filter(item => !item.completed).length, 0);
    if (!currentList) return;
    const filteredItems = activeFilter === 'all' ? currentList.items : currentList.items.filter(i => i.owner === activeFilter);
    const pendingCount = filteredItems.filter(i => !i.completed).length;
    const sectionTitle = document.getElementById('lists-section-title');
    if (sectionTitle) sectionTitle.textContent = `PENDENTES (${pendingCount})`;
};

export const renderAllListsModal = () => {
    const grid = document.getElementById('all-lists-grid');
    const searchInput = document.getElementById('search-all-lists');
    if (!grid) return;
    const query = (searchInput?.value || '').toLowerCase().trim();
    grid.innerHTML = '';
    const filteredLists = (store.lists || []).filter(l => listDisplayName(l).toLowerCase().includes(query));
    if (filteredLists.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">Nenhuma lista encontrada.</div>`;
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
            triggerHaptic(15);
            activeListId = list.id;
            // OTIMIZAÇÃO: Não destroi o DOM, apenas aplica o filtro de visibilidade
            applyListFilters();
            closeAllModals(true);
        });
        grid.appendChild(card);
    });
};

export const applyListFilters = () => {
    const currentList = store.lists.find(l => sameId(l.id, activeListId)) || store.lists[0];
    if (!currentList) return;

    // Atualiza cabeçalhos e roleta
    const headerTitle = document.getElementById('active-list-header-title');
    if (headerTitle) headerTitle.textContent = listDisplayName(currentList);
    
    const decisionBanner = document.getElementById('decision-roulette-banner');
    if (decisionBanner) {
        decisionBanner.classList.toggle('d-none', currentList.type !== 'decision');
        const decisionTitle = document.getElementById('decision-banner-title');
        if (decisionTitle) decisionTitle.textContent = `Dúvida no ${listDisplayName(currentList)}?`;
    }

    // Atualiza a marcação das abas visuais ativas
    document.querySelectorAll('#lists-tabs-container .tab-pill[data-list-id]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.listId === activeListId);
        btn.classList.toggle('outline', btn.dataset.listId !== activeListId);
    });

    document.querySelectorAll('#list-filters-container .tab-pill[data-filter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === activeFilter);
        btn.classList.toggle('outline', btn.dataset.filter !== activeFilter);
    });

    // OTIMIZAÇÃO: Mostra/Oculta itens via classe (sem reflow de innerHTML)
    let visibleCount = 0;
    document.querySelectorAll('#task-list-container .task-item').forEach(li => {
        const matchList = li.dataset.listId === activeListId;
        const matchFilter = activeFilter === 'all' || li.dataset.owner === activeFilter;
        const match = matchList && matchFilter;
        li.classList.toggle('d-none', !match);
        if (match) visibleCount++;
    });

    updateListsSummary();

    // Tratamento de estado vazio
    const taskContainer = document.getElementById('task-list-container');
    let emptyState = document.getElementById('empty-list-msg');
    if (visibleCount === 0) {
        if (!emptyState && taskContainer) {
            emptyState = document.createElement('li');
            emptyState.id = 'empty-list-msg';
            emptyState.className = 'empty-state';
            taskContainer.appendChild(emptyState);
        }
        if (emptyState) {
            emptyState.textContent = 'Nenhum item para este filtro.';
            emptyState.classList.remove('d-none');
        }
    } else if (emptyState) {
        emptyState.classList.add('d-none');
    }
};

export const renderLists = () => {
    const warning = document.getElementById('lists-data-warning');
    const affected = store.lists.filter(list => list._invalidItems?.length || typeof list.name !== 'string' || !list.name.trim());
    if (warning) { warning.textContent = affected.length ? `${affected.length} lista(s) precisa(m) de revisão. Use as opções para corrigir nomes. Itens inválidos foram isolados; o conteúdo original continua no banco e alterações dessa lista ficam bloqueadas até a revisão.` : ''; warning.classList.toggle('d-none', !affected.length); }
    
    const tabsContainer = document.getElementById('lists-tabs-container');
    const taskContainer = document.getElementById('task-list-container');
    const listActions = document.querySelector('.list-actions');
    const addForm = document.getElementById('form-add-task');
    const sectionTitle = document.getElementById('lists-section-title');
    
    if (!tabsContainer || !taskContainer) return;
    
    tabsContainer.innerHTML = '';
    taskContainer.innerHTML = '';
    
    if (!store.lists || store.lists.length === 0) {
        activeListId = null; updateListsSummary();
        if (document.getElementById('active-list-header-title')) {
            document.getElementById('active-list-header-title').textContent = 'Sem Listas';
        }
        if (sectionTitle) sectionTitle.textContent = 'BEM-VINDO(A)';
        
        if (listActions) listActions.classList.add('d-none');
        if (addForm) addForm.classList.add('d-none');
        tabsContainer.classList.add('d-none');
        taskContainer.innerHTML = `
            <div class="empty-state-card flex-col align-center gap-12" style="border: none; background: transparent; padding-top: 32px;">
                <div class="dash-icon bg-primary-light mb-8" style="width: 72px; height: 72px; font-size: 2rem;">
                    <i class="ph-fill ph-list-dashes text-primary"></i>
                </div>
                <p class="mb-0 text-muted">Ainda não possui nenhuma lista.</p>
                <button class="btn-primary btn-outline-primary mt-8" id="btn-empty-create-list" style="width: auto; padding: 12px 24px;">
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
            triggerHaptic(10); 
            activeListId = list.id; 
            applyListFilters(); // Substitui a chamada completa de re-render
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
        const filters = [{ id: 'all', label: 'Todas' }, { id: 'IS', label: p1Name }, { id: 'VO', label: p2Name }, { id: 'Casal', label: 'Nós (Casal)' }];
        
        filters.forEach(f => {
            const btn = document.createElement('button');
            btn.className = `tab-pill tab-pill-sm ${activeFilter === f.id ? 'active' : 'outline'}`;
            btn.dataset.filter = f.id;
            btn.textContent = f.label;
            btn.addEventListener('click', () => { 
                triggerHaptic(10); 
                activeFilter = f.id; 
                applyListFilters(); // Substitui a chamada completa de re-render
            });
            filtersContainer.appendChild(btn);
        });
        enableDesktopScroll(filtersContainer);
    }
    
    // Anexa todos os itens no DOM com marcação de IDs para uso futuro do filtro
    store.lists.forEach(list => {
        list.items.forEach((item) => {
            let priorityUI = '<i class="ph ph-flag text-muted"></i>';
            let prioritySubtext = '';
            if (item.priority === 'urgent') { priorityUI = '<i class="ph-fill ph-flag text-danger"></i>'; prioritySubtext = '<span class="badge-urgent">Urgente</span>'; }
            else if (item.priority === 'casual') { priorityUI = '<i class="ph-fill ph-flag text-primary"></i>'; prioritySubtext = '<span class="badge-casual">Quando der</span>'; }
            
            const li = document.createElement('li');
            li.className = `task-item ${item.completed ? 'completed' : ''} d-none`;
            li.draggable = true;
            li.dataset.id = item.id;
            li.dataset.listId = list.id;
            li.dataset.owner = item.owner;
            
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
            li.querySelector('.btn-delete-event').addEventListener('click', async () => {
                if (!confirm('Excluir este item?')) return;
                await runAction(li, async () => { await editListItem(list.id, item.id, () => null); renderLists(); });
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
                document.getElementById('edit-task-owner').value = opened.owner || 'Casal';
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
            taskContainer.appendChild(li);
        });
    });

    applyListFilters();
};

const runDecisionRoulette = () => {
    const currentList = store.lists.find(l => l.id === activeListId);
    if (!currentList) return;
    const pending = currentList.items.filter(i => !i.completed);
    if (pending.length === 0) { alert('Todos os itens desta lista já foram concluídos! Adicione mais opções.'); return; }
    
    const modalTitle = document.getElementById('roulette-modal-title');
    const resultBox = document.getElementById('roulette-result-display');
    const btnConfirm = document.getElementById('btn-accept-decision');
    modalTitle.textContent = `Sortear: ${listDisplayName(currentList)}`;
    resultBox.textContent = "Girando a roleta...";
    btnConfirm.classList.add('d-none');
    openModal('roulette-bottom-sheet');
    
    let counter = 0;
    const interval = setInterval(() => {
        triggerHaptic(10);
        const randomTemp = pending[Math.floor(Math.random() * pending.length)];
        resultBox.textContent = randomTemp.text;
        counter++;
        if (counter > 15) {
            clearInterval(interval);
            const chosen = pending[Math.floor(Math.random() * pending.length)];
            resultBox.textContent = chosen.text;
            btnConfirm.classList.remove('d-none');
            triggerHaptic([100, 50, 100, 50, 200]);
            if (window.confetti) confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
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
    
    document.getElementById('btn-open-all-lists')?.addEventListener('click', () => {
        triggerHaptic(10);
        const searchInput = document.getElementById('search-all-lists');
        if (searchInput) searchInput.value = '';
        renderAllListsModal();
        openModal('all-lists-bottom-sheet');
    });
    document.getElementById('search-all-lists')?.addEventListener('input', () => {
        renderAllListsModal();
    });
    document.getElementById('btn-rename-list')?.addEventListener('click', async e => {
        const list = store.lists.find(item => sameId(item.id, activeListId));
        if (!list) return;
        const name = prompt('Digite o novo nome para a lista:', list.name || '');
        if (name === null) return;
        await runAction(e.currentTarget, async () => { await store.saveRecord('lists', { ...list, name: nonEmpty(name, 'Nome') }); renderLists(); closeAllModals(true); });
    });
    document.getElementById('btn-delete-list')?.addEventListener('click', async e => {
        const list = store.lists.find(item => sameId(item.id, activeListId));
        if (!list || !confirm(`Excluir a lista "${listDisplayName(list)}" e seus itens?`)) return;
        await runAction(e.currentTarget, async () => { await store.deleteRecord('lists', list.id); activeListId = store.lists[0]?.id ?? null; renderLists(); closeAllModals(true); });
    });
    document.getElementById('form-create-list')?.addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        await runAction(form, async () => {
            const list = await store.saveRecord('lists', { name: nonEmpty(document.getElementById('create-list-name').value, 'Nome'), type: document.getElementById('create-list-type').value, items: [] }, { create: true });
            activeListId = list.id; renderLists(); closeAllModals(true); form.reset();
        });
    });
    document.getElementById('btn-trigger-roulette')?.addEventListener('click', () => { triggerHaptic(20); runDecisionRoulette(); });
    
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