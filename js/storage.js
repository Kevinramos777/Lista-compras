(function (global) {
  const STORAGE_KEY = 'minha-lista-compras-state';

  function uid(prefix = 'id') {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createSampleLists() {
    return [
      {
        id: uid('list'),
        name: 'Mercado',
        items: [
          { id: uid('item'), name: 'Arroz', quantity: 2, category: 'Alimentação', price: 8.5, note: 'Tipo integral', purchased: false },
          { id: uid('item'), name: 'Leite', quantity: 3, category: 'Bebidas', price: 4.2, note: '', purchased: true },
          { id: uid('item'), name: 'Sabão', quantity: 1, category: 'Limpeza', price: 6.9, note: 'Neutro', purchased: false }
        ]
      },
      {
        id: uid('list'),
        name: 'Churrasco',
        items: [
          { id: uid('item'), name: 'Carne', quantity: 2, category: 'Alimentação', price: 34.9, note: 'Picanha', purchased: false },
          { id: uid('item'), name: 'Refrigerante', quantity: 6, category: 'Bebidas', price: 3.5, note: '', purchased: false }
        ]
      },
      {
        id: uid('list'),
        name: 'Farmácia',
        items: [
          { id: uid('item'), name: 'Dipirona', quantity: 1, category: 'Farmácia', price: 12.5, note: 'Comprimidos', purchased: true }
        ]
      }
    ];
  }

  function getDefaultCategories() {
    return ['Alimentação', 'Bebidas', 'Limpeza', 'Higiene', 'Farmácia', 'Casa', 'Outros'];
  }

  function createDefaultState() {
    return {
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
      return ensureStateStructure(JSON.parse(raw));
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
