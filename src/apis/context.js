/**
 * Creates a context object for sharing data between components.
 * @param {any} defaultValue - The default value of the context.
 * @returns {{ Provider: Function, _context: { _defaultValue: any, _currentValue: any, _valueStack: any[] }}} The context object with a Provider component.
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
          context,
          value,
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
