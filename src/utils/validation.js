import { devWarn } from "./dev";

import { isDev } from "@/core/constants";

/**
 * Validates hook usage in development mode.
 * @param {string} hookName - The name of the hook.
 * @param {string} key - The key used for the hook.
 * @param {{ type?: { name?: string } } | null} fiber - The current fiber.
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
