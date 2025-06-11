import { state as globalState } from "@/shared";
import { useState, useEffect } from "@/hooks";
import { createElement } from "@/apis";

/**
 * A component for catching and handling errors in the component tree.
 * @param {{ fallback?: Function | any, onError?: (error: Error, errorInfo: { componentStack: string }) => void, children: any }} props - The component props.
 * @returns {any} The children or fallback UI if an error occurs.
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
