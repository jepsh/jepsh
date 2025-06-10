/**
 * Creates a text element object for virtual DOM representation.
 * @param {string} text - The text content for the element.
 * @returns {Object} A virtual DOM text element object.
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
 * Creates a virtual DOM element.
 * @param {string|Function} type - The type of the element (component or HTML tag).
 * @param {Object|null} props - The properties/attributes of the element.
 * @param {...any} children - Child elements or text content.
 * @returns {Object} A virtual DOM element object.
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
