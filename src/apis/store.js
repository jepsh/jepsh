import { globalStores, storeSubscriptions, isDev } from "@/core/constants";

/**
 * Creates a global state store
 * @param {Object} initialState - Initial state object
 * @param {Object} [options={}] - Store configuration options
 * @param {string} [options.name] - Store name for identification
 * @param {Array<Function>} [options.middleware=[]] - Middleware functions
 * @param {boolean} [options.devTools] - Enable development tools
 * @returns {Object} Store object with getState, setState, subscribe, dispatch methods
 */
function createGlobalStore(initialState, options = {}) {
  const { name = `store-${Date.now()}`, middleware = [], devTools = isDev } = options;

  if (globalStores.has(name)) {
    console.warn(`[WTFact] Store "${name}" already exists. Returning existing store.`);
    return globalStores.get(name);
  }

  let state = { ...initialState };
  const subscribers = new Set();
  const stateHistory = devTools ? [{ ...state }] : [];

  const store = {
    getState: () => ({ ...state }),
    setState: (updater, actionName = "setState") => {
      const prevState = { ...state };

      if (typeof updater === "function") {
        state = { ...state, ...updater(prevState) };
      } else {
        state = { ...state, ...updater };
      }

      middleware.forEach((mw) => {
        try {
          const result = mw(prevState, state, actionName);
          if (result !== undefined) {
            state = result;
          }
        } catch (error) {
          console.error(`[WTFact] Middleware error:`, error);
        }
      });

      if (devTools) {
        stateHistory.push({ ...state });
        if (stateHistory.length > 50) {
          stateHistory.shift();
        }
      }

      subscribers.forEach((callback) => {
        try {
          callback(state, prevState);
        } catch (error) {
          console.error(`[WTFact] Store subscriber error:`, error);
        }
      });
    },
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    getHistory: () => (devTools ? [...stateHistory] : []),
    dispatch: (action) => {
      if (typeof action === "function") {
        return action(store.setState, store.getState);
      }

      if (action && action.type) {
        store.setState(action.payload || {}, action.type);
      } else {
        console.warn("[WTFact] Invalid action dispatched:", action);
      }
    },
  };

  globalStores.set(name, store);
  storeSubscriptions.set(name, subscribers);

  return store;
}

export { createGlobalStore };
