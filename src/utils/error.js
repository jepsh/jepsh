/**
 * Creates a custom error object for Jepsh-specific errors.
 * @param {string} type - The type of error (e.g., HOOK, EFFECT).
 * @param {string} message - The error message.
 * @param {string} [component="Unknown"] - The component name where the error occurred.
 * @param {string} [hookKey] - The hook key, if applicable.
 * @returns {Error} The custom error object.
 */
function createError(type, message, component, hookKey) {
  const componentName = component || "Unknown";
  const hookInfo = hookKey ? ` (hook: ${hookKey})` : "";
  const fullMessage = `[Jepsh ${type}] ${message} in ${componentName}${hookInfo}`;
  const error = new Error(fullMessage);
  return error;
}

/**
 * Enhances a generic error with Jepsh-specific context.
 * @param {Error} error - The original error.
 * @param {{ component?: string, phase?: string, fiber?: any }} context - Additional context for the error.
 * @returns {Error} The enhanced error object.
 */
function enhanceError(error, context) {
  const enhanced = new Error(`[Jepsh] ${error.message}`);
  enhanced.stack = error.stack;
  return enhanced;
}

/**
 * Generates a component stack trace for error reporting.
 * @param {{ type?: string | { name?: string }, parent?: any }} fiber - The fiber to start the stack trace from.
 * @returns {string} The formatted component stack trace.
 */
function getComponentStack(fiber) {
  const stack = [];
  let current = fiber;

  while (current) {
    if (current.type && typeof current.type === "function") {
      stack.push(`  in ${current.type.name || "Unknown"}`);
    } else if (current.type && typeof current.type === "string") {
      stack.push(`  in ${current.type}`);
    }
    current = current.parent;
  }

  return stack.join("\n");
}

/**
 * Checks if one fiber is an ancestor of another.
 * @param {{ parent?: any }} ancestor - The potential ancestor fiber.
 * @param {{ parent?: any }} descendant - The potential descendant fiber.
 * @returns {boolean} True if ancestor is an ancestor of descendant, false otherwise.
 */
function isAncestor(ancestor, descendant) {
  if (!ancestor || !descendant) return false;

  let current = descendant.parent;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

export { createError, enhanceError, getComponentStack, isAncestor };
