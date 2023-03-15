import { standardNames } from "./standard_names.js";

/**
 * @exports opentype.GlyphNames
 * @class
 */
export class GlyphNames {
  /**
   * @constructor
   * @param {Object} post
   */
  constructor(post) {
    switch (post.version) {
      case 1:
        this.names = standardNames.slice();
        break;
      case 2:
        this.names = new Array(post.numberOfGlyphs);
        for (let i = 0; i < post.numberOfGlyphs; i++) {
          if (post.glyphNameIndex[i] < standardNames.length) {
            this.names[i] = standardNames[post.glyphNameIndex[i]];
          } else {
            this.names[i] =
              post.names[post.glyphNameIndex[i] - standardNames.length];
          }
        }

        break;
      case 2.5:
        this.names = new Array(post.numberOfGlyphs);
        for (let i = 0; i < post.numberOfGlyphs; i++) {
          this.names[i] = standardNames[i + post.glyphNameIndex[i]];
        }

        break;
      case 3:
        this.names = [];
        break;
      default:
        this.names = [];
        break;
    }
  }
  /**
   * Gets the index of a glyph by name.
   * @param  {string} name - The glyph name
   * @return {number} The index
   */
  nameToGlyphIndex(name) {
    return this.names.indexOf(name);
  }
  /**
   * @param  {number} gid
   * @return {string}
   */
  glyphIndexToName(gid) {
    return this.names[gid];
  }
}

function addGlyphNamesAll(font) {
  let glyph;
  const glyphIndexMap = font.tables.cmap.glyphIndexMap;
  const charCodes = Object.keys(glyphIndexMap);

  for (let i = 0; i < charCodes.length; i += 1) {
    const c = charCodes[i];
    const glyphIndex = glyphIndexMap[c];
    glyph = font.glyphs.get(glyphIndex);
    glyph.addUnicode(parseInt(c));
  }

  for (let i = 0; i < font.glyphs.length; i += 1) {
    glyph = font.glyphs.get(i);
    if (font.cffEncoding) {
      if (font.isCIDFont) {
        glyph.name = "gid" + i;
      } else {
        glyph.name = font.cffEncoding.charset[i];
      }
    } else if (font.glyphNames.names) {
      glyph.name = font.glyphNames.glyphIndexToName(i);
    }
  }
}

function addGlyphNamesToUnicodeMap(font) {
  font._IndexToUnicodeMap = {};

  const glyphIndexMap = font.tables.cmap.glyphIndexMap;
  const charCodes = Object.keys(glyphIndexMap);

  for (let i = 0; i < charCodes.length; i += 1) {
    const c = charCodes[i];
    let glyphIndex = glyphIndexMap[c];
    if (font._IndexToUnicodeMap[glyphIndex] === undefined) {
      font._IndexToUnicodeMap[glyphIndex] = {
        unicodes: [parseInt(c)],
      };
    } else {
      font._IndexToUnicodeMap[glyphIndex].unicodes.push(parseInt(c));
    }
  }
}

/**
 * @alias opentype.addGlyphNames
 * @param {opentype.Font}
 * @param {Object}
 */
export function addGlyphNames(font, opt) {
  if (opt.lowMemory) {
    addGlyphNamesToUnicodeMap(font);
  } else {
    addGlyphNamesAll(font);
  }
}
