import { state as globalState } from "@/shared";
import { useState, useEffect } from "@/hooks";
import { createElement } from "@/apis";

/**
 * Error boundary component that catches errors in its child tree.
 * @param {Object} props - Component props.
 * @param {Function|Object} props.fallback - Fallback UI component or element.
 * @param {Function} [props.onError] - Error handler callback.
 * @param {Object} props.children - Child components to render.
 * @returns {Object} Either children or fallback UI if error occurred.
 */
function ErrorBoundary({ fallback, onError, children }) {
  const [hasError, setHasError] = useState("error-boundary-state", false);
  const [error, setError] = useState("error-boundary-error", null);
  const [errorInfo, setErrorInfo] = useState("error-boundary-info", null);

  if (!globalState.errorBoundaryStack.find((b) => b.fiber === globalState.wipFiber)) {
    globalState.errorBoundaryStack.push({
      setHasError,
      setError,
      setErrorInfo,
      onError,
      fiber: globalState.wipFiber,
    });
  }

  useEffect(
    "error-boundary-reset",
    () => {
      if (hasError) {
        setHasError(false);
        setError(null);
        setErrorInfo(null);
      }
    },
    [children]
  );

  useEffect(
    "error-boundary-cleanup",
    () => {
      return () => {
        const index = globalState.errorBoundaryStack.findIndex((b) => b.fiber === globalState.wipFiber);
        if (index > -1) {
          globalState.errorBoundaryStack.splice(index, 1);
        }
      };
    },
    []
  );

  if (hasError) {
    if (typeof fallback === "function") {
      return fallback(error, errorInfo);
    }
    return (
      fallback ||
      createElement(
        "div",
        {
          style: {
            padding: "20px",
            border: "2px solid #ff6b6b",
            backgroundColor: "#ffe0e0",
            color: "#d63031",
            borderRadius: "4px",
            fontFamily: "monospace",
          },
        },
        `Error: ${error?.message || "Something went wrong"}`
      )
    );
  }

  return children;
}

export { ErrorBoundary };
