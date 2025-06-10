/**
 * Creates a context object with Provider component for state management.
 * @param {any} defaultValue - The default value for the context.
 * @returns {Object} An object containing Provider component and context reference.
 */
function createContext(defaultValue) {
  const context = {
    _defaultValue: defaultValue,
    _currentValue: defaultValue,
    _valueStack: [defaultValue],
  };

  return {
    Provider: function ({ value, children }) {
      context._valueStack.push(value);
      context._currentValue = value;

      const normalizedChildren = Array.isArray(children) ? children : children != null ? [children] : [];

      return {
        type: "CONTEXT_PROVIDER",
        props: {
          context: context,
          value: value,
          children: normalizedChildren,
          _cleanup: () => {
            if (context._valueStack.length > 1) {
              context._valueStack.pop();
              context._currentValue = context._valueStack[context._valueStack.length - 1];
            } else {
              context._currentValue = context._defaultValue;
            }
          },
        },
      };
    },
    _context: context,
  };
}

export { createContext };
