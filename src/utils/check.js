// Run-time checking of preconditions.
/**
 * @param {string | (string | Error)[]} message
 * @param {unknown} [cause]
 * @returns {never} Always throws an error.
 * @throws {Error} Alwaus throws an error with the given message.
 */
export function fail(message, cause = undefined) {
  if (Array.isArray(message)) {
    throw new AggregateError(
      message.map((e) => e instanceof Error ? e : new Error(e)),
      `Multiple errors were thrown ${message.length}`,
      {
        cause,
      },
    );
  }

  throw new Error(
    message instanceof Error ? message.message : message,
    {
      cause,
    },
  );
}

/**
 * Precondition function that checks if the given predicate is true.
 * If not, it will throw an error.
 *
 * @param {boolean} predicate
 * @param {string} [message]
 * @returns {asserts predicate}
 * @throws {Error} if the predicate is false or a falsy value.
 */
export function assert(
  predicate,
  message = "Assertion failed",
  expected = undefined,
  actual = undefined,
) {
  if (!predicate) {
    if (actual !== undefined && expected !== undefined) {
      const cause = new TypeError(
        `Expected ${expected} (${typeof expected}), but received ${actual} (${typeof actual})`,
      );
      fail(message, cause);
    } else if (expected !== undefined) {
      const cause = new TypeError(`Expected ${expected} (${typeof expected})`);
      fail(message, cause);
    } else {
      fail(message);
    }
  }
}

export const argument = assert;

export default { fail, argument, assert };
