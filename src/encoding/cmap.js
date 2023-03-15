/**
 * @exports opentype.CmapEncoding
 * @class
 * @constructor
 */
export class CmapEncoding {
  /**
   * @param {Object} cmap - a object with the cmap encoded data
   */
  constructor(cmap) {
    this.cmap = cmap;
  }
  /**
   * @param  {string} c - the character
   * @return {number} The glyph index.
   */
  charToGlyphIndex(c) {
    return this.cmap.glyphIndexMap[c.codePointAt(0)] || 0;
  }
}
