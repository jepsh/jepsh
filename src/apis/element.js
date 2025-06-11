/**
 * Creates a text element for rendering
 * @param {string|number} text - The text content
 * @returns {Object} Text element object
 */
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    key: null,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

/**
 * Creates a virtual DOM element
 * @param {string|Function} type - Element type (string for DOM, function for components)
 * @param {Object|null} props - Element properties
 * @param {...*} children - Child elements
 * @returns {Object} Virtual DOM element
 */
function createElement(type, props, ...children) {
  return {
    type: type || "FRAGMENT",
    key: props && props.key != null ? props.key : null,
    props: {
      ...((props && { ...props, key: undefined }) || {}),
      children: children.map((child) => (typeof child === "object" && child !== null ? child : createTextElement(child))).filter(Boolean),
    },
  };
}

export { createElement };
