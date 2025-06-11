import { createDom, commitRoot } from "./work";

import { state as globalState } from "@/shared/global";
import { PRIORITY } from "@/core/constants";
import { createError, enhanceError } from "@/utils/error";
import { captureError } from "@/core/error-boundary";
import { performUnitOfWork } from "@/core/reconciler";

/**
 * The main work loop for the renderer.
 * @param {IdleDeadline} deadline - The idle callback deadline object.
 */
function workLoop(deadline) {
  let shouldYield = false;
  const fiberPriority = globalState.wipRoot?.priority || PRIORITY.NORMAL;
  const timeSlice = fiberPriority === PRIORITY.IMMEDIATE ? 16 : fiberPriority === PRIORITY.NORMAL ? 5 : fiberPriority === PRIORITY.LOW ? 2 : 1;

  while (globalState.nextUnitOfWork && !shouldYield) {
    try {
      globalState.nextUnitOfWork = performUnitOfWork(globalState.nextUnitOfWork, createDom);
    } catch (error) {
      const enhanced = enhanceError(error, {
        component: globalState.nextUnitOfWork?.type?.name || "Unknown",
        phase: "reconciliation",
        fiber: globalState.nextUnitOfWork,
      });

      if (!captureError(enhanced, globalState.nextUnitOfWork)) {
        console.error("[Jepsh] Unhandled error during reconciliation:", enhanced);
        globalState.nextUnitOfWork = null;
        globalState.wipRoot = null;
        return;
      }
    }
    shouldYield = deadline.timeRemaining() < timeSlice;
  }

  if (!globalState.nextUnitOfWork && globalState.wipRoot) {
    try {
      commitRoot();
    } catch (error) {
      const enhanced = enhanceError(error, {
        phase: "commit",
        fiber: globalState.wipRoot,
      });

      if (!captureError(enhanced, globalState.wipRoot)) {
        console.error("[Jepsh] Unhandled error during commit:", enhanced);
      }
    }
  }

  requestIdleCallback(workLoop); // eslint-disable-line no-undef
}

/**
 * Renders a Jepsh element to the DOM.
 * @param {Object} element - The element to render.
 * @param {Node} container - The DOM container to render into.
 */
function render(element, container) {
  try {
    if (!container) {
      throw createError("RENDER", "Container element is required", "render");
    }

    if (!element) {
      throw createError("RENDER", "Element to render is required", "render");
    }

    globalState.wipRoot = {
      dom: container,
      props: { children: [element] },
      alternate: globalState.currentRoot,
      priority: PRIORITY.NORMAL,
    };
    globalState.deletions = [];
    globalState.nextUnitOfWork = globalState.wipRoot;
  } catch (error) {
    const enhanced = enhanceError(error, {
      phase: "render-setup",
    });
    console.error("[Jepsh] Error in render:", enhanced);
    throw enhanced;
  }
}

export { render, workLoop };
