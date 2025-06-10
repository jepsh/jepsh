import { state as globalState, priority as PRIORITY, isDev } from "@/shared";
import { scheduleUpdate, enqueueBatchedUpdate, batchUpdates } from "@/scheduler";
import { captureError, createError } from "@/handler";

let isTransition = false;

/**
 * Deeply compares two values for equality.
 * @param {any} a - First value to compare.
 * @param {any} b - Second value to compare.
 * @returns {boolean} True if values are deeply equal, false otherwise.
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Compares two dependency arrays for equality.
 * @param {Array} deps1 - First dependencies array.
 * @param {Array} deps2 - Second dependencies array.
 * @returns {boolean} True if dependencies are equal, false otherwise.
 */
function areDepsEqual(deps1, deps2) {
  if (!deps1 && !deps2) return true;
  if (!deps1 || !deps2) return false;
  if (deps1.length !== deps2.length) return false;

  return deps1.every((dep, i) => deepEqual(dep, deps2[i]));
}

/**
 * Development-only warning logger.
 * @param {string} message - Warning message.
 * @param {string} [component] - Component name where warning occurred.
 * @param {any} [extra] - Additional debug information.
 */
function devWarn(message, component, extra) {
  if (!isDev) return;
  console.warn(`[Jepsh Warning] ${message}${component ? ` in ${component}` : ""}`, extra || "");
}

/**
 * Validates proper hook usage in development mode.
 * @param {string} hookName - Name of the hook being validated.
 * @param {string} key - Hook key being validated.
 * @param {Object} fiber - Current fiber node.
 */
function validateHookUsage(hookName, key, fiber) {
  if (!isDev) return;

  if (!fiber) {
    devWarn(`${hookName} called outside of component render`, "Unknown");
    return;
  }

  if (typeof key !== "string") {
    devWarn(`${hookName} expects a string key as first argument`, fiber.type?.name);
  }

  if (key && key.includes("__")) {
    devWarn(`${hookName} key contains reserved characters "__"`, fiber.type?.name);
  }

  if (key && key.length > 100) {
    devWarn(`${hookName} key is unusually long (${key.length} chars)`, fiber.type?.name);
  }
}

/**
 * Hook for handling asynchronous data with Suspense support.
 * @param {string} key - Unique identifier for the hook.
 * @param {Promise} promise - The promise to handle.
 * @returns {any} The resolved value of the promise.
 * @throws {Error} Throws if promise rejects or no Suspense boundary exists.
 */
function use(key, promise) {
  validateHookUsage("use", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "use must be called inside a component", "Unknown", key);
  }

  const hooks = globalState.wipFiber.hooks || {};
  const oldHook = globalState.wipFiber.alternate?.hooks?.[key] || null;

  if (oldHook?.status === "fulfilled") {
    hooks[key] = oldHook;
    globalState.wipFiber.hooks = hooks;
    return oldHook.value;
  }

  if (oldHook?.status === "rejected") {
    hooks[key] = oldHook;
    globalState.wipFiber.hooks = hooks;
    throw oldHook.reason;
  }

  const hook = oldHook || {
    promise,
    status: "pending",
    value: null,
    reason: null,
  };

  if (promise && typeof promise.then === "function" && hook.promise !== promise) {
    hook.promise = promise;
    hook.status = "pending";

    promise.then(
      (value) => {
        hook.status = "fulfilled";
        hook.value = value;
        try {
          scheduleUpdate(PRIORITY.NORMAL);
        } catch (error) {
          const enhanced = createError("HOOK", `Error scheduling update after promise resolution: ${error.message}`, globalState.wipFiber?.type?.name, key);
          if (!captureError(enhanced, globalState.wipFiber)) {
            console.error(enhanced);
          }
        }
      },
      (reason) => {
        hook.status = "rejected";
        hook.reason = reason;
        try {
          scheduleUpdate(PRIORITY.NORMAL);
        } catch (error) {
          const enhanced = createError("HOOK", `Error scheduling update after promise rejection: ${error.message}`, globalState.wipFiber?.type?.name, key);
          if (!captureError(enhanced, globalState.wipFiber)) {
            console.error(enhanced);
          }
        }
      }
    );
  } else {
    const error = createError("HOOK", "use() expects a thenable (promise-like object)", globalState.wipFiber?.type?.name, key);
    if (!captureError(error, globalState.wipFiber)) {
      throw error;
    }
  }

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;

  if (hook.status === "pending") {
    try {
      throw promise;
    } catch (error) {
      console.warn("Promise thrown but no Suspense boundary found. Consider implementing Suspense.");
      throw error;
    }
  }

  return hook.value;
}

