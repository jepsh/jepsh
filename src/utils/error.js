/**
 * Creates a standardized error object with WTFact metadata.
 * @param {string} type - Error type/category.
 * @param {string} message - Error message.
 * @param {string} [component] - Component name where error occurred.
 * @param {string} [hookKey] - Hook key associated with the error.
 * @returns {Error} Enhanced error object with WTFact metadata.
 */
function createError(type, message, component, hookKey) {
  const componentName = component || "Unknown";
  const hookInfo = hookKey ? ` (hook: ${hookKey})` : "";
  const fullMessage = `[Jepsh ${type}] ${message} in ${componentName}${hookInfo}`;
  const error = new Error(fullMessage);
  return error;
}

/**
 * Enhances a regular error with WTFact context information.
 * @param {Error} error - Original error to enhance.
 * @param {Object} context - Additional context information.
 * @returns {Error} Enhanced error object.
 */
function enhanceError(error, context) {
  const enhanced = new Error(`[Jepsh] ${error.message}`);
  enhanced.stack = error.stack;
  return enhanced;
}

/**
 * Gets the component stack trace for error reporting.
 * @param {Object} fiber - The fiber node to start tracing from.
 * @returns {string} Formatted component stack trace.
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
 * Checks if one fiber is an ancestor of another in the fiber tree.
 * @param {Object} ancestor - Potential ancestor fiber node.
 * @param {Object} descendant - Potential descendant fiber node.
 * @returns {boolean} True if ancestor is actually an ancestor of descendant.
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
