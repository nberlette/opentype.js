// The Font object

import { Path } from "./path.js";
import { DefaultEncoding } from "./encoding.js";
import { GlyphSet } from "./glyphset.js";
import { Position } from "./position.js";
import { Substitution } from "./substitution.js";
import {
  checkArgument,
  isBrowser,
  isDeno,
  isDenoDeploy,
  isNode,
  log,
} from "./util.js";
import { default as HintingTrueType } from "./hintingtt.js";
import { Bidi } from "./bidi.js";
import * as sfnt from "./tables/sfnt.js";

function createDefaultNamesInfo(options) {
  return {
    fontFamily: { en: options.familyName || " " },
    fontSubfamily: { en: options.styleName || " " },
    fullName: {
      en: options.fullName || options.familyName + " " + options.styleName,
    },
    // postScriptName may not contain any whitespace
    postScriptName: {
      en: options.postScriptName ||
        (options.familyName + options.styleName).replace(/\s/g, ""),
    },
    designer: { en: options.designer || " " },
    designerURL: { en: options.designerURL || " " },
    manufacturer: { en: options.manufacturer || " " },
    manufacturerURL: { en: options.manufacturerURL || " " },
    license: { en: options.license || " " },
    licenseURL: { en: options.licenseURL || " " },
    version: { en: options.version || "Version 0.1" },
    description: { en: options.description || " " },
    copyright: { en: options.copyright || " " },
    trademark: { en: options.trademark || " " },
  };
}

/**
 * @typedef FontOptions
 * @type Object
 * @property {boolean} empty - whether to create a new empty font
 * @property {string} familyName - Font Family Name
 * @property {string} styleName - Font Style or Subfamily Name (a.k.a. subfamily name, e.g. "Regular" or "Bold")
 * @property {string=} fullName - Font Full Name (e.g. "Arial Bold")
 * @property {string=} postScriptName - Font PostScript Name (e.g. "Arial-Bold")
 * @property {string=} designer - Font Designer (e.g. "Linotype")
 * @property {string=} designerURL - URL of the font designer (e.g. "http://www.linotype.com")
 * @property {string=} manufacturer - Font Manufacturer (e.g. Hoefler & Co.)
 * @property {string=} manufacturerURL - Font Manufacturer's website URL (e.g. "http://www.typography.com")
 * @property {string=} license - Font distribution license text
 * @property {string=} licenseURL - Website URL of the font distribution license (e.g. "http://scripts.sil.org/OFL")
 * @property {string=} version - Font version (e.g. "Version 1.00")
 * @property {string=} description - Font description (e.g. "Arial Bold")
 * @property {string=} copyright - Font copyright notice (e.g. "Copyright 2010 The Font Company")
 * @property {string=} trademark - Font trademark notice (e.g. "Arial is a trademark of The Font Company")
 * @property {number} unitsPerEm - Number of font units per em square (typographic points)
 * @property {number} ascender - Font ascender, measured from the horizontal baseline
 * @property {number} descender - Font descender, measured from the horizontal baseline
 * @property {number} createdTimestamp - The timestamp of when the font was created
 * @property {string=} weightClass - Font weight class (e.g. "Regular" or "Bold"). See {@link UsWeightClasses} for possible values.
 * @property {string=} widthClass - Font width class (e.g. "Condensed" or "Expanded"). See {@link UsWidthClasses} for possible values.
 * @property {string=} fsSelection - Font selection flags (e.g. "Oblique" or "Underscore"). See {@link FsSelectionValues} for possible values.
 */