/**
 * Hook for managing form action state with pending/error states.
 * @param {string} key - Unique identifier for the hook.
 * @param {Function} action - The async action function to manage.
 * @param {any} initial - Initial state value.
 * @returns {Array} [state, dispatch, isPending] tuple.
 */
function useActionState(key, action, initial) {
  validateHookUsage("useActionState", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useActionState must be called inside a component", "Unknown", key);
  }

  if (typeof action !== "function") {
    throw createError("HOOK", "useActionState expects a function as the action parameter", globalState.wipFiber?.type?.name, key);
  }

  const abortControllerRef = useRef(`${key}-abort`, null);
  const [state, setState] = useState(`${key}-state`, initial);
  const [isPending, setIsPending] = useState(`${key}-pending`, false);
  const [error, setError] = useState(`${key}-error`, null);

  const dispatch = async (formData) => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsPending(true);
      setError(null);

      try {
        const result = await action(state, formData);
        if (!signal.aborted) {
          setState(result);
        }
      } catch (err) {
        if (!signal.aborted) {
          const enhanced = createError("ACTION", `Error in action: ${err.message}`, globalState.wipFiber?.type?.name, key);
          setError(enhanced.message);
          if (!captureError(enhanced, globalState.wipFiber)) {
            console.error(enhanced);
          }
        }
      } finally {
        if (!signal.aborted) {
          setIsPending(false);
        }
        abortControllerRef.current = null;
      }
    } catch (error) {
      const enhanced = createError("HOOK", `Error in useActionState dispatch: ${error.message}`, globalState.wipFiber?.type?.name, key);
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
      }
    }
  };

  useEffect(
    `${key}-cleanup`,
    () => {
      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    },
    []
  );

  return [state, dispatch, isPending, error];
}

/**
 * Hook that returns a memoized callback.
 * @param {string} key - Unique identifier for the hook.
 * @param {Function} callback - The function to memoize.
 * @param {Array} deps - Dependency array for memoization.
 * @returns {Function} Memoized callback function.
 */
function useCallback(key, callback, deps) {
  return useMemo(key, () => callback, deps);
}

/**
 * Hook to access context values.
 * @param {Object} context - Context object created by createContext.
 * @returns {any} The current context value.
 * @throws {Error} If context is invalid.
 */
function useContext(context) {
  if (!globalState.wipFiber) {
    throw createError("HOOK", "useContext must be called inside a component", "Unknown", "useContext");
  }

  if (!context || !context._context) {
    throw createError("HOOK", "useContext must be used with a valid context object", globalState.wipFiber?.type?.name, "useContext");
  }

  return context._context._currentValue;
}

/**
 * Hook for displaying debug information in development.
 * @param {string} key - Unique identifier for the hook.
 * @param {any} value - The value to display.
 * @param {Function} [formatter] - Optional formatter function.
 */
function useDebugValue(key, value, formatter) {
  const display = formatter ? formatter(value) : value;
  console.log(`[useDebugValue] ${key}:`, display);
}

/**
 * Hook that defers updates to non-urgent values.
 * @param {string} key - Unique identifier for the hook.
 * @param {any} value - The value to defer.
 * @returns {any} The deferred value.
 */
