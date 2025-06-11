import { PRIORITY } from "./constants";
import { captureError } from "./error-boundary";

import { state as globalState } from "@/shared/global";
import { createError } from "@/utils/error";

let updateQueue = [];
let isBatchingUpdates = false;
let batchingTimeout = null;

/**
 * Schedules an update for the component tree with the specified priority.
 * @param {number} [priority=PRIORITY.NORMAL] - The priority level for the update.
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
 * Flushes batched updates to trigger rendering.
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
 * Batches updates to optimize rendering performance.
 * @param {() => void} fn - The function containing updates to batch.
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
 * Enqueues an update with the specified priority, batching if enabled.
 * @param {number} priority - The priority level for the update.
 */
function enqueueBatchedUpdate(priority) {
  if (isBatchingUpdates) {
    updateQueue.push({ type: "schedule", priority });
  } else {
    scheduleUpdate(priority);
  }
}

/**
 * Queues an effect to be executed after rendering.
 * @param {{ callback: () => void, cleanup?: () => void, hasRun?: boolean, needsToRun?: boolean }} effect - The effect to queue.
 */
function queueEffect(effect) {
  globalState.effectQueue.push(effect);
}

/**
 * Flushes all queued effects, executing their callbacks and handling cleanups.
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
 * Resets the hook counter for a given fiber.
 * @param {{ hooks?: Record<string, any>, type?: { name?: string } }} fiber - The fiber to reset the hook counter for.
 */
function resetHookCounter(fiber) {
  if (globalState.componentHookCounters.has(fiber)) {
    globalState.componentHookCounters.get(fiber).counter = 0;
  }
}

export { scheduleUpdate, batchUpdates, enqueueBatchedUpdate, queueEffect, flushEffects, resetHookCounter };
