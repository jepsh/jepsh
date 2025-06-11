// eslint-disable-next-line prefer-const
export let state = {
  wipFiber: null,
  wipRoot: null,
  currentRoot: null,
  deletions: [],
  nextUnitOfWork: null,
  effectQueue: [],
  componentHookCounters: new WeakMap(),
  errorBoundaryStack: [],
};