/**
 * @typedef {{
 *   ITALIC: 1; // 0x01
 *   UNDERSCORE: 2; // 0x02
 *   NEGATIVE: 4; // 0x04
 *   OUTLINED: 8; // 0x08
 *   STRIKEOUT: 16; // 0x10
 *   BOLD: 32; // 0x20
 *   REGULAR: 64; // 0x40
 *   USER_TYPO_METRICS: 128; // 0x80
 *   WWS: 256; // 0x100
 *   OBLIQUE: 512; // 0x200
 * }} FsSelectionValues
 *
 * @typedef {{
 *   ULTRA_CONDENSED: 1;
 *   EXTRA_CONDENSED: 2;
 *   CONDENSED: 3;
 *   SEMI_CONDENSED: 4;
 *   MEDIUM: 5;
 *   SEMI_EXPANDED: 6;
 *   EXPANDED: 7;
 *   EXTRA_EXPANDED: 8;
 *   ULTRA_EXPANDED: 9;
 * }} UsWidthClasses
 *
 * @typedef {{
 *   THIN: 100;
 *   EXTRA_LIGHT: 200; // (Ultra Light)
 *   LIGHT: 300;
 *   NORMAL: 400; // (Regular, Book)
 *   MEDIUM: 500;
 *   SEMI_BOLD: 600; // (Demi Bold)
 *   BOLD: 700;
 *   EXTRA_BOLD: 800; // (Ultra Bold)
 *   BLACK: 900;
 * }} UsWeightClasses
 *
 * @typedef {object} GlyphRenderOptions
 * @property {string} [script] - script used to determine which features to apply. By default, 'DFLT' or 'latn' is used. See https://www.microsoft.com/typography/otspec/scripttags.htm
 * @property {string} [language='dflt'] - language system used to determine which features to apply. See https://www.microsoft.com/typography/developers/opentype/languagetags.aspx
 * @property {boolean} [kerning=true] - whether to include kerning values
 * @property {object} [features] - OpenType Layout feature tags. Used to enable or disable the features of the given script/language system. See https://www.microsoft.com/typography/otspec/featuretags.htm
 *
 * @exports FsSelectionValues
 * @exports UsWidthClasses
 * @exports UsWeightClasses
 * @exports GlyphRenderOptions
 */

/**
 * A Font represents a loaded OpenType font file.
 * It contains a set of glyphs and methods to draw text on a drawing context,
 * or to get a path representing the text.
 *
 * @class Font
 * @exports Font
 * @param {FontOptions}
 * @constructor
 */
export class Font {
  constructor(options) {
    options = options || {};
    options.tables = options.tables || {};

    if (!options.empty) {
      // Check that we've provided the minimum set of names.
      checkArgument(
        options.familyName,
        "When creating a new Font object, familyName is required.",
      );
      checkArgument(
        options.styleName,
        "When creating a new Font object, styleName is required.",
      );
      checkArgument(
        options.unitsPerEm,
        "When creating a new Font object, unitsPerEm is required.",
      );
      checkArgument(
        options.ascender,
        "When creating a new Font object, ascender is required.",
      );
      checkArgument(
        options.descender <= 0,
        "When creating a new Font object, negative descender value is required.",
      );

      // OS X will complain if the names are empty, so we put a single space everywhere by default.
      this.names = {};
      this.names.unicode = createDefaultNamesInfo(options);
      this.names.macintosh = createDefaultNamesInfo(options);
      this.names.windows = createDefaultNamesInfo(options);
      this.unitsPerEm = options.unitsPerEm || 1000;
      this.ascender = options.ascender;
      this.descender = options.descender;
      this.createdTimestamp = options.createdTimestamp;
      this.tables = Object.assign(options.tables, {
        os2: Object.assign({
          usWeightClass: options.weightClass || this.usWeightClasses.MEDIUM,
          usWidthClass: options.widthClass || this.usWidthClasses.MEDIUM,
          fsSelection: options.fsSelection || this.fsSelectionValues.REGULAR,
        }, options.tables.os2),
      });
    }

    this.supported = true; // Deprecated: parseBuffer will throw an error if font is not supported.
    this.glyphs = new GlyphSet(this, options.glyphs || []);
    this.encoding = new DefaultEncoding(this);
    this.position = new Position(this);
    this.substitution = new Substitution(this);
    this.tables = this.tables || {};

    // needed for low memory mode only.
    this._push = null;
    this._hmtxTableData = {};

    Object.defineProperties(this, {
      _push: { enumerable: false, writable: true, configurable: true },
      hinting: {
        get() {
          if (this._hinting) {
            return this._hinting;
          }
          if (this.outlinesFormat === "truetype") {
            return (this._hinting = new HintingTrueType(this));
          }
          return null;
        },
      },
    });
  }

