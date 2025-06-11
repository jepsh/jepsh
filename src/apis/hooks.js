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
 * Creates a set of hooks for a component.
 * @param {string} name - The name of the component for hook key generation.
 * @returns {{
 *   use: (promise: Promise<any>) => any,
 *   useActionState: (action: (state: any, formData: any) => Promise<any>, initial: any) => [any, (formData: any) => Promise<void>, boolean, Error | null],
 *   useCallback: (callback: Function, deps: any[]) => Function,
 *   useContext: (context: { _context: { _currentValue: any } }) => any,
 *   useDebugValue: (value: any, formatter?: (value: any) => any) => void,
 *   useDeferredValue: (value: any) => any,
 *   useEffect: (callback: () => void | (() => void), deps: any[] | null) => void,
 *   useImperativeHandle: (ref: { current: any }, createHandle: () => any, deps: any[] | null) => void,
 *   useInsertionEffect: (callback: () => void | (() => void), deps: any[] | null) => void,
 *   useLayoutEffect: (callback: () => void | (() => void), deps: any[] | null) => void,
 *   useMemo: (factory: () => any, deps: any[] | null) => any,
 *   useOptimistic: (state: any, updateFn?: (state: any, action: any) => any) => [any, (action: any) => void],
 *   useReducer: (reducer: (state: any, action: any) => any, initial: any) => [any, (action: any) => void],
 *   useRef: (initial: any) => { current: any },
 *   useState: (initial: any) => [any, (action: any | ((state: any) => any)) => void],
 *   useTransition: () => [boolean, (callback: () => void) => void]
 * }} The hooks object.
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
    use: (promise) => use(getKey("use"), promise),
    useActionState: (action, initial) => useActionState(getKey("useActionState"), action, initial),
    useCallback: (callback, deps) => useCallback(getKey("useCallback"), callback, deps),
    useContext: (context) => useContext(context),
    useDebugValue: (value, formatter) => useDebugValue(getKey("useDebugValue"), value, formatter),
    useDeferredValue: (value) => useDeferredValue(getKey("useDeferredValue"), value),
    useEffect: (callback, deps) => useEffect(getKey("useEffect"), callback, deps),
    useImperativeHandle: (ref, createHandle, deps) => useImperativeHandle(getKey("useImperativeHandle"), ref, createHandle, deps),
    useInsertionEffect: (callback, deps) => useInsertionEffect(getKey("useInsertionEffect"), callback, deps),
    useLayoutEffect: (callback, deps) => useLayoutEffect(getKey("useLayoutEffect"), callback, deps),
    useMemo: (factory, deps) => useMemo(getKey("useMemo"), factory, deps),
    useOptimistic: (state, updateFn) => useOptimistic(getKey("useOptimistic"), state, updateFn),
    useReducer: (reducer, initial) => useReducer(getKey("useReducer"), reducer, initial),
    useRef: (initial) => useRef(getKey("useRef"), initial),
    useState: (initial) => useState(getKey("useState"), initial),
    useTransition: () => useTransition(getKey("useTransition")),
  };
}

export { createHooks };
