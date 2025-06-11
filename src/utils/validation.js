import { devWarn } from "./dev";

import { isDev } from "@/core/constants";

/**
 * Validates proper hook usage in development mode.
 * @param {string} hookName - Name of the hook being validated.
 * @param {string} key - Hook key being validated.
 * @param {Object} fiber - Current fiber node.
 */
function validateHookUsage(hookName, key, fiber) {
  if (!isDev) return;

  if (!fiber) {
    devWarn(`${hookName} called outside of component render`, "Unknown");
    return;
  }

  if (typeof key !== "string") {
    devWarn(`${hookName} expects a string key as first argument`, fiber.type?.name);
  }

  if (key && key.includes("__")) {
    devWarn(`${hookName} key contains reserved characters "__"`, fiber.type?.name);
  }

  if (key && key.length > 100) {
    devWarn(`${hookName} key is unusually long (${key.length} chars)`, fiber.type?.name);
  }
}

export { validateHookUsage };
