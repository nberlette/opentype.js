/**
 * Find the average of a list of numbers, reducing them into a single number.
 *
 * @param {...number[] | number[][]} values A list (or lists) of numbers.
 * @returns {number} The average of all the numbers.
 */
export function average(...values) {
  return values.flat().reduce((a, b) => a + +b, 0) / values.length;
}

/**
 * Find the logarithm of a number to the base 2.
 *
 * @param {number} v The number to find the logarithm of.
 * @returns {number} The logarithm of the number.
 * @see {@link logX}
 */
export function log2(v) {
  return logX(v, 2);
}

/**
 * Find the logarithm of a number to the base 10.
 *
 * @param {number} v The number to find the logarithm of.
 * @returns {number} The logarithm of the number.
 * @see {@link logX}
 */
export function log10(v) {
  return logX(v, 10);
}

/**
 * Find the logarithm of a number.
 *
 * @param {number} v The number to find the logarithm of.
 * @param {number} [base=10] The base of the logarithm.
 * @returns {number} The logarithm of the number.
 */
export function logX(v, base = 10) {
  return Math.log(v) / Math.log(base) | 0;
}

/**
 * Clamp a value between a minimum and maximum.
 *
 * @param {number} v The value to clamp.
 * @param {number} [min=0] The minimum value.
 * @param {number} [max=100] The maximum value.
 * @returns {number} The clamped value.
 */
export function clamp(v, min = 0, max = 100) {
  return Math.min(Math.max(v, min), max);
}
