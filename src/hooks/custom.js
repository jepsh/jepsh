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

/**
 * Hook for monitoring store performance metrics
 * @param {string} storeName - Name of the store to monitor
 * @returns {Object} Performance metrics object
 */
function useStorePerformance(storeName) {
  const [metrics, setMetrics] = useState(`perf-${storeName}`, {
    updateCount: 0,
    lastUpdate: null,
    averageUpdateTime: 0,
  });

  useEffect(
    `perf-monitor-${storeName}`,
    () => {
      const store = globalStores.get(storeName);
      if (!store) return;

      let updateTimes = [];
      const startTime = performance.now();

      const unsubscribe = store.subscribe(() => {
        const updateTime = performance.now();
        updateTimes.push(updateTime - startTime);

        if (updateTimes.length > 100) {
          updateTimes = updateTimes.slice(-50);
        }

        setMetrics({
          updateCount: metrics.updateCount + 1,
          lastUpdate: new Date().toISOString(),
          averageUpdateTime: updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length,
        });
      });

      return unsubscribe;
    },
    [storeName]
  );

  return metrics;
}

export { useGlobalState, useStorePerformance };
