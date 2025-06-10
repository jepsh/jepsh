import { state as globalState } from "@/shared";
import { captureError, createError } from "@/handler";

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

export { queueEffect, flushEffects };
