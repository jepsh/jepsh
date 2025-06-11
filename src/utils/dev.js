import { isDev } from "@/core/constants";

/**
 * Logs a development warning if in development mode.
 * @param {string} message - The warning message.
 * @param {string} [component] - The component name, if applicable.
 * @param {any} [extra] - Additional information to log.
 */
function devWarn(message, component, extra) {
  if (!isDev) return;
  console.warn(`[Jepsh Warning] ${message}${component ? ` in ${component}` : ""}`, extra || "");
}

export { devWarn };
