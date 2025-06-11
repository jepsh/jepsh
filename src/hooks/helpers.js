/**
 * Performs a deep equality comparison between two values.
 * @param {any} a - The first value to compare.
 * @param {any} b - The second value to compare.
 * @returns {boolean} True if the values are deeply equal, false otherwise.
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Compares two dependency arrays for equality.
 * @param {Array<any> | null} deps1 - The first dependency array.
 * @param {Array<any> | null} deps2 - The second dependency array.
 * @returns {boolean} True if the dependency arrays are equal, false otherwise.
 */
function areDepsEqual(deps1, deps2) {
  if (!deps1 && !deps2) return true;
  if (!deps1 || !deps2) return false;
  if (deps1.length !== deps2.length) return false;

  return deps1.every((dep, i) => deepEqual(dep, deps2[i]));
}

export { deepEqual, areDepsEqual };