  /**
   * @type {GlyphRenderOptions}
   */
  get defaultRenderOptions() {
    return {
      kerning: true,
      features: [
        /**
         * these 4 features are required to render Arabic text properly
         * and shouldn't be turned off when rendering arabic text.
         */
        { script: "arab", tags: ["init", "medi", "fina", "rlig"] },
        { script: "latn", tags: ["liga", "rlig"] },
      ],
    };
  }

  /**
   * @type {FsSelectionValues}
   * @private
   */
  get fsSelectionValues() {
    return {
      ITALIC: 0x001, //1
      UNDERSCORE: 0x002, //2
      NEGATIVE: 0x004, //4
      OUTLINED: 0x008, //8
      STRIKEOUT: 0x010, //16
      BOLD: 0x020, //32
      REGULAR: 0x040, //64
      USER_TYPO_METRICS: 0x080, //128
      WWS: 0x100, //256
      OBLIQUE: 0x200, //512
    };
  }

  /**
   * @type {UsWidthClasses}
   * @private
   */
  get usWidthClasses() {
    return {
      ULTRA_CONDENSED: 1,
      EXTRA_CONDENSED: 2,
      CONDENSED: 3,
      SEMI_CONDENSED: 4,
      MEDIUM: 5,
      SEMI_EXPANDED: 6,
      EXPANDED: 7,
      EXTRA_EXPANDED: 8,
      ULTRA_EXPANDED: 9,
    };
  }

  /**
   * @type {UsWeightClasses}
   * @private
   */
  get usWeightClasses() {
    return {
      THIN: 100,
      EXTRA_LIGHT: 200,
      LIGHT: 300,
      NORMAL: 400,
      MEDIUM: 500,
      SEMI_BOLD: 600,
      BOLD: 700,
      EXTRA_BOLD: 800,
      BLACK: 900,
    };
  }

  /**
   * Check if the font has a glyph for the given character.
   * @param  {string}
   * @return {Boolean}
   */
  hasChar(c) {
    return this.encoding.charToGlyphIndex(c) !== null;
  }

  /**
   * Convert the given character to a single glyph index.
   * Note that this function assumes that there is a one-to-one mapping between
   * the given character and a glyph; for complex scripts this might not be the case.
   * @param  {string}
   * @return {Number}
   */
  charToGlyphIndex(s) {
    return this.encoding.charToGlyphIndex(s);
  }

  /**
   * Convert the given character to a single Glyph object.
   * Note that this function assumes that there is a one-to-one mapping between
   * the given character and a glyph; for complex scripts this might not be the case.
   * @param  {string}
   * @return {opentype.Glyph}
   */
  charToGlyph(c) {
    const glyphIndex = this.charToGlyphIndex(c);
    let glyph = this.glyphs.get(glyphIndex);
    if (!glyph) {
      // .notdef
      glyph = this.glyphs.get(0);
    }

    return glyph;
  }

  /**
   * Update features
   * @param {any} options features options
   */
  updateFeatures(options) {
    // TODO: update all features options not only 'latn'.
    return this.defaultRenderOptions.features.map((feature) => {
      if (feature.script === "latn") {
        return {
          script: "latn",
          tags: feature.tags.filter((tag) => options[tag]),
        };
      } else {
        return feature;
      }
    });
  }

  /**
   * Convert the given text to a list of Glyph indexes.
   * Note that there is no strict one-to-one mapping between characters and
   * glyphs, so the list of returned glyph indexes can be larger or smaller than the
   * length of the given string.
   * @param  {string}
   * @param  {GlyphRenderOptions} [options]
   * @return {number[]}
   */
  stringToGlyphIndexes(s, options) {
    const bidi = new Bidi();

    // Create and register 'glyphIndex' state modifier
    const charToGlyphIndexMod = (token) => this.charToGlyphIndex(token.char);
    bidi.registerModifier("glyphIndex", null, charToGlyphIndexMod);

    // roll-back to default features
    let features = options
      ? this.updateFeatures(options.features)
      : this.defaultRenderOptions.features;

    bidi.applyFeatures(this, features);

    return bidi.getTextGlyphs(s);
  }

