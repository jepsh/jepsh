import { state as globalState } from "@/shared";
import {
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
} from "@/hooks";
import { createError } from "@/handler";

/**
 * Creates a collection of hooks with automatic key generation.
 * @param {string} [name] - Optional name prefix for hook keys.
 * @returns {Object} Object containing all hooks with auto-generated keys.
 * @throws {Error} If called outside of a component render.
 */
function createHooks(name) {
  if (!globalState.wipFiber) {
    throw createError("HOOK", "Hooks must be called inside a component", "Unknown", "createHooks");
  }

  const getKey = (hookName) => {
    if (!globalState.componentHookCounters.has(globalState.wipFiber)) {
      globalState.componentHookCounters.set(globalState.wipFiber, { counter: 0 });
    }

    const hookCounter = globalState.componentHookCounters.get(globalState.wipFiber);
    const currentIndex = hookCounter.counter++;

    if (!name) {
      const componentName = globalState.wipFiber.type?.name || "Anonymous";
      return `${hookName}_${componentName}_${currentIndex}`;
    } else {
      return `${hookName}_${name}_${currentIndex}`;
    }
  };

  return {
    /**
     * Hook for handling asynchronous data with Suspense support.
     * @param {Promise} promise - The promise to handle.
     * @returns {any} The resolved value of the promise.
     * @throws {Error} Throws if promise rejects or no Suspense boundary exists.
     */
    use: (promise) => use(getKey("use"), promise),
    /**
     * Hook for managing form action state with pending/error states.
     * @param {Function} action - The async action function to manage.
     * @param {any} initial - Initial state value.
     * @returns {Array} [state, dispatch, isPending] tuple.
     */
    useActionState: (action, initial) => useActionState(getKey("useActionState"), action, initial),
    /**
     * Hook that returns a memoized callback.
     * @param {Function} callback - The function to memoize.
     * @param {Array} deps - Dependency array for memoization.
     * @returns {Function} Memoized callback function.
     */
    useCallback: (callback, deps) => useCallback(getKey("useCallback"), callback, deps),
    /**
     * Hook to access context values.
     * @param {Object} context - Context object created by createContext.
     * @returns {any} The current context value.
     * @throws {Error} If context is invalid.
     */
    useContext: (context) => useContext(context),
    /**
     * Hook for displaying debug information in development.
     * @param {any} value - The value to display.
     * @param {Function} [formatter] - Optional formatter function.
     */
    useDebugValue: (value, formatter) => useDebugValue(getKey("useDebugValue"), value, formatter),
    /**
     * Hook that defers updates to non-urgent values.
     * @param {any} value - The value to defer.
     * @returns {any} The deferred value.
     */
    useDeferredValue: (value) => useDeferredValue(getKey("useDeferredValue"), value),
    /**
     * Hook for side effects in function components.
     * @param {Function} callback - The effect callback.
     * @param {Array} [deps] - Optional dependency array.
     */
    useEffect: (callback, deps) => useEffect(getKey("useEffect"), callback, deps),
    /**
     * Hook to customize the instance value exposed to parent components.
     * @param {Object} ref - Ref object to attach handle to.
     * @param {Function} createHandle - Function that creates the handle.
     * @param {Array} deps - Dependency array.
     */
    useImperativeHandle: (ref, createHandle, deps) => useImperativeHandle(getKey("useImperativeHandle"), ref, createHandle, deps),
    /**
     * Hook for synchronous DOM mutations before layout effects.
     * @param {Function} callback - The insertion effect callback.
     * @param {Array} deps - Dependency array.
     */
    useInsertionEffect: (callback, deps) => useInsertionEffect(getKey("useInsertionEffect"), callback, deps),
    /**
     * Hook for synchronous DOM measurements and mutations.
     * @param {Function} callback - The layout effect callback.
     * @param {Array} deps - Dependency array.
     */
    useLayoutEffect: (callback, deps) => useLayoutEffect(getKey("useLayoutEffect"), callback, deps),
    /**
     * Hook that memoizes a value.
     * @param {Function} factory - Function that creates the value.
     * @param {Array} deps - Dependency array.
     * @returns {any} The memoized value.
     */
    useMemo: (factory, deps) => useMemo(getKey("useMemo"), factory, deps),
    /**
     * Hook for optimistic UI updates.
     * @param {any} state - The current globalState.
     * @param {Function} [updateFn] - Optional state update function.
     * @returns {Array} [optimisticState, addOptimistic] tuple.
     */
    useOptimistic: (state, updateFn) => useOptimistic(getKey("useOptimistic"), state, updateFn),
    /**
     * Hook for state management with reducer pattern.
     * @param {Function} reducer - The reducer function.
     * @param {any} initial - Initial state value.
     * @returns {Array} [state, dispatch] tuple.
     */
    useReducer: (reducer, initial) => useReducer(getKey("useReducer"), reducer, initial),
    /**
     * Hook that creates a mutable ref object.
     * @param {any} initial - Initial ref value.
     * @returns {Object} Ref object with current property.
     */
    useRef: (initial) => useRef(getKey("useRef"), initial),
    /**
     * Hook for state management in function components.
     * @param {any} initial - Initial state value.
     * @returns {Array} [state, setState] tuple.
     */
    useState: (initial) => useState(getKey("useState"), initial),
    /**
     * Hook for marking non-urgent state updates.
     * @returns {Array} [isPending, startTransition] tuple.
     */
    useTransition: () => useTransition(getKey("useTransition")),
  };
}

export { createHooks };
