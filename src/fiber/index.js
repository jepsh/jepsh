import { state as globalState } from "@/shared";
import { queueEffect } from "@/scheduler";
import { captureError, enhanceError } from "@/handler";

/**
 * Reconciles children elements with the fiber tree.
 * @param {Object} wipFiber - The work-in-progress fiber node.
 * @param {Array} elements - Child elements to reconcile.
 */
function reconcileChildren(wipFiber, elements) {
  elements = Array.isArray(elements) ? elements : elements != null ? [elements] : [];

  const oldChildrenMap = new Map();
  const oldChildrenArray = [];

  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let index = 0;

  while (oldFiber) {
    const key = oldFiber.key != null ? oldFiber.key : index;
    oldChildrenMap.set(key, oldFiber);
    oldChildrenArray.push(oldFiber);
    oldFiber = oldFiber.sibling;
    index++;
  }

  let prevSibling = null;
  const newChildren = [];

  elements.forEach((element, i) => {
    if (!element) return;

    const key = element.key != null ? element.key : i;
    const old = oldChildrenMap.get(key);

    let newFiber = null;
    const sameType = old && element && element.type === old.type;

    if (sameType) {
      newFiber = {
        type: old.type,
        key: key,
        props: element.props || {},
        dom: old.dom,
        parent: wipFiber,
        alternate: old,
        effectTag: "UPDATE",
        hooks: old.hooks,
      };
    }

    if (element && !sameType) {
      newFiber = {
        type: element.type,
        key: key,
        props: element.props || {},
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
        hooks: {},
      };
    }

    if (old && !sameType) {
      if (old.effectTag !== "DELETION") {
        old.effectTag = "DELETION";
        globalState.deletions.push(old);
      }
    }

    if (old) oldChildrenMap.delete(key);

    if (newFiber) {
      if (i === 0) {
        wipFiber.child = newFiber;
      } else if (prevSibling) {
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
      newChildren.push(newFiber);
    }
  });

  oldChildrenMap.forEach((child) => {
    child.effectTag = "DELETION";
    globalState.deletions.push(child);
  });
}

/**
 * Resets the hook counter for a given fiber node.
 * @param {Object} fiber - The fiber node to reset counters for.
 */
function resetHookCounter(fiber) {
  if (globalState.componentHookCounters.has(fiber)) {
    globalState.componentHookCounters.get(fiber).counter = 0;
  }
}

/**
 * Updates a function component's fiber node.
 * @param {Object} fiber - The fiber node to update.
 */
function updateFunctionComponent(fiber) {
  globalState.wipFiber = fiber;
  fiber.hookCounter = 0;
  globalState.wipFiber.hooks = globalState.wipFiber.hooks || {};
  globalState.wipFiber.layoutEffects = globalState.wipFiber.layoutEffects || {};
  globalState.wipFiber.insertionEffects = globalState.wipFiber.insertionEffects || {};

  resetHookCounter(fiber);

  let children;

  try {
    if (fiber.type.name === "Provider" || fiber.props?.context) {
      const ctx = fiber.props.context;
      if (ctx) ctx._currentValue = fiber.props.value;
    }

    children = fiber.type(fiber.props || {});
  } catch (error) {
    const enhanced = enhanceError(error, {
      component: fiber.type.name || "Anonymous",
      phase: "render",
      fiber: fiber,
    });

    if (captureError(enhanced, fiber)) {
      children = [];
    } else {
      throw enhanced;
    }
  }

  if (children !== undefined) {
    const normalizedChildren = Array.isArray(children) ? children : children != null ? [children] : [];
    reconcileChildren(fiber, normalizedChildren);

    if (fiber.hooks) {
      Object.keys(fiber.hooks).forEach((key) => {
        const hook = fiber.hooks[key];
        if (hook && hook.needsToRun && hook.callback && typeof hook.callback === "function") {
          queueEffect(hook);
        }
      });
    }
  }
}

/**
 * Updates a host component's fiber node.
 * @param {Object} fiber - The fiber node to update.
 * @param {Function} createDom - Function to create DOM nodes.
 */
function updateHostComponent(fiber, createDom) {
  if (!fiber.dom && fiber.type !== "FRAGMENT" && fiber.type !== "CONTEXT_PROVIDER") {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children || []);
}

/**
 * Performs a unit of work in the render process.
 * @param {Object} fiber - The current fiber node.
 * @param {Function} createDom - Function to create DOM nodes.
 * @returns {Object|null} The next unit of work or null if complete.
 */
function performUnitOfWork(fiber, createDom) {
  const isFunctionComponent = fiber.type instanceof Function;
  const isFragment = fiber.type === "FRAGMENT";
  const isContextProvider = fiber.type === "CONTEXT_PROVIDER";

  try {
    if (isFunctionComponent) {
      updateFunctionComponent(fiber);
    } else if (isFragment || isContextProvider) {
      reconcileChildren(fiber, fiber.props.children || []);
    } else {
      updateHostComponent(fiber, createDom);
    }
  } catch (error) {
    const enhanced = enhanceError(error, {
      component: fiber.type?.name || "Unknown",
      phase: "reconciliation",
      fiber: fiber,
    });

    if (!captureError(enhanced, fiber)) {
      console.error("[Jepsh] Unhandled error in performUnitOfWork:", enhanced);
      if (fiber.sibling) {
        return fiber.sibling;
      }
      let nextFiber = fiber.parent;
      while (nextFiber) {
        if (nextFiber.sibling) return nextFiber.sibling;
        nextFiber = nextFiber.parent;
      }
      return null;
    }
  }

  if (fiber.child) return fiber.child;
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;
    nextFiber = nextFiber.parent;
  }
}

export { performUnitOfWork };