  /**
   * Convert the given text to a list of Glyph objects.
   * Note that there is no strict one-to-one mapping between characters and
   * glyphs, so the list of returned glyphs can be larger or smaller than the
   * length of the given string.
   * @param  {string}
   * @param  {GlyphRenderOptions} [options]
   * @return {opentype.Glyph[]}
   */
  stringToGlyphs(s, options) {
    const indexes = this.stringToGlyphIndexes(s, options);

    let length = indexes.length;

    // convert glyph indexes to glyph objects
    const glyphs = new Array(length);
    const notdef = this.glyphs.get(0);
    for (let i = 0; i < length; i += 1) {
      glyphs[i] = this.glyphs.get(indexes[i]) || notdef;
    }
    return glyphs;
  }

  /**
   * @param  {string}
   * @return {Number}
   */
  nameToGlyphIndex(name) {
    return this.glyphNames.nameToGlyphIndex(name);
  }

  /**
   * @param  {string}
   * @return {opentype.Glyph}
   */
  nameToGlyph(name) {
    const glyphIndex = this.nameToGlyphIndex(name);
    let glyph = this.glyphs.get(glyphIndex);
    if (!glyph) {
      // .notdef
      glyph = this.glyphs.get(0);
    }

    return glyph;
  }

  /**
   * @param  {Number}
   * @return {String}
   */
  glyphIndexToName(gid) {
    if (!this.glyphNames.glyphIndexToName) {
      return "";
    }

    return this.glyphNames.glyphIndexToName(gid);
  }

  /**
   * Retrieve the value of the kerning pair between the left glyph (or its index)
   * and the right glyph (or its index). If no kerning pair is found, return 0.
   * The kerning value gets added to the advance width when calculating the spacing
   * between glyphs.
   * For GPOS kerning, this method uses the default script and language, which covers
   * most use cases. To have greater control, use font.position.getKerningValue .
   * @param  {opentype.Glyph} leftGlyph
   * @param  {opentype.Glyph} rightGlyph
   * @return {Number}
   */
  getKerningValue(leftGlyph, rightGlyph) {
    leftGlyph = leftGlyph.index || leftGlyph;
    rightGlyph = rightGlyph.index || rightGlyph;
    const gposKerning = this.position.defaultKerningTables;
    if (gposKerning) {
      return this.position.getKerningValue(gposKerning, leftGlyph, rightGlyph);
    }
    // "kern" table
    return this.kerningPairs[leftGlyph + "," + rightGlyph] || 0;
  }

  /**
   * Helper function that invokes the given callback for each glyph in the given text.
   * The callback gets `(glyph, x, y, fontSize, options)`.* @param  {string} text
   * @param {string} text - The text to apply.
   * @param  {number} [x=0] - Horizontal position of the beginning of the text.
   * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
   * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
   * @param  {GlyphRenderOptions=} options
   * @param  {Function} callback
   */
  forEachGlyph(text, x, y, fontSize, options, callback) {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    options = Object.assign({}, this.defaultRenderOptions, options);
    const fontScale = 1 / this.unitsPerEm * fontSize;
    const glyphs = this.stringToGlyphs(text, options);
    let kerningLookups;
    if (options.kerning) {
      const script = options.script || this.position.getDefaultScriptName();
      kerningLookups = this.position.getKerningTables(script, options.language);
    }
    for (let i = 0; i < glyphs.length; i += 1) {
      const glyph = glyphs[i];
      callback.call(this, glyph, x, y, fontSize, options);
      if (glyph.advanceWidth) {
        x += glyph.advanceWidth * fontScale;
      }

      if (options.kerning && i < glyphs.length - 1) {
        // We should apply position adjustment lookups in a more generic way.
        // Here we only use the xAdvance value.
        const kerningValue = kerningLookups
          ? this.position.getKerningValue(
            kerningLookups,
            glyph.index,
            glyphs[i + 1].index,
          )
          : this.getKerningValue(glyph, glyphs[i + 1]);
        x += kerningValue * fontScale;
      }

      if (options.letterSpacing) {
        x += options.letterSpacing * fontSize;
      } else if (options.tracking) {
        x += (options.tracking / 1000) * fontSize;
      }
    }
    return x;
  }

