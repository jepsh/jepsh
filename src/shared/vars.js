// eslint-disable-next-line prefer-const
let state = {
  wipFiber: null,
  wipRoot: null,
  currentRoot: null,
  deletions: [],
  nextUnitOfWork: null,
  effectQueue: [],
  componentHookCounters: new WeakMap(),
  errorBoundaryStack: [],
};

/**
 * Priority levels for scheduling updates.
 * @enum {number}
 * @readonly
 */
const priority = {
  IMMEDIATE: 1, // Critical updates (e.g., user input)
  NORMAL: 2, // Standard updates (default)
  LOW: 3, // Non-urgent background updates
  IDLE: 4, // Lowest priority (when browser is idle)
};

const isDev = typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true;
const globalStores = new Map();
const storeSubscribers = new Map();

export { state, priority, isDev, globalStores, storeSubscribers };
