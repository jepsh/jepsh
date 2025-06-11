import { isDev } from "@/core/constants";

/**
 * Development-only warning logger.
 * @param {string} message - Warning message.
 * @param {string} [component] - Component name where warning occurred.
 * @param {any} [extra] - Additional debug information.
 */
function devWarn(message, component, extra) {
  if (!isDev) return;
  console.warn(`[Jepsh Warning] ${message}${component ? ` in ${component}` : ""}`, extra || "");
}

export { devWarn };