function useDeferredValue(key, value) {
  const hooks = globalState.wipFiber.hooks || {};
  const targetValueRef = useRef(`${key}-target`, value);
  const [deferredValue, setDeferredValue] = useState(`${key}-deferred`, value);
  const timeoutRef = useRef(`${key}-timeout`, null);

  useEffect(
    `${key}-deferEffect`,
    () => {
      targetValueRef.current = value;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (isTransition) {
        if (deferredValue !== value) {
          timeoutRef.current = setTimeout(() => {
            setDeferredValue(targetValueRef.current);
            timeoutRef.current = null;
          }, 5);
        }
      } else {
        if (deferredValue !== value) {
          setDeferredValue(value);
        }
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    },
    [value, isTransition]
  );

  const hook = {
    deferredValue,
    targetValue: targetValueRef.current,
  };

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
  return deferredValue;
}

/**
 * Hook for side effects in function components.
 * @param {string} key - Unique identifier for the hook.
 * @param {Function} callback - The effect callback.
 * @param {Array} [deps] - Optional dependency array.
 */
function useEffect(key, callback, deps) {
  validateHookUsage("useEffect", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useEffect must be called inside a component", "Unknown", key);
  }

  const hooks = globalState.wipFiber.hooks || {};
  const oldHook = globalState.wipFiber.alternate?.hooks?.[key] || null;

  let depsChanged = true;
  if (oldHook?.dependencies && deps) {
    depsChanged = !areDepsEqual(deps, oldHook.dependencies);
  } else if (oldHook && !deps && !oldHook.dependencies) {
    depsChanged = false;
  }

  const hook = {
    callback,
    dependencies: deps ? [...deps] : null,
    cleanup: oldHook?.cleanup || null,
    hasRun: false,
  };

  if (depsChanged) {
    if (oldHook?.cleanup && typeof oldHook.cleanup === "function") {
      try {
        oldHook.cleanup();
      } catch (error) {
        const enhanced = createError("EFFECT", `Error in effect cleanup: ${error.message}`, globalState.wipFiber?.type?.name, key);
        if (!captureError(enhanced, globalState.wipFiber)) {
          console.error(enhanced);
        }
      }
    }

    hook.needsToRun = true;
  } else {
    hook.cleanup = oldHook?.cleanup;
    hook.hasRun = true;
    hook.needsToRun = false;
  }

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
}

/**
 * Hook to customize the instance value exposed to parent components.
 * @param {string} key - Unique identifier for the hook.
 * @param {Object} ref - Ref object to attach handle to.
 * @param {Function} createHandle - Function that creates the handle.
 * @param {Array} deps - Dependency array.
 */
function useImperativeHandle(key, ref, createHandle, deps) {
  validateHookUsage("useImperativeHandle", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useImperativeHandle must be called inside a component", "Unknown", key);
  }

  if (typeof createHandle !== "function") {
    throw createError("HOOK", "useImperativeHandle expects a function to create the handle", globalState.wipFiber?.type?.name, key);
  }

  const hooks = globalState.wipFiber.hooks || {};
  const oldHook = globalState.wipFiber.alternate?.hooks?.[key] || null;

  const hook = {
    createHandle,
    dependencies: deps ? [...deps] : null,
    ref,
  };

  let depsChanged = true;
  if (oldHook?.dependencies && deps) {
    depsChanged = !areDepsEqual(deps, oldHook.dependencies);
  } else if (!oldHook?.dependencies && !deps) {
    depsChanged = false;
  }

  if (depsChanged && ref && typeof ref === "object") {
    try {
      const handle = createHandle();
      ref.current = handle;
    } catch (error) {
      const enhanced = createError("IMPERATIVE", `Error creating imperative handle: ${error.message}`, globalState.wipFiber?.type?.name, key);
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
      }
    }
  }

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
}

/**
 * Hook for synchronous DOM mutations before layout effects.
 * @param {string} key - Unique identifier for the hook.
 * @param {Function} callback - The insertion effect callback.
 * @param {Array} deps - Dependency array.
 */
