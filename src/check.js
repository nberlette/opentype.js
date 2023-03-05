// Run-time checking of preconditions.

function fail(message) {
  throw new Error(message);
}

// Precondition function that checks if the given predicate is true.
// If not, it will throw an error.
function argument(predicate, message) {
  if (!predicate) {
    fail(message);
  }
}

export { argument, argument as assert, fail };
export default { fail, argument, assert: argument };
