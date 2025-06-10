import { state as globalState, priority as PRIORITY } from "@/shared";
import { workLoop } from "@/dom/work";

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
    priority: priority,
  };
  globalState.nextUnitOfWork = globalState.wipRoot;
  globalState.deletions = [];
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

  if (globalState.nextUnitOfWork && !globalState.wipRoot) {
    requestIdleCallback(workLoop);
  }
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

export { scheduleUpdate, enqueueBatchedUpdate, batchUpdates };