function useInsertionEffect(key, callback, deps) {
  validateHookUsage("useInsertionEffect", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useInsertionEffect must be called inside a component", "Unknown", key);
  }

  if (typeof callback !== "function") {
    throw createError("HOOK", "useInsertionEffect expects a function as first argument", globalState.wipFiber?.type?.name, key);
  }

  const hooks = globalState.wipFiber.hooks || {};
  const oldHook = globalState.wipFiber.alternate?.hooks?.[key] || null;

  const hook = {
    callback,
    dependencies: deps ? [...deps] : null,
    cleanup: null,
  };

  let depsChanged = true;
  if (oldHook?.dependencies && deps) {
    depsChanged = !areDepsEqual(deps, oldHook.dependencies);
  } else if (!oldHook?.dependencies && !deps) {
    depsChanged = false;
  }

  if (depsChanged) {
    if (oldHook?.cleanup && typeof oldHook.cleanup === "function") {
      try {
        oldHook.cleanup();
      } catch (error) {
        const enhanced = createError("EFFECT", `Error in useInsertionEffect cleanup: ${error.message}`, globalState.wipFiber?.type?.name, key);
        if (!captureError(enhanced, globalState.wipFiber)) {
          console.error(enhanced);
        }
      }
    }

    try {
      const cleanup = callback();
      if (typeof cleanup === "function") {
        hook.cleanup = cleanup;
      }
    } catch (error) {
      const enhanced = createError("EFFECT", `Error in useInsertionEffect callback: ${error.message}`, globalState.wipFiber?.type?.name, key);
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
      }
    }
  } else {
    hook.cleanup = oldHook?.cleanup;
  }

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
  globalState.wipFiber.insertionEffects = globalState.wipFiber.insertionEffects || {};
  globalState.wipFiber.insertionEffects[key] = hook;
}

/**
 * Hook for synchronous DOM measurements and mutations.
 * @param {string} key - Unique identifier for the hook.
 * @param {Function} callback - The layout effect callback.
 * @param {Array} deps - Dependency array.
 */
function useLayoutEffect(key, callback, deps) {
  validateHookUsage("useLayoutEffect", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useLayoutEffect must be called inside a component", "Unknown", key);
  }

  if (typeof callback !== "function") {
    throw createError("HOOK", "useLayoutEffect expects a function as first argument", globalState.wipFiber?.type?.name, key);
  }

  const hooks = globalState.wipFiber.hooks || {};
  const oldHook = globalState.wipFiber.alternate?.hooks?.[key] || null;

  const hook = {
    callback,
    dependencies: deps ? [...deps] : null,
    cleanup: null,
  };

  let depsChanged = true;
  if (oldHook?.dependencies && deps) {
    depsChanged = !areDepsEqual(deps, oldHook.dependencies);
  } else if (!oldHook?.dependencies && !deps) {
    depsChanged = false;
  }

  if (depsChanged) {
    if (oldHook?.cleanup && typeof oldHook.cleanup === "function") {
      try {
        oldHook.cleanup();
      } catch (error) {
        const enhanced = createError("EFFECT", `Error in useLayoutEffect cleanup: ${error.message}`, globalState.wipFiber?.type?.name, key);
        if (!captureError(enhanced, globalState.wipFiber)) {
          console.error(enhanced);
        }
      }
    }

    try {
      const cleanup = callback();
      if (typeof cleanup === "function") {
        hook.cleanup = cleanup;
      }
    } catch (error) {
      const enhanced = createError("EFFECT", `Error in useLayoutEffect callback: ${error.message}`, globalState.wipFiber?.type?.name, key);
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
      }
    }
  } else {
    hook.cleanup = oldHook?.cleanup;
  }

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
  globalState.wipFiber.layoutEffects = globalState.wipFiber.layoutEffects || {};
  globalState.wipFiber.layoutEffects[key] = hook;
}

/**
 * Hook that memoizes a value.
 * @param {string} key - Unique identifier for the hook.
 * @param {Function} factory - Function that creates the value.
 * @param {Array} deps - Dependency array.
 * @returns {any} The memoized value.
 */
