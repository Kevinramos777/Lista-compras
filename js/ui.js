(function (global) {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function renderDashboard(state) {
    const allItems = state.lists.flatMap((list) => list.items || []);
    const purchasedItems = allItems.filter((item) => item.purchased).length;
    const pendingItems = allItems.length - purchasedItems;
    const estimatedTotal = allItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

    document.getElementById('totalLists').textContent = state.lists.length;
    document.getElementById('totalItems').textContent = allItems.length;
    document.getElementById('purchasedItems').textContent = purchasedItems;
    document.getElementById('pendingItems').textContent = pendingItems;
    document.getElementById('estimatedTotal').textContent = formatCurrency(estimatedTotal);
  }

  function renderLists(state) {
    const container = document.getElementById('listsContainer');
    const search = (state.search || '').toLowerCase();
    const visibleLists = state.lists.filter((list) => list.name.toLowerCase().includes(search));

    if (!visibleLists.length) {
      container.innerHTML = '<div class="empty-state">Nenhuma lista encontrada.</div>';
      return;
    }

    container.innerHTML = visibleLists.map((list) => {
      const itemCount = list.items?.length || 0;
      const completedCount = (list.items || []).filter((item) => item.purchased).length;
      const progress = itemCount ? Math.round((completedCount / itemCount) * 100) : 0;
      const activeClass = state.currentListId === list.id ? 'active' : '';
      return `
        <article class="list-card ${activeClass}" data-list-id="${list.id}">
          <div class="list-main">
            <div class="list-icon">📝</div>
            <div class="list-meta">
              <strong>${escapeHtml(list.name)}</strong>
              <span>${itemCount} itens • ${completedCount} concluídos</span>
            </div>
          </div>
          <div class="list-actions">
            <button type="button" data-action="edit-list" data-list-id="${list.id}" title="Editar lista">✏️</button>
            <button type="button" data-action="duplicate-list" data-list-id="${list.id}" title="Duplicar lista">📋</button>
            <button type="button" data-action="delete-list" data-list-id="${list.id}" title="Excluir lista">🗑️</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderCurrentList(state) {
    const container = document.getElementById('itemsContainer');
    const header = document.getElementById('listDetailHeader');
    const activeList = state.lists.find((list) => list.id === state.currentListId);

    const filterStatus = document.getElementById('filterStatus');
    const filterCategory = document.getElementById('filterCategory');
    const sortSelect = document.getElementById('sortSelect');
    filterStatus.value = state.filters.status;
    filterCategory.value = state.filters.category;
    sortSelect.value = state.sortBy;

    if (!activeList) {
      header.innerHTML = `
        <div class="empty-state">
          <h3>Selecione uma lista</h3>
          <p>Crie ou escolha uma lista para começar a organizar suas compras.</p>
        </div>
      `;
      container.innerHTML = '';
      return;
    }

    const totalItems = activeList.items?.length || 0;
    const purchasedItems = (activeList.items || []).filter((item) => item.purchased).length;
    const pendingItems = totalItems - purchasedItems;
    const totalSpent = (activeList.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const percentCompleted = totalItems ? Math.round((purchasedItems / totalItems) * 100) : 0;
    const categorySummary = (activeList.items || []).reduce((accumulator, item) => {
      accumulator[item.category] = (accumulator[item.category] || 0) + Number(item.price || 0) * Number(item.quantity || 0);
      return accumulator;
    }, {});

    header.innerHTML = `
      <div>
        <p class="eyebrow">Lista ativa</p>
        <h3>${escapeHtml(activeList.name)}</h3>
        <div class="item-meta">${totalItems} itens • ${purchasedItems} comprados • ${pendingItems} pendentes</div>
        <div class="progress-shell">
          <div class="progress-bar" style="width: ${percentCompleted}%;"></div>
        </div>
      </div>
      <div class="detail-stats">
        <div class="badge">${percentCompleted}% concluído</div>
        <div class="badge">Total ${formatCurrency(totalSpent)}</div>
      </div>
    `;

    const visibleItems = getVisibleItems(activeList, state.filters, state.sortBy);

    if (!visibleItems.length) {
      container.innerHTML = '<div class="empty-state">Nenhum item corresponde aos filtros aplicados.</div>';
      return;
    }

    const summaryMarkup = Object.entries(categorySummary).length
      ? `<div class="item-meta">Categorias: ${Object.entries(categorySummary).map(([name, value]) => `${escapeHtml(name)} · ${formatCurrency(value)}`).join(' | ')}</div>`
      : '';

    container.innerHTML = `
      <div class="item-meta">${summaryMarkup}</div>
      ${visibleItems.map((item) => {
        const purchasedClass = item.purchased ? 'purchased' : '';
        return `
          <article class="item-card ${purchasedClass}" data-item-id="${item.id}">
            <div class="item-main">
              <button class="item-check" type="button" data-action="toggle-item" data-item-id="${item.id}" aria-label="Marcar item"></button>
              <div class="item-info">
                <div class="item-title-row">
                  <span class="item-title">${escapeHtml(item.name)}</span>
                  <span class="badge">${escapeHtml(item.category)}</span>
                </div>
                <div class="item-meta">Qtd: ${item.quantity} • ${formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</div>
                ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ''}
              </div>
            </div>
            <div class="item-actions">
              <button type="button" data-action="edit-item" data-item-id="${item.id}" title="Editar item">✏️</button>
              <button type="button" data-action="delete-item" data-item-id="${item.id}" title="Excluir item">🗑️</button>
            </div>
          </article>
        `;
      }).join('')}
    `;
  }

  function getVisibleItems(list, filters, sortBy) {
    const items = list.items || [];
    const filtered = items.filter((item) => {
      const statusMatch = filters.status === 'all' || (filters.status === 'purchased' ? item.purchased : !item.purchased);
      const categoryMatch = filters.category === 'all' || item.category === filters.category;
      return statusMatch && categoryMatch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price') {
        return Number(a.price || 0) * Number(a.quantity || 0) - Number(b.price || 0) * Number(b.quantity || 0);
      }
      if (sortBy === 'category') {
        return (a.category || '').localeCompare(b.category || 'pt-BR');
      }
      return (a.name || '').localeCompare(b.name || 'pt-BR');
    });
  }

  function populateCategorySelect(select, categories, selectedCategory, includeAll = false) {
    select.innerHTML = '';

    if (includeAll) {
      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = 'Todas';
      if (selectedCategory === 'all') {
        allOption.selected = true;
      }
      select.appendChild(allOption);
    }

    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      if (category === selectedCategory) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toasts');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 2600);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
    if (!document.querySelector('.modal:not(.hidden)')) {
      document.body.classList.remove('modal-open');
    }
  }

  function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const messageElement = document.getElementById('confirmMessage');
    const confirmButton = document.getElementById('confirmAction');

    messageElement.textContent = message;
    confirmButton.onclick = () => {
      onConfirm();
      closeModal('confirmModal');
    };
    openModal('confirmModal');
  }

  function setThemeButton(theme) {
    const icon = document.getElementById('themeIcon');
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  global.UI = {
    renderDashboard,
    renderLists,
    renderCurrentList,
    populateCategorySelect,
    showToast,
    openModal,
    closeModal,
    showConfirmModal,
    setThemeButton,
    formatCurrency
  };
})(window);
