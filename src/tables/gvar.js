import { log } from "../util.js";

// The `gvar` table stores information on how to modify glyf outlines across the variation space
// https://learn.microsoft.com/en-us/typography/opentype/spec/gvar

export function make() {
  log.warn("Writing of gvar tables is not yet supported.");
}

export function parse(data, start, names) {
  log.warn("Parsing of gvar tables is not yet supported.");
}

export default { make, parse };
