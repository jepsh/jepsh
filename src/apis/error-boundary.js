import { createElement } from "./element";
import { ErrorBoundary } from "@/components";

/**
 * Default error fallback component for error boundaries.
 * @param {Error} error - The error to display.
 * @returns {Object} A React-like element representing the error UI.
 */
function defaultErrorFallback(error) {
  return createElement(
    "div",
    {
      style: {
        padding: "20px",
        border: "2px solid #ff6b6b",
        backgroundColor: "#ffe0e0",
        color: "#d63031",
        borderRadius: "8px",
        fontFamily: "system-ui, sans-serif",
      },
    },
    createElement("h3", { style: { margin: "0 0 10px 0" } }, "Something went wrong"),
    createElement("p", { style: { margin: "0", fontFamily: "monospace", fontSize: "14px" } }, error?.message || "An unexpected error occurred")
  );
}

/**
 * Higher-order component that wraps a component with an error boundary.
 * @param {Function} Component - The component to wrap.
 * @param {Function} [fallbackComponent] - Custom fallback UI component.
 * @returns {Function} The wrapped component with error boundary.
 */
function withErrorBoundary(Component, fallbackComponent) {
  return function WrappedWithErrorBoundary(props) {
    return createElement(
      ErrorBoundary,
      {
        fallback: fallbackComponent || defaultErrorFallback,
        onError: (error, errorInfo) => {
          console.error("[Jepsh Error Boundary]", error, errorInfo);
        },
      },
      createElement(Component, props)
    );
  };
}

export { withErrorBoundary };
