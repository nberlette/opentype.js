import opentype from "./opentype.js";

export { opentype as default };

export const {
  BoundingBox,
  Font,
  Glyph,
  load,
  parseBuffer: parse,
  parseBuffer,
  Parser,
  Path,
  types,
} = opentype;

/**
 * @deprecated Use {@link load} instead.
 */
export const loadSync = opentype.loadSync;