function useMemo(key, factory, deps) {
  validateHookUsage("useMemo", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useMemo must be called inside a component", "Unknown", key);
  }

  if (typeof factory !== "function") {
    throw createError("HOOK", "useMemo expects a function as first argument", globalState.wipFiber?.type?.name, key);
  }

  const hooks = globalState.wipFiber.hooks || {};
  const oldHook = globalState.wipFiber.alternate?.hooks?.[key] || null;
  const hasChanged = !oldHook || !deps || !oldHook.deps || !areDepsEqual(deps, oldHook.deps);

  let memoizedValue;
  if (hasChanged) {
    try {
      memoizedValue = factory();
    } catch (error) {
      const enhanced = createError("MEMO", `Error in useMemo factory: ${error.message}`, globalState.wipFiber?.type?.name, key);
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
        if (oldHook?.value !== undefined) {
          memoizedValue = oldHook.value;
        } else {
          throw enhanced;
        }
      }
    }
  } else {
    memoizedValue = oldHook.value;
  }

  const hook = {
    value: memoizedValue,
    deps,
  };

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
  return hook.value;
}

/**
 * Hook for optimistic UI updates.
 * @param {string} key - Unique identifier for the hook.
 * @param {any} state - The current globalState.
 * @param {Function} [updateFn] - Optional state update function.
 * @returns {Array} [optimisticState, addOptimistic] tuple.
 */
function useOptimistic(key, state, updateFn) {
  const timeoutRef = useRef(`${key}-timeout`, null);
  const [optimisticState, setOptimisticState] = useState(`${key}-optimistic`, state);
  const [isOptimistic, setIsOptimistic] = useState(`${key}-isOptimistic`, false);

  useEffect(
    `${key}-sync`,
    () => {
      if (!isOptimistic) {
        setOptimisticState(state);
      }
    },
    [state]
  );

  const addOptimistic = (action) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsOptimistic(true);
    const newState = updateFn ? updateFn(optimisticState, action) : action;
    setOptimisticState(newState);

    timeoutRef.current = setTimeout(() => {
      setIsOptimistic(false);
      setOptimisticState(state);
      timeoutRef.current = null;
    }, 1000);
  };

  useEffect(
    `${key}-cleanup`,
    () => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    },
    []
  );

  return [optimisticState, addOptimistic];
}

/**
 * Hook for state management with reducer pattern.
 * @param {string} key - Unique identifier for the hook.
 * @param {Function} reducer - The reducer function.
 * @param {any} initial - Initial state value.
 * @returns {Array} [state, dispatch] tuple.
 */
function useReducer(key, reducer, initial) {
  validateHookUsage("useReducer", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useReducer must be called inside a component", "Unknown", key);
  }

  if (typeof reducer !== "function") {
    throw createError("HOOK", "useReducer expects a reducer function as first argument", globalState.wipFiber?.type?.name, key);
  }

  const hooks = globalState.wipFiber.hooks || {};
  const oldHook = globalState.wipFiber.alternate?.hooks?.[key] || null;

  const hook = hooks[key] || {
    state: oldHook?.state !== undefined ? oldHook.state : initial,
    queue: oldHook?.queue || [],
  };

  const actions = [...hook.queue];
  hook.queue = [];

  actions.forEach((action) => {
    try {
      hook.state = reducer(hook.state, action);
    } catch (error) {
      const enhanced = createError("REDUCER", `Error in reducer: ${error.message}`, globalState.wipFiber?.type?.name, key);
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
        return; // eslint-disable-line no-useless-return
      }
    }
  });

  const dispatch = (action) => {
    try {
      hook.queue.push(action);
      batchUpdates(() => {
        enqueueBatchedUpdate(isTransition ? PRIORITY.LOW : PRIORITY.NORMAL);
      });
    } catch (error) {
      const enhanced = createError("HOOK", `Error in useReducer dispatch: ${error.message}`, globalState.wipFiber?.type?.name, key);
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
      }
    }
  };

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
  return [hook.state, dispatch];
}

