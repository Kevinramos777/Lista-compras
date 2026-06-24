(function (global) {
  const STORAGE_KEY = 'minha-lista-compras-state';

  function uid(prefix = 'id') {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createSampleLists() {
    return [];
  }

  function getDefaultCategories() {
    return ['Alimentação', 'Bebidas', 'Limpeza', 'Higiene', 'Farmácia', 'Casa', 'Outros'];
  }

  function createDefaultState() {
    return {
      version: 2,
      theme: 'light',
      categories: getDefaultCategories(),
      lists: createSampleLists()
    };
  }

  function normalizeItem(item) {
    return {
      id: item.id || uid('item'),
      name: item.name || '',
      quantity: Number(item.quantity) || 1,
      category: item.category || 'Outros',
      price: Number(item.price) || 0,
      note: item.note || '',
      purchased: Boolean(item.purchased)
    };
  }

  function normalizeList(list) {
    return {
      id: list.id || uid('list'),
      name: list.name || 'Nova lista',
      items: Array.isArray(list.items) ? list.items.map(normalizeItem) : []
    };
  }

  function ensureStateStructure(state) {
    const safeState = state && typeof state === 'object' ? state : {};
    const categories = Array.isArray(safeState.categories) && safeState.categories.length > 0 ? safeState.categories : getDefaultCategories();
    const lists = Array.isArray(safeState.lists) ? safeState.lists.map(normalizeList) : createSampleLists();

    return {
      version: 2,
      theme: safeState.theme === 'dark' ? 'dark' : 'light',
      categories,
      lists
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaultState = createDefaultState();
        saveState(defaultState);
        return defaultState;
      }

      const parsedState = JSON.parse(raw);
      if (!parsedState || typeof parsedState !== 'object' || parsedState.version !== 2) {
        const defaultState = createDefaultState();
        saveState(defaultState);
        return defaultState;
      }

      return ensureStateStructure(parsedState);
    } catch (error) {
      console.error('Falha ao carregar estado:', error);
      return createDefaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ensureStateStructure(state)));
    } catch (error) {
      console.error('Falha ao salvar estado:', error);
    }
  }

  global.StorageService = {
    loadState,
    saveState,
    ensureStateStructure,
    getDefaultCategories,
    createDefaultState,
    uid
  };
})(window);
