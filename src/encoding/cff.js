/**
 * @exports opentype.CffEncoding
 * @class
 */
export class CffEncoding {
  /**
   * @constructor
   * @param {string} encoding - The encoding
   * @param {Array} charset - The character set.
   */
  constructor(encoding, charset) {
    this.encoding = encoding;
    this.charset = charset;
  }
  /**
   * @param  {string} s - The character
   * @return {number} The index.
   */
  charToGlyphIndex(s) {
    const code = s.codePointAt(0);
    const charName = this.encoding[code];
    return this.charset.indexOf(charName);
  }
}
