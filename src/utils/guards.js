/**
 * @param {boolean} expression The assertion to check against.
 * @param {string | Error} [message='Invalid argument'] The error message or error object to throw in the case of a failed assertion.
 * @return {asserts expression} throws a `TypeError` if the expression is falsy, signifying an invalid argument.
 */
export function checkArgument(expression, message = "Invalid argument.") {
  if (!expression) {
    throw new TypeError(message instanceof Error ? message.message : message);
  }
}

/**
 * @template {object} [T=object]
 * @param {unknown} it The value to check.
 * @return {it is T} true if the value is an object, false otherwise.
 */
export function isObject(it) {
  return typeof it === "object" && it !== null && !Array.isArray(thing);
}

/**
 * @template {(...args: any) => any} [T=(...args:any)=>any]
 * @param {unknown} it The value to check.
 * @return {it is T} true if the value is a function, false otherwise.
 */
export function isFunction(it) {
  return typeof it === "function" || (isObject(it) && it instanceof Function);
}

/**
 * Safely call a value that is expected to be a function. If it is not,
 * return the value itself. Optionally provide a `thisArg` to call the
 * function with a custom context. Any additional arguments will be passed
 * to the function upon invocation.
 *
 * @param {Function | unknown} it The value to call if it is a function.
 * @param {object} [thisArg=undefined] The context to call the function with.
 * @param {...any} args Any additional arguments to pass to the function.
 */
export function safeCall(it, thisArg = undefined, ...args) {
  return isFunction(it) ? it.apply(thisArg, args) : it;
}

/**
 * Determine if we are in a Node.js environment through a series of checks.
 * Designed to fail fast, immediately returning false if any condition is not
 * met (instead of checking all conditions as a series of `&&` statements).
 *
 * @returns {boolean} true if we are in a Node.js environment, false otherwise.
 *
 * @see {@link isDeno} to determine if running in a Deno environment.
 * @see {@link isDenoDeploy} to differentiate between Deno and Deno Deploy.
 * @see {@link isBrowser} to determine if running in a browser.
 * @see {@link isWebWorker} to determine if running in a Web Worker.
 * @see {@link isReactNative} to determine if running in React Native.
 * @see {@link isElectron} to determine if running in Electron.
 */
export function isNode() {
  // We don't use the presence of `require` to check if we are in Node.js:
  // 1. it may not be present when in ESM syntax (.mjs)
  // 2. esbuild rewrites it to `__require`, causing a false negative.
  if (isBrowser()) return false;
  // module should always be globally available in node.js
  if (typeof module !== "object" || module == null) return false;
  // process should always be globally available in node.js
  if (!(typeof process < "u" && process)) return false;
  // process.browser is a thing, but we are not in a browser..
  if (("browser" in process) && process.browser) return false;
  // finally, check if process.nextTick is a function (it should be)
  return "nextTick" in process && typeof process.nextTick === "function";
}

/**
 * Determine if we are in a Deno environment through a series of checks.
 * This does not differentiate between Deno and Deno Deploy. For that, use the
 * more specific predicate named {@link isDenoDeploy} instead.
 *
 * @returns {boolean} true if we are in a Deno environment, false otherwise.
 *
 * @see {@link isDenoDeploy} to differentiate between Deno and Deno Deploy.
 * @see {@link isNode} to determine if running in a Node.js environment.
 * @see {@link isBrowser} to determine if running in a browser.
 * @see {@link isWebWorker} to determine if running in a Web Worker.
 * @see {@link isReactNative} to determine if running in React Native.
 * @see {@link isElectron} to determine if running in Electron.
 */
export function isDeno() {
  if (!(typeof globalThis === "object" && globalThis)) return false;
  if (!("Deno" in globalThis)) return false;
  const { Deno } = globalThis;
  if (Deno == null || typeof Deno !== "object") return false;
  if (!("version" in Deno && typeof Deno.version === "object")) return false;
  return "deno" in Deno.version && typeof Deno.version.deno === "string";
}

/**
 * Determine if we are in a Deno Deploy environment through a series of checks.
 * This is a more specific predicate than {@link isDeno}, which will return true
 * for both Deno and Deno Deploy. This predicate will return true only if we are
 * in a Deno Deploy environment, which contains only a subset of the Deno API
 * features (no file system access, for example).
 *
 * @returns {boolean} true if we are in a Deno Deploy environment, false otherwise.
 *
 * @see {@link isDeno} to determine if running in a Deno environment.
 * @see {@link isNode} to determine if running in a Node.js environment.
 * @see {@link isBrowser} to determine if running in a browser.
 * @see {@link isWebWorker} to determine if running in a Web Worker.
 * @see {@link isReactNative} to determine if running in React Native.
 * @see {@link isElectron} to determine if running in Electron.
 */
