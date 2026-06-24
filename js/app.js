(function (global) {
  const state = StorageService.loadState();
  const appState = StorageService.ensureStateStructure(state);

  appState.currentListId = appState.currentListId || (appState.lists[0] ? appState.lists[0].id : null);
  appState.search = appState.search || '';
  appState.filters = appState.filters || { status: 'all', category: 'all' };
  appState.sortBy = appState.sortBy || 'name';

  let pendingConfirmAction = null;

  function saveState() {
    StorageService.saveState(appState);
  }

  function render() {
    UI.renderDashboard(appState);
    UI.renderLists(appState);
    UI.renderCurrentList(appState);
    saveState();
  }

  function setTheme(theme) {
    appState.theme = theme;
    document.body.classList.toggle('dark', theme === 'dark');
    UI.setThemeButton(theme);
    saveState();
  }

  function toggleTheme() {
    const nextTheme = appState.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    UI.showToast(nextTheme === 'dark' ? 'Tema escuro ativado' : 'Tema claro ativado');
  }

  function ensureActiveList() {
    if (!appState.currentListId || !appState.lists.some((list) => list.id === appState.currentListId)) {
      appState.currentListId = appState.lists[0] ? appState.lists[0].id : null;
    }
  }

  function openListModal(listId = null) {
    const form = document.getElementById('listForm');
    const hiddenId = document.getElementById('listId');
    const nameInput = document.getElementById('listName');
    const title = document.getElementById('listModalTitle');

    if (listId) {
      const list = appState.lists.find((item) => item.id === listId);
      if (list) {
        hiddenId.value = list.id;
        nameInput.value = list.name;
        title.textContent = 'Editar lista';
      }
    } else {
      hiddenId.value = '';
      nameInput.value = '';
      title.textContent = 'Criar lista';
    }

    UI.openModal('listModal');
    nameInput.focus();
  }

  function openItemModal(itemId = null) {
    const form = document.getElementById('itemForm');
    const hiddenId = document.getElementById('itemId');
    const nameInput = document.getElementById('itemName');
    const quantityInput = document.getElementById('itemQuantity');
    const categorySelect = document.getElementById('itemCategory');
    const priceInput = document.getElementById('itemPrice');
    const noteInput = document.getElementById('itemNote');
    const title = document.getElementById('itemModalTitle');

    if (!appState.currentListId) {
      UI.showToast('Crie uma lista antes de adicionar itens.', 'error');
      return;
    }

    if (itemId) {
      const currentList = appState.lists.find((list) => list.id === appState.currentListId);
      const item = currentList?.items.find((entry) => entry.id === itemId);
      if (item) {
        hiddenId.value = item.id;
        nameInput.value = item.name;
        quantityInput.value = item.quantity;
        priceInput.value = item.price;
        noteInput.value = item.note || '';
        title.textContent = 'Editar item';
        UI.populateCategorySelect(categorySelect, appState.categories, item.category);
      }
    } else {
      hiddenId.value = '';
      nameInput.value = '';
      quantityInput.value = 1;
      priceInput.value = 0;
      noteInput.value = '';
      title.textContent = 'Adicionar item';
      UI.populateCategorySelect(categorySelect, appState.categories, appState.categories[0] || 'Outros');
    }

    UI.openModal('itemModal');
    nameInput.focus();
  }

  function handleListSubmit(event) {
    event.preventDefault();
    const listId = document.getElementById('listId').value;
    const name = document.getElementById('listName').value.trim();

    if (!name) {
      UI.showToast('Informe um nome para a lista.', 'error');
      return;
    }

    if (listId) {
      const target = appState.lists.find((list) => list.id === listId);
      if (target) {
        target.name = name;
        UI.showToast('Lista atualizada com sucesso.');
      }
    } else {
      appState.lists.unshift({ id: StorageService.uid('list'), name, items: [] });
      appState.currentListId = appState.lists[0].id;
      UI.showToast('Lista criada com sucesso.');
    }

    UI.closeModal('listModal');
    render();
  }

  function handleItemSubmit(event) {
    event.preventDefault();
    const currentList = appState.lists.find((list) => list.id === appState.currentListId);
    if (!currentList) {
      UI.showToast('Selecione uma lista primeiro.', 'error');
      return;
    }

    const itemId = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value.trim();
    const quantity = Number(document.getElementById('itemQuantity').value);
    const category = document.getElementById('itemCategory').value;
    const price = Number(document.getElementById('itemPrice').value);
    const note = document.getElementById('itemNote').value.trim();

    if (!name) {
      UI.showToast('Informe o nome do produto.', 'error');
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      UI.showToast('A quantidade deve ser maior que zero.', 'error');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      UI.showToast('Informe um preço válido.', 'error');
      return;
    }

    if (itemId) {
      const item = currentList.items.find((entry) => entry.id === itemId);
      if (item) {
        item.name = name;
        item.quantity = quantity;
        item.category = category;
        item.price = price;
        item.note = note;
        UI.showToast('Item atualizado com sucesso.');
      }
    } else {
      currentList.items.push({
        id: StorageService.uid('item'),
        name,
        quantity,
        category,
        price,
        note,
        purchased: false
      });
      UI.showToast('Item adicionado com sucesso.');
    }

    UI.closeModal('itemModal');
    render();
  }

  function duplicateList(listId) {
    const source = appState.lists.find((list) => list.id === listId);
    if (!source) return;

    const duplicated = {
      id: StorageService.uid('list'),
      name: `${source.name} (cópia)`,
      items: source.items.map((item) => ({ ...item, id: StorageService.uid('item') }))
    };

    appState.lists.unshift(duplicated);
    appState.currentListId = duplicated.id;
    UI.showToast('Lista duplicada com sucesso.');
    render();
  }

  function deleteList(listId) {
    const index = appState.lists.findIndex((list) => list.id === listId);
    if (index === -1) return;

    appState.lists.splice(index, 1);
    if (appState.currentListId === listId) {
      appState.currentListId = appState.lists[0] ? appState.lists[0].id : null;
    }
    UI.showToast('Lista removida com sucesso.');
    render();
  }

  function deleteItem(itemId) {
    const currentList = appState.lists.find((list) => list.id === appState.currentListId);
    if (!currentList) return;

    currentList.items = currentList.items.filter((item) => item.id !== itemId);
    UI.showToast('Item excluído com sucesso.');
    render();
  }

  function toggleItem(itemId) {
    const currentList = appState.lists.find((list) => list.id === appState.currentListId);
    if (!currentList) return;

    const item = currentList.items.find((entry) => entry.id === itemId);
    if (item) {
      item.purchased = !item.purchased;
      UI.showToast(item.purchased ? 'Item marcado como comprado.' : 'Item movido para pendente.');
      render();
    }
  }

  function bindEvents() {
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('newListButton').addEventListener('click', () => openListModal());
    document.getElementById('newItemButton').addEventListener('click', () => openItemModal());
    document.getElementById('fabAddItem').addEventListener('click', () => openItemModal());

    document.getElementById('listSearch').addEventListener('input', (event) => {
      appState.search = event.target.value;
      UI.renderLists(appState);
    });

    document.getElementById('filterStatus').addEventListener('change', (event) => {
      appState.filters.status = event.target.value;
      render();
    });

    document.getElementById('filterCategory').addEventListener('change', (event) => {
      appState.filters.category = event.target.value;
      render();
    });

    document.getElementById('sortSelect').addEventListener('change', (event) => {
      appState.sortBy = event.target.value;
      render();
    });

    document.getElementById('listForm').addEventListener('submit', handleListSubmit);
    document.getElementById('itemForm').addEventListener('submit', handleItemSubmit);

    document.getElementById('listsContainer').addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-action]');
      const listCard = event.target.closest('[data-list-id]');
      if (!listCard) return;

      const listId = listCard.getAttribute('data-list-id');
      if (actionButton) {
        const action = actionButton.getAttribute('data-action');
        if (action === 'edit-list') {
          openListModal(listId);
        } else if (action === 'duplicate-list') {
          duplicateList(listId);
        } else if (action === 'delete-list') {
          UI.showConfirmModal('Deseja remover esta lista e todos os seus itens?', () => deleteList(listId));
        }
        return;
      }

      appState.currentListId = listId;
      render();
    });

    document.getElementById('itemsContainer').addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) return;
      const itemId = actionButton.getAttribute('data-item-id');
      const action = actionButton.getAttribute('data-action');
      if (action === 'toggle-item') {
        toggleItem(itemId);
      } else if (action === 'edit-item') {
        openItemModal(itemId);
      } else if (action === 'delete-item') {
        UI.showConfirmModal('Deseja remover este item da lista?', () => deleteItem(itemId));
      }
    });

    document.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => {
        const modalId = button.getAttribute('data-close-modal');
        if (modalId) {
          UI.closeModal(modalId);
        }
      });
    });

    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
          UI.closeModal(modal.id);
        }
      });
    });
  }

  function init() {
    ensureActiveList();
    const filterCategorySelect = document.getElementById('filterCategory');
    UI.populateCategorySelect(filterCategorySelect, appState.categories, appState.filters.category || 'all', true);
    setTheme(appState.theme);
    bindEvents();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