  /**
   * Create a Path object that represents the given text.
   * @param  {string} text - The text to create.
   * @param  {number} [x=0] - Horizontal position of the beginning of the text.
   * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
   * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
   * @param  {GlyphRenderOptions=} options
   * @return {opentype.Path}
   */
  getPath(text, x, y, fontSize, options) {
    const fullPath = new Path();
    this.forEachGlyph(
      text,
      x,
      y,
      fontSize,
      options,
      function (glyph, gX, gY, gFontSize) {
        const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
        fullPath.extend(glyphPath);
      },
    );
    return fullPath;
  }

  /**
   * Create an array of Path objects that represent the glyphs of a given text.
   * @param  {string} text - The text to create.
   * @param  {number} [x=0] - Horizontal position of the beginning of the text.
   * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
   * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
   * @param  {GlyphRenderOptions=} options
   * @return {opentype.Path[]}
   */
  getPaths(text, x, y, fontSize, options) {
    const glyphPaths = [];
    this.forEachGlyph(
      text,
      x,
      y,
      fontSize,
      options,
      function (glyph, gX, gY, gFontSize) {
        const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
        glyphPaths.push(glyphPath);
      },
    );

    return glyphPaths;
  }

  /**
   * Returns the advance width of a text.
   *
   * This is something different than Path.getBoundingBox() as for example a
   * suffixed whitespace increases the advanceWidth but not the bounding box
   * or an overhanging letter like a calligraphic 'f' might have a quite larger
   * bounding box than its advance width.
   *
   * This corresponds to canvas2dContext.measureText(text).width
   *
   * @param  {string} text - The text to create.
   * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
   * @param  {GlyphRenderOptions=} options
   * @return advance width
   */
  getAdvanceWidth(text, fontSize, options) {
    return this.forEachGlyph(text, 0, 0, fontSize, options, function () {});
  }

  /**
   * Draw the text on the given drawing context.
   * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
   * @param  {string} text - The text to create.
   * @param  {number} [x=0] - Horizontal position of the beginning of the text.
   * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
   * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
   * @param  {GlyphRenderOptions=} options
   */
  draw(ctx, text, x, y, fontSize, options) {
    this.getPath(text, x, y, fontSize, options).draw(ctx);
  }

  /**
   * Draw the points of all glyphs in the text.
   * On-curve points will be drawn in blue, off-curve points will be drawn in red.
   * @param {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
   * @param {string} text - The text to create.
   * @param {number} [x=0] - Horizontal position of the beginning of the text.
   * @param {number} [y=0] - Vertical position of the *baseline* of the text.
   * @param {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
   * @param {GlyphRenderOptions=} options
   */
  drawPoints(ctx, text, x, y, fontSize, options) {
    this.forEachGlyph(
      text,
      x,
      y,
      fontSize,
      options,
      function (glyph, gX, gY, gFontSize) {
        glyph.drawPoints(ctx, gX, gY, gFontSize);
      },
    );
  }

  /**
   * Draw lines indicating important font measurements for all glyphs in the text.
   * Black lines indicate the origin of the coordinate system (point 0,0).
   * Blue lines indicate the glyph bounding box.
   * Green line indicates the advance width of the glyph.
   * @param {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
   * @param {string} text - The text to create.
   * @param {number} [x=0] - Horizontal position of the beginning of the text.
   * @param {number} [y=0] - Vertical position of the *baseline* of the text.
   * @param {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
   * @param {GlyphRenderOptions=} options
   */
  drawMetrics(ctx, text, x, y, fontSize, options) {
    this.forEachGlyph(
      text,
      x,
      y,
      fontSize,
      options,
      function (glyph, gX, gY, gFontSize) {
        glyph.drawMetrics(ctx, gX, gY, gFontSize);
      },
    );
  }

  /**
   * @param  {string}
   * @return {string}
   */
  getEnglishName(name) {
    const translations =
      (this.names.unicode || this.names.macintosh || this.names.windows)[name];
    if (translations) {
      return translations.en;
    }
  }

  /**
   * Validate
   */
  validate() {
    const warnings = [];
    const _this = this;

    function assert(predicate, message) {
      if (!predicate) {
        warnings.push(message);
      }
    }

    function assertNamePresent(name) {
      const englishName = _this.getEnglishName(name);
      assert(
        englishName && englishName.trim().length > 0,
        "No English " + name + " specified.",
      );
    }

    // Identification information
    assertNamePresent("fontFamily");
    assertNamePresent("weightName");
    assertNamePresent("manufacturer");
    assertNamePresent("copyright");
    assertNamePresent("version");

    // Dimension information
    assert(this.unitsPerEm > 0, "No unitsPerEm specified.");
  }

