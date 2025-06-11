/**
 * Priority levels for scheduling updates.
 * @enum {number}
 * @readonly
 */
export const PRIORITY = {
  IMMEDIATE: 1, // Critical updates (e.g., user input)
  NORMAL: 2, // Standard updates (default)
  LOW: 3, // Non-urgent background updates
  IDLE: 4, // Lowest priority (when browser is idle)
};

export const isDev = typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true;
export const globalStores = new Map();
export const storeSubscriptions = new Map();
