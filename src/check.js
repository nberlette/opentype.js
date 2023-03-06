// Run-time checking of preconditions.
/**
 * @param {string} [message]
 * @param {ErrorConstructor|TypeErrorConstructor|SyntaxErrorConstructor|ReferenceErrorConstructor|AggregateErrorConstructor|EvalErrorConstructor} [type=Error] The type of error to throw. Defaults to `Error`.
 * @returns {never} Always throws an error.
 * @throws {Error} Alwaus throws an error with the given message.
 */
export function fail(message, type = Error) {
  throw new (type instanceof Error ? type : Error)(message);
}

/**
 * Precondition function that checks if the given predicate is true.
 * If not, it will throw an error.
 *
 * @param {boolean} predicate
 * @param {string} message
 * @returns {asserts predicate}
 * @throws {Error} if the predicate is false or a falsy value.
 */
export function assert(predicate, message) {
  if (!predicate) fail(message);
}

export const argument = assert;

export default { fail, argument, assert };
