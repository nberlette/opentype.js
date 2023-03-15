/**
 * Check if 2 primitive arrays are equal using non-reference-based equality.
 *
 * @param {any[]} a The first array to compare.
 * @param {any[]} b The second array to compare.
 * @returns {boolean} Whether the arrays are deeply equal.
 */
export function arraysEqual(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!equals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

// Custom equals function that can also check lists.
export function equals(a, b) {
  if (Object.is(a, b)) {
    return true;
  } else if (Array.isArray(a) && Array.isArray(b)) {
    return arraysEqual(a, b);
  } else if (isObject(a) && isObject(b)) {
    return objectsEqual(a, b);
  } else {
    return false;
  }
}

/** Check if 2 objects are equal using non-reference-based equality. */
export function objectsEqual(obj1, obj2) {
  const val1 = Object.values(obj1);
  const val2 = Object.values(obj2);
  const keys1 = Object.values(obj1);
  const keys2 = Object.values(obj2);

  return arraysEqual(val1, val2) && arraysEqual(keys1, keys2);
}
