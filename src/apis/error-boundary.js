import { createElement } from "./element";

import { ErrorBoundary } from "@/components/error-boundary";

/**
 * Creates a default error fallback UI for error boundaries.
 * @param {Error} error - The error to display.
 * @returns {{ type: string, props: { style: Record<string, string>, children: any[] }}} The fallback element.
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
 * Wraps a component with an error boundary.
 * @param {Function} Component - The component to wrap.
 * @param {Function} [fallbackComponent] - The fallback UI to render on error.
 * @returns {Function} The wrapped component.
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
