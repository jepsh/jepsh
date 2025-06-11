import { state as globalState } from "@/shared/global";
import { getComponentStack, isAncestor } from "@/utils/error";

/**
 * Captures an error and finds the nearest error boundary to handle it.
 * @param {Error} error - The error to capture.
 * @param {Object} fiber - The fiber node where the error occurred.
 * @returns {boolean} True if error was captured by a boundary, false otherwise.
 */
function captureError(error, fiber) {
  let boundary = null;

  for (let i = globalState.errorBoundaryStack.length - 1; i >= 0; i--) {
    const candidate = globalState.errorBoundaryStack[i];
    if (candidate.fiber === fiber || isAncestor(candidate.fiber, fiber)) {
      boundary = candidate;
      break;
    }
  }

  if (boundary) {
    const errorInfo = {
      componentStack: getComponentStack(fiber),
    };

    if (boundary.onError) {
      try {
        boundary.onError(error, errorInfo);
      } catch (e) {
        console.error("[Jepsh] Error in error boundary onError callback:", e);
      }
    }

    setTimeout(() => {
      boundary.setHasError(true);
      boundary.setError(error);
      boundary.setErrorInfo(errorInfo);
    }, 0);

    return true;
  }

  return false;
}

export { captureError };
