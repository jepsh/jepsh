import { state as globalState, priority as PRIORITY } from "@/shared";
import { createError, enhanceError } from "@/handler";

/**
 * Renders a virtual DOM element into a container.
 * @param {{ type: string | Function, props: { children?: any[] }, key?: string | null }} element - The virtual DOM element to render.
 * @param {Node} container - The DOM container to render into.
 * @throws {Error} If the container or element is missing.
 */
function render(element, container) {
  try {
    if (!container) {
      throw createError("RENDER", "Container element is required", "render");
    }

    if (!element) {
      throw createError("RENDER", "Element to render is required", "render");
    }

    globalState.wipRoot = {
      dom: container,
      props: { children: [element] },
      alternate: globalState.currentRoot,
      priority: PRIORITY.NORMAL,
    };
    globalState.deletions = [];
    globalState.nextUnitOfWork = globalState.wipRoot;
  } catch (error) {
    const enhanced = enhanceError(error, {
      phase: "render-setup",
    });
    console.error("[Jepsh] Error in render:", enhanced);
    throw enhanced;
  }
}

export { render };