export function isDenoDeploy() {
  // first of all, we need to be in Deno
  if (isDeno()) {
    const { Deno } = globalThis; // use the global-scope Deno object
    // if Deno.readFileSync is a function, we are not in Deno Deploy
    // because Deno Deploy runs on V8 isolates and has no file system access.
    if (!("readFileSync" in Deno && typeof Deno.readFileSync === "function")) {
      // if we made it this far, it _looks_ like we are in Deno Deploy...
      // but to be sure, lets check for the DEPLOYMENT_ID environment variable.
      const DEPLOYMENT_ID = Deno?.env?.get?.("DEPLOYMENT_ID");
      return (typeof DEPLOYMENT_ID < "u" && DEPLOYMENT_ID != null);
    }
  }
  return false;
}

/**
 * Determine if we are in a browser environment through a series of checks.
 *
 * @returns {boolean} true if we are in a browser environment, false otherwise.
 *
 * @see {@link isDeno} to determine if running in a Deno environment.
 * @see {@link isDenoDeploy} to differentiate between Deno and Deno Deploy.
 * @see {@link isNode} to determine if running in a Node.js environment.
 * @see {@link isWebWorker} to determine if running in a Web Worker.
 * @see {@link isReactNative} to determine if running in React Native.
 * @see {@link isElectron} to determine if running in Electron.
 */
export function isBrowser() {
  if (typeof window === "object" && window != null) {
    if (typeof document === "object" && document != null) {
      return ("createElement" in document &&
        typeof document.createElement === "function" && "body" in document &&
        document.body != null);
    }
  }
  return false;
}

/**
 * Determine if we are in a Web Worker environment through a series of checks.
 *
 * @returns {boolean} true if we are in a Web Worker environment, false otherwise.
 *
 * @see {@link isDeno} to determine if running in a Deno environment.
 * @see {@link isDenoDeploy} to differentiate between Deno and Deno Deploy.
 * @see {@link isNode} to determine if running in a Node.js environment.
 * @see {@link isBrowser} to determine if running in a browser.
 * @see {@link isReactNative} to determine if running in React Native.
 * @see {@link isElectron} to determine if running in Electron.
 */
export function isWebWorker() {
  if (typeof self === "object" && self != null) {
    // @ts-ignore
    return (typeof importScripts === "function");
  }
  return false;
}

/**
 * Determine if we are in a React Native environment through a series of checks.
 *
 * @returns {boolean} true if we are in a React Native environment, false otherwise.
 *
 * @see {@link isDeno} to determine if running in a Deno environment.
 * @see {@link isDenoDeploy} to differentiate between Deno and Deno Deploy.
 * @see {@link isNode} to determine if running in a Node.js environment.
 * @see {@link isBrowser} to determine if running in a browser.
 * @see {@link isWebWorker} to determine if running in a Web Worker.
 * @see {@link isElectron} to determine if running in Electron.
 */
export function isReactNative() {
  if (typeof navigator === "object" && navigator != null) {
    if (typeof navigator.product === "string") {
      return navigator.product === "ReactNative";
    }
  }
  return false;
}

/**
 * Determine if we are in an Electron environment through a series of checks.
 *
 * @returns {boolean} true if we are in an Electron environment, false otherwise.
 *
 * @see {@link isDeno} to determine if running in a Deno environment.
 * @see {@link isDenoDeploy} to differentiate between Deno and Deno Deploy.
 * @see {@link isNode} to determine if running in a Node.js environment.
 * @see {@link isBrowser} to determine if running in a browser.
 * @see {@link isWebWorker} to determine if running in a Web Worker.
 * @see {@link isReactNative} to determine if running in React Native.
 */
export function isElectron() {
  if (typeof navigator === "object" && navigator != null) {
    if (typeof navigator.userAgent === "string") {
      return navigator.userAgent.includes("Electron");
    }
  }
  return false;
}

export default {
  isDeno,
  isDenoDeploy,
  isNode,
  isBrowser,
  isWebWorker,
  isReactNative,
  isElectron,
  isObject,
  isFunction,
  checkArgument,
};