  /**
   * Convert the font object to a SFNT data structure.
   * This structure contains all the necessary tables and metadata to create a binary OTF file.
   * @return {opentype.Table}
   */
  toTables() {
    return sfnt.fontToTable(this);
  }

  /**
   * @deprecated Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.
   * @see {@link Font.prototype.toArrayBuffer}
   */
  toBuffer() {
    log.warn(
      "Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.",
    );
    return this.toArrayBuffer();
  }

  /**
   * Converts a `opentype.Font` into an `ArrayBuffer`
   * @return {ArrayBuffer}
   */
  toArrayBuffer() {
    const sfntTable = this.toTables();
    const bytes = sfntTable.encode();
    const buffer = new ArrayBuffer(bytes.length);
    const intArray = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) intArray[i] = bytes[i];

    return buffer;
  }

  /**
   * Initiate a download of the OpenType font.
   * @param {string} [fileName] - The filename of the downloaded font. Defaults to a concatenation of the font family and style name.
   * @param {string} [type='font/opentype'] - The mime type of the downloaded font. Defaults to 'font/opentype'.
   */
  download(fileName, type = "font/opentype") {
    const familyName = this.getEnglishName("fontFamily");
    const styleName = this.getEnglishName("fontSubfamily");
    let ext = ".otf";
    if (type === "font/ttf") {
      ext = ".ttf";
    } else if (type === "font/woff") {
      ext = ".woff";
    } else if (type === "font/woff2") {
      // WOFF2 is not yet supported without external help.
      // so we use WOFF instead.
      type = "font/woff";
      ext = ".woff";
    } else if (type === "font/eot") {
      ext = ".eot";
    } else if (type === "font/svg") {
      ext = ".svg";
    }

    fileName = fileName ||
      familyName.replace(/\W/g, "") + "-" + styleName.replace(/\W/g, "") + ext;

    const arrayBuffer = this.toArrayBuffer();

    if (isBrowser()) {
      window.URL = window.URL || window.webkitURL;

      try {
        if (window.URL) {
          const dataView = new DataView(arrayBuffer);
          const blob = new Blob([dataView], { type });

          const link = document.createElement("a");
          link.href = window.URL.createObjectURL(blob);
          link.download = fileName;

          const event = new MouseEvent("click", {
            bubbles: true,
            cancelable: false,
          });

          link.dispatchEvent(event);
        } else {
          log.warn(
            "Font file could not be downloaded. Try using a different browser.",
          );
        }
      } catch (e) {
        log.warn(
          "Font file could not be downloaded. Try using a different browser.",
        );
      } finally {
        log.info(
          `✔️ Downloaded ${fileName} (${arrayBuffer.byteLength} B, type ${type})`,
        );
      }
    } else if (isDeno() && !isDenoDeploy()) {
      Deno.permissions.requestSync({ name: "write", path: fileName });
      const data = new Uint8Array(arrayBuffer);

      try {
        Deno.writeFileSync(fileName, data);
      } catch (e) {
        if (e instanceof Deno.errors.PermissionDenied) {
          log.warn(
            "Font file could not be downloaded. Try running with the --allow-write flag provided to the Deno executable.",
          );
        }
      } finally {
        log.info(`✔️ Wrote ${fileName} (${data.byteLength} B, type ${type})`);
      }
    } else if (isNode()) {
      const fs = require("node:fs");
      const buffer = Buffer.alloc(arrayBuffer.byteLength);
      const view = new Uint8Array(arrayBuffer);

      for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
      }
      try {
        fs.writeFileSync(fileName, buffer);
      } catch (e) {
        if (e instanceof Error && e.code === "EACCES") {
          log.warn(
            "Font file could not be downloaded. Please run with sudo or as root.",
          );
        }
      } finally {
        log.info(
          `✔️ Wrote ${fileName} (${buffer.byteLength} B, type ${type})`,
        );
      }
    }
  }
}

export default Font;
