/**
 * @typedef {{NONE:0,DEBUG:1,INFO:2,WARN:3,ERROR:4,FATAL:5,0:"NONE",1:"DEBUG",2:"INFO",3:"WARN",4:"ERROR",5:"FATAL"}} LogLevel
 * ----------------------------------------------------------------------------
 * @typedef {Object} LogOptions
 * @property {LogLevel} [level] Sets the active log level, which will be used to filter log messages. Anything below this level will be ignored. Defaults to `Log.Level.WARN`.
 * @property {boolean} [timestamps] Whether to include timestamps in log messages. Defaults to `true`.
 * @property {boolean} [labels] Whether to include labels in log messages. Defaults to `true`.
 * ----------------------------------------------------------------------------
 * @typedef {Required<LogOptions>} LogOptionsResolved
 */

/**
 * Logging utility class, with support for log levels, labels, and timestamps.
 * Also includes
 * @class
 */
export class Log {
  /** @type {LogLevel} */
  static get Level() {
    return Object.freeze({
      NONE: 0,
      DEBUG: 1,
      INFO: 2,
      WARN: 3,
      ERROR: 4,
      FATAL: 5,
      0: "NONE",
      1: "DEBUG",
      2: "INFO",
      3: "WARN",
      4: "ERROR",
      5: "FATAL",
    });
  }

  static get commands() {
    return {
      [Log.Level.NONE]: () => {}, // noop
      [Log.Level.DEBUG]: console.debug.bind(console),
      [Log.Level.INFO]: console.info.bind(console),
      [Log.Level.WARN]: console.warn.bind(console),
      [Log.Level.ERROR]: console.error.bind(console),
      [Log.Level.FATAL]: console.error.bind(console),
    };
  }

  static get [Symbol.toStringTag]() {
    return this.name || "Log";
  }

  /**
   * @param {LogOptions} [options] The options to use.
   */
  constructor(options = this.options) {
    Object.assign(this.options, options || {});
    return this;
  }

  /** @type {LogOptionsResolved} */
  #options = {
    level: Log.Level.ERROR,
    timestamps: true,
    labels: true,
  };

  /** @type {LogOptionsResolved} */
  get options() {
    return this.#options;
  }

  /**
   * @param {LogOptions} value The options to set.
   */
  set options(value) {
    value = { ...this.options, ...(value || {}) };
    Object.assign(this.#options, value);
    if (value.level != null) this.level = value.level;
  }

  /** Get the current log level. */
  get level() {
    return this.options.level;
  }

  /** Set the log level. */
  set level(value) {
    if (value in Log.Level && Object.hasOwn(Log.Level, value)) {
      value = /^\d+$/.test(value + "") ? value : Log.Level[value];
      this.options.level = +value;
    } else {
      throw new TypeError(
        `Invalid log level. Expected one of the following:\n\t${
          Object.keys(Log.Level).filter((k) => isNaN(+k)).map(
            (k, i, a) =>
              `${i === a.length - 1 ? "or " : ""}'${k}' (${Log.Level[k]})`,
          ).join(", ")
        }.\nReceived: '${value}' (${typeof value})\n`,
      );
    }
  }

  #log(level = Log.Level.DEBUG, ...args) {
    // ensure the level is a numeric value
    level = isNaN(+level) ? Log.Level[level] : +level;
    // only write if the level is greater than or equal to the current level
    if (this.level <= level) {
      // prepend the timestamp if enabled
      if (this.options.timestamps) args.unshift(new Date());
      // prepend the label if enabled
      if (this.options.labels && level in Log.Level) {
        const label = Log.Level[level];
        args.unshift(label);
      }
      if (level in Log.commands) Log.commands[level](...args);
    }
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Console/table
   */
  table = (data, ...columns) => console.table.call(console, data, columns);

  /**
   * @param {boolean=} condition - The condition to test.
   * @param {...*} data - These will be logged to `stderr` if the condition fails.
   * @returns {asserts condition} throws if the condition fails.
   */
  assert = (condition, ...data) =>
    console.assert.call(console, condition, ...data);
  clear = () => console.clear.call(console);

  debug = (...args) => this.#log(Log.Level.DEBUG, ...args);
  log = (...args) => this.#log(Log.Level.INFO, ...args);
  info = (...args) => this.#log(Log.Level.INFO, ...args);
  warn = (...args) => this.#log(Log.Level.WARN, ...args);
  error = (...args) => this.#log(Log.Level.ERROR, ...args);
  fatal = (...args) => this.#log(Log.Level.FATAL, ...args);

  get count() {
    return Object.assign(
      (label = "default") => console.count.call(console, label),
      { reset: (label = "default") => console.countReset.call(console, label) },
    );
  }

  get group() {
    return Object.assign(
      (label = "default") => console.group.call(console, label),
      {
        end: () => console.groupEnd.call(console),
        collapsed: (label = "default") =>
          console.groupCollapsed.call(console, label),
      },
    );
  }

  get time() {
    return Object.assign(
      (label = "default") => console.time.call(console, label),
      {
        end: (label = "default") => console.timeEnd.call(console, label),
        log: (label = "default", ...data) =>
          console.timeLog.call(console, label, ...data),
        stamp: (label = "default") => console.timeStamp.call(console, label),
      },
    );
  }

  get dir() {
    return Object.assign(
      (label = "default", ...data) => console.dir.call(console, label, ...data),
      {
        xml: (label = "default", ...data) =>
          console.dirxml.call(console, label, ...data),
      },
    );
  }

  get [Symbol.toStringTag]() {
    return this.constructor.name || "Log";
  }
}

export const log = new Log({
  level: Log.Level.WARN,
  timestamps: true,
  labels: true,
});

export default Log;
