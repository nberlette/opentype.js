import { Log, log } from "./log.js";
import { safeCall } from "./guards.js";
/**
 * Maintains a list of deprecated functions that have been called, allowing us
 * to warn the user only once per function, without impacting performance.
 * WeakMaps are used to avoid memory leaks and preserve garbage collection.
 */
const HISTORY = new WeakMap();

/**
 * Wraps a function in a deprecation warning. The warning will only be logged
 * once per function, and only if the function is called.
 * @template {(...args: any[]) => any} T
 * @param {T} func - The function to wrap.
 * @param {string} message - The message to log.
 * @param {Log | Console | Object} [logger] - The logger to use.
 * @returns {T}
 */
export function deprecated(func, message, logger = log) {
  const name = func.name || "anonymous";
  return {
    /** @type {T} */
    [name]: function () {
      if (!HISTORY.has(func)) HISTORY.set(func, new Set());
      const warnings = HISTORY.get(func);
      if (!warnings.has(message)) {
        warnings.add(message);
        logger.warn(message);
      }
      return safeCall(func, this, arguments);
    },
  }[name];
}

export default deprecated;
