import { useState, useEffect } from "./basic";
import { deepEqual } from "./helpers";

import { state as globalState } from "@/shared/global";
import { globalStores } from "@/core/constants";
import { createError } from "@/utils/error";

/**
 * Hook for accessing global store state
 * @param {string|Function} storeNameOrSelector - Store name or selector function
 * @param {Function} [selector] - State selector function (if first param is store name)
 * @returns {Array} Array containing [selectedState, setState, store]
 * @throws {Error} When store is not found
 */
function useGlobalState(storeNameOrSelector, selector) {
  let storeName, selectorFn;

  if (typeof storeNameOrSelector === "string") {
    storeName = storeNameOrSelector;
    selectorFn = selector || ((state) => state);
  } else {
    storeName = "default";
    selectorFn = storeNameOrSelector;
  }

  const store = globalStores.get(storeName);
  if (!store) {
    throw createError("STORE", `Global store "${storeName}" not found. Create it first with createGlobalStore.`, globalState.wipFiber?.type?.name, "useGlobalState");
  }

  const [selectedState, setSelectedState] = useState(`global-${storeName}`, () => {
    try {
      return selectorFn(store.getState());
    } catch (error) {
      console.error(`[WTFact] Selector error in useGlobalState:`, error);
      return undefined;
    }
  });

  useEffect(
    `global-subscription-${storeName}`,
    () => {
      const unsubscribe = store.subscribe((newState, prevState) => {
        try {
          const newSelected = selectorFn(newState);
          const prevSelected = selectorFn(prevState);

          if (!deepEqual(newSelected, prevSelected)) {
            setSelectedState(newSelected);
          }
        } catch (error) {
          console.error(`[WTFact] Selector error in subscription:`, error);
        }
      });

      return unsubscribe;
    },
    []
  );

  const setState = (updater, actionName) => {
    store.setState(updater, actionName);
  };

  return [selectedState, setState, store];
}

export { useGlobalState };
