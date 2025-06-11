import { state as globalState } from "@/shared/global";
import { flushEffects } from "@/core/scheduler";
import { createError, enhanceError } from "@/utils/error";
import { captureError } from "@/core/error-boundary";

/**
 * Creates a DOM node for a fiber.
 * @param {Object} fiber - The fiber node to create DOM for.
 * @returns {Node|null} The created DOM node or null for fragments.
 */
function createDom(fiber) {
  if (fiber.type === "FRAGMENT" || fiber.type === "CONTEXT_PROVIDER") {
    return null;
  }
  const dom = fiber.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props || {});
  return dom;
}

/**
 * Updates DOM properties and event listeners.
 * @param {Node} dom - The DOM node to update.
 * @param {Object} prevProps - Previous props.
 * @param {Object} nextProps - Next props to apply.
 */
function updateDom(dom, prevProps, nextProps) {
  const isEvent = (key) => key.startsWith("on");
  const isProperty = (key) => key !== "children" && !isEvent(key) && key !== "ref";
  const isNew = (prev, next) => (key) => prev[key] !== next[key];
  const isGone = (prev, next) => (key) => !(key in next);

  if (!dom) return;
  prevProps = prevProps || {};
  nextProps = nextProps || {};

  if (prevProps.ref && prevProps.ref !== nextProps.ref) {
    prevProps.ref.current = null;
  }
  if (nextProps.ref) {
    nextProps.ref.current = dom;
  }

  try {
    Object.keys(prevProps)
      .filter(isEvent)
      .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
      .forEach((name) => {
        const eventType = name.toLowerCase().substring(2);
        dom.removeEventListener(eventType, prevProps[name]);
      });

    Object.keys(prevProps)
      .filter(isProperty)
      .filter(isGone(prevProps, nextProps))
      .forEach((name) => {
        if (name === "style" && typeof prevProps[name] === "object") {
          // eslint-disable-next-line no-undef
          if (dom instanceof HTMLElement) {
            dom.style.cssText = "";
          }
        } else {
          dom[name] = "";
        }
      });

    Object.keys(nextProps)
      .filter(isProperty)
      .filter(isNew(prevProps, nextProps))
      .forEach((name) => {
        if (name === "style" && typeof nextProps[name] === "object") {
          // eslint-disable-next-line no-undef
          if (dom instanceof HTMLElement) {
            Object.entries(nextProps[name]).forEach(([k, v]) => {
              dom.style[k] = v;
            });
          }
        } else {
          dom[name] = nextProps[name];
        }
      });

    Object.keys(nextProps)
      .filter(isEvent)
      .filter(isNew(prevProps, nextProps))
      .forEach((name) => {
        const eventType = name.toLowerCase().substring(2);
        dom.addEventListener(eventType, nextProps[name]);
      });
  } catch (error) {
    const enhanced = createError("DOM", `Error updating DOM: ${error.message}`, "DOM Update");
    console.error(enhanced);
  }
}

/**
 * Handles cleanup and removal of a deleted fiber node.
 * @param {Object} fiber - The fiber node being deleted.
 * @param {Node} domParent - The parent DOM node.
 */
function commitDeletion(fiber, domParent) {
  if (!fiber || !domParent) return;

  if (fiber.hooks) {
    Object.keys(fiber.hooks).forEach((key) => {
      const hook = fiber.hooks[key];
      if (hook?.cleanup && typeof hook.cleanup === "function") {
        try {
          hook.cleanup();
        } catch (error) {
          console.error("Error in effect cleanup:", error);
        }
      }
    });
    fiber.hooks = null;
  }

  if (fiber.props?._cleanup && typeof fiber.props._cleanup === "function") {
    try {
      fiber.props._cleanup();
    } catch (error) {
      console.error("Error in context cleanup:", error);
    }
  }

  if (fiber.dom) {
    try {
      const actualParent = fiber.dom.parentNode;
      if (actualParent && actualParent.contains(fiber.dom)) {
        actualParent.removeChild(fiber.dom);
      }
    } catch (error) {
      console.error("Error removing DOM node:", error);
    }
    fiber.dom = null;
  } else {
    if (fiber.child) {
      commitDeletion(fiber.child, domParent);
    }
  }

  fiber.alternate = null;
  fiber.parent = null;
  fiber.child = null;
  fiber.sibling = null;
  fiber.props = null;
}

/**
 * Commits changes for a single fiber node.
 * @param {Object} fiber - The fiber node to commit.
 */
function commitWork(fiber) {
  if (!fiber) return;

  try {
    let domParentFiber = fiber.parent;
    while (domParentFiber && (!domParentFiber.dom || domParentFiber.type === "FRAGMENT" || domParentFiber.type === "CONTEXT_PROVIDER")) {
      domParentFiber = domParentFiber.parent;
    }

    const domParent = domParentFiber?.dom || document.body;

    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
      domParent.appendChild(fiber.dom);
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
      updateDom(fiber.dom, fiber.alternate.props || {}, fiber.props || {});
    } else if (fiber.effectTag === "DELETION") {
      commitDeletion(fiber, null);
      return;
    }
  } catch (error) {
    const enhanced = enhanceError(error, {
      component: fiber.type?.name || "Unknown",
      phase: "commit",
      fiber,
    });

    if (!captureError(enhanced, fiber)) {
      console.error("[Jepsh] Error in commitWork:", enhanced);
    }
  }

  try {
    commitWork(fiber.child);
    commitWork(fiber.sibling);
  } catch (error) {
    const enhanced = enhanceError(error, {
      phase: "commit-recursive",
      fiber,
    });

    if (!captureError(enhanced, fiber)) {
      console.error("[Jepsh] Error in recursive commitWork:", enhanced);
    }
  }
}

/**
 * Commits all changes to the DOM.
 */
function commitRoot() {
  function runAllInsertionEffects(fiber) {
    if (!fiber) return;
    runAllInsertionEffects(fiber.child);
    runAllInsertionEffects(fiber.sibling);
  }

  function runAllLayoutEffects(fiber) {
    if (!fiber) return;
    runAllLayoutEffects(fiber.child);
    runAllLayoutEffects(fiber.sibling);
  }

  runAllInsertionEffects(globalState.wipRoot);
  const toDelete = [...globalState.deletions];
  globalState.deletions = [];
  toDelete.forEach((fiber) => commitDeletion(fiber, null));
  commitWork(globalState.wipRoot.child);
  globalState.currentRoot = globalState.wipRoot;
  runAllLayoutEffects(globalState.currentRoot);

  if (globalState.effectQueue.length > 0) {
    setTimeout(flushEffects, 0);
  }

  globalState.wipRoot = null;
}

export { createDom, commitRoot };