/**
 * Hook that creates a mutable ref object.
 * @param {string} key - Unique identifier for the hook.
 * @param {any} initial - Initial ref value.
 * @returns {Object} Ref object with current property.
 */
function useRef(key, initial) {
  validateHookUsage("useRef", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useRef must be called inside a component", "Unknown", key);
  }

  const hooks = globalState.wipFiber.hooks || {};
  const oldHook = globalState.wipFiber.alternate?.hooks?.[key] || null;
  const hook = {
    current: oldHook?.current || initial,
  };

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
  return hook;
}

/**
 * Hook for state management in function components.
 * @param {string} key - Unique identifier for the hook.
 * @param {any} initial - Initial state value.
 * @returns {Array} [state, setState] tuple.
 */
function useState(key, initial) {
  validateHookUsage("useState", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useState must be called inside a component", "Unknown", key);
  }

  const hooks = globalState.wipFiber.hooks || {};
  const oldHook = globalState.wipFiber.alternate?.hooks?.[key] || null;

  const hook = hooks[key] || {
    state: oldHook?.state !== undefined ? oldHook.state : initial,
    queue: oldHook?.queue || [],
  };

  const actions = [...hook.queue];
  hook.queue = [];

  actions.forEach((action) => {
    try {
      hook.state = typeof action === "function" ? action(hook.state) : action;
    } catch (error) {
      const enhanced = createError("HOOK", `Error in useState updater: ${error.message}`, globalState.wipFiber?.type?.name, key);
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
      }
    }
  });

  const setState = (action) => {
    try {
      hook.queue.push(action);
      batchUpdates(() => {
        enqueueBatchedUpdate(isTransition ? PRIORITY.LOW : PRIORITY.NORMAL);
      });
    } catch (error) {
      const enhanced = createError("HOOK", `Error in setState: ${error.message}`, globalState.wipFiber?.type?.name, key);
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
      }
    }
  };

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
  return [hook.state, setState];
}

/**
 * Hook for marking non-urgent state updates.
 * @param {string} key - Unique identifier for the hook.
 * @returns {Array} [isPending, startTransition] tuple.
 */
function useTransition(key) {
  validateHookUsage("useTransition", key, globalState.wipFiber);

  if (!globalState.wipFiber) {
    throw createError("HOOK", "useTransition must be called inside a component", "Unknown", key);
  }

  const pendingTransitions = new Set();
  const hooks = globalState.wipFiber.hooks || {};
  const [isPending, setIsPending] = useState(`${key}-pending`, false);

  const hook = {
    isPending,
    startTransition: (callback) => {
      if (typeof callback !== "function") {
        const error = createError("TRANSITION", "startTransition expects a callback function", globalState.wipFiber?.type?.name, key);
        if (!captureError(error, globalState.wipFiber)) {
          console.error(error);
        }
        return;
      }

      try {
        setIsPending(true);
        const transitionId = Math.random().toString(36);
        pendingTransitions.add(transitionId);

        isTransition = true;

        try {
          callback();
        } catch (error) {
          const enhanced = createError("TRANSITION", `Error in transition callback: ${error.message}`, globalState.wipFiber?.type?.name, key);
          if (!captureError(enhanced, globalState.wipFiber)) {
            console.error(enhanced);
          }
        } finally {
          isTransition = false;
        }

        setTimeout(() => {
          pendingTransitions.delete(transitionId);
          if (pendingTransitions.size === 0) {
            setIsPending(false);
          }
        }, 0);
      } catch (error) {
        const enhanced = createError("HOOK", `Error in useTransition: ${error.message}`, globalState.wipFiber?.type?.name, key);
        if (!captureError(enhanced, globalState.wipFiber)) {
          console.error(enhanced);
        }
      }
    },
  };

  hooks[key] = hook;
  globalState.wipFiber.hooks = hooks;
  return [hook.isPending, hook.startTransition];
}

export {
  use,
  useActionState,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useRef,
  useState,
  useTransition,
};
