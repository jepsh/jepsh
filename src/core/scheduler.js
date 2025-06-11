import { PRIORITY } from "./constants";
import { captureError } from "./error-boundary";

import { state as globalState } from "@/shared/global";
import { createError } from "@/utils/error";

let updateQueue = [];
let isBatchingUpdates = false;
let batchingTimeout = null;

/**
 * Schedules a DOM update with given priority.
 * @param {number} [priority=PRIORITY.NORMAL] - The priority level of the update.
 */
function scheduleUpdate(priority = PRIORITY.NORMAL) {
  if (!globalState.currentRoot) return;

  globalState.wipRoot = {
    dom: globalState.currentRoot.dom,
    props: globalState.currentRoot.props,
    alternate: globalState.currentRoot,
    priority,
  };
  globalState.nextUnitOfWork = globalState.wipRoot;
  globalState.deletions = [];
}

/**
 * Flushes all batched updates from the queue.
 */
function flushBatchedUpdates() {
  if (updateQueue.length === 0) {
    isBatchingUpdates = false;
    return;
  }

  const updates = [...updateQueue];
  updateQueue = [];

  updates.forEach((update) => {
    if (update.type === "schedule") {
      scheduleUpdate(update.priority);
    }
  });

  isBatchingUpdates = false;
}

/**
 * Batches multiple updates together for performance optimization.
 * @param {Function} fn - Function containing updates to batch.
 */
function batchUpdates(fn) {
  if (isBatchingUpdates) {
    fn();
    return;
  }

  isBatchingUpdates = true;
  fn();

  if (!batchingTimeout) {
    batchingTimeout = Promise.resolve().then(() => {
      flushBatchedUpdates();
      batchingTimeout = null;
    });
  }
}

/**
 * Enqueues an update with batching support.
 * @param {number} priority - The priority level of the update.
 */
function enqueueBatchedUpdate(priority) {
  if (isBatchingUpdates) {
    updateQueue.push({ type: "schedule", priority });
  } else {
    scheduleUpdate(priority);
  }
}

/**
 * Queues an effect to be run after DOM updates.
 * @param {Object} effect - Effect object containing callback and metadata.
 */
function queueEffect(effect) {
  globalState.effectQueue.push(effect);
}

/**
 * Flushes all effects from the effect queue.
 */
function flushEffects() {
  const effects = [...globalState.effectQueue];
  globalState.effectQueue = [];

  effects.forEach((effect) => {
    try {
      const cleanup = effect.callback();
      if (typeof cleanup === "function") {
        effect.cleanup = cleanup;
      }
      effect.hasRun = true;
      effect.needsToRun = false;
    } catch (error) {
      const enhanced = createError("EFFECT", `Error running effect: ${error.message}`, globalState.wipFiber?.type?.name, "unknown");
      if (!captureError(enhanced, globalState.wipFiber)) {
        console.error(enhanced);
      }
    }
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

export { scheduleUpdate, batchUpdates, enqueueBatchedUpdate, queueEffect, flushEffects, resetHookCounter };
