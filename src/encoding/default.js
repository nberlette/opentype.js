/**
 * This is the encoding used for fonts created from scratch.
 * It loops through all glyphs and finds the appropriate unicode value.
 * Since it's linear time, other encodings will be faster.
 * @exports opentype.DefaultEncoding
 * @class
 */
export class DefaultEncoding {
  /**
   * @param {opentype.Font}
   */
  constructor(font) {
    this.font = font;
  }
  charToGlyphIndex(c) {
    const code = c.codePointAt(0);
    const glyphs = this.font.glyphs;
    if (glyphs) {
      for (let i = 0; i < glyphs.length; i += 1) {
        const glyph = glyphs.get(i);
        for (let j = 0; j < glyph.unicodes.length; j += 1) {
          if (glyph.unicodes[j] === code) {
            return i;
          }
        }
      }
    }
    return null;
  }
}
