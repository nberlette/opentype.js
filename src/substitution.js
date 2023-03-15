// The Substitution object provides utility methods to manipulate
// the GSUB substitution table.

import * as check from "./check.js";
import { Layout } from "./layout.js";
import { arraysEqual } from "./util.js";

/**
 * @typedef {{ version: 1; scripts: ({ tag: string; script: { defaultLangSys: { reserved: number; reqFeatureIndex: number; featureIndexes: number[] }; langSysRecords: unknown[]; }; })[]; features: unknown[]; lookups: unknown[]; }} SubstitutionTable
 */
/**
 * The Substitution class provides utility methods to manipulate the GSUB
 * substitution table. It also inherits all of the methods and properties
 * present in the {@link Layout} class.
 */
export class Substitution extends Layout {
  constructor(font) {
    super(font, "gsub");
  }

  /**
   * Create a default GSUB table.
   * @return {DefaultTable} gsub - The GSUB table.
   */
  createDefaultTable() {
    // Generate a default empty GSUB table with just a DFLT script and dflt lang sys.
    return {
      version: 1,
      scripts: [{
        tag: "DFLT",
        script: {
          defaultLangSys: {
            reserved: 0,
            reqFeatureIndex: 0xffff,
            featureIndexes: [],
          },
          langSysRecords: [],
        },
      }],
      features: [],
      lookups: [],
    };
  }

  /**
   * List all single substitutions (lookup type 1) for a given script, language, and
   * feature.
   *
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   * @param {string} feature - 4-character feature name ('aalt', 'salt', 'ss01'...)
   * @return substitutions - The list of substitutions.
   */
  getSingle(feature, script, language) {
    const substitutions = [];
    const lookupTables = this.getLookupTables(script, language, feature, 1);

    for (const { subtables = [] } of lookupTables) {
      for (const subtable of subtables) {
        const glyphs = this.expandCoverage(subtable.coverage);
        if (subtable.substFormat === 1) {
          const delta = subtable.deltaGlyphId;

          for (
            let g = 0,
              sub = glyphs[g],
              by = sub + delta;
            g < glyphs.length;
            g++
          ) substitutions.push({ sub, by });
        } else {
          const substitute = subtable.substitute;

          for (
            let g = 0,
              sub = glyphs[g],
              by = substitute[g];
            g < glyphs.length;
            g++
          ) substitutions.push({ sub, by });
        }
      }
    }

    return substitutions;
  }

  /**
   * List all multiple substitutions (lookup type 2) for a given script, language,
   * and feature.
   *
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   * @param {string} feature - 4-character feature name ('ccmp', 'stch')
   * @return {Array} substitutions - The list of substitutions.
   */
  getMultiple(feature, script, language) {
    const substitutions = [];
    const lookupTables = this.getLookupTables(script, language, feature, 2);

    for (const { subtables = [] } of lookupTables) {
      for (const subtable of subtables) {
        const glyphs = this.expandCoverage(subtable.coverage);

        for (
          let i = 0,
            sub = glyphs[i],
            by = subtable.sequences[i];
          i < glyphs.length;
          i++
        ) substitutions.push({ sub, by });
      }
    }

    return substitutions;
  }

  /**
   * List all alternates (lookup type 3) for a given script, language, and feature.
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   * @param {string} feature - 4-character feature name ('aalt', 'salt'...)
   * @return {Array} alternates - The list of alternates
   */
  getAlternates(feature, script, language) {
    const alternates = [];
    const lookupTables = this.getLookupTables(script, language, feature, 3);

    for (const { subtables = [] } of lookupTables) {
      for (const { coverage, alternateSets } of subtables) {
        const glyphs = this.expandCoverage(coverage);

        for (
          let i = 0,
            sub = glyphs[i],
            by = alternateSets[i];
          i < glyphs.length;
          i++
        ) alternates.push({ sub, by });
      }
    }
    return alternates;
  }

  /**
   * List all ligatures (lookup type 4) for a given script, language, and feature.
   * The result is an array of ligature objects like { sub: [ids], by: id }
   * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   * @return {Array} ligatures - The list of ligatures.
   */
  getLigatures(feature, script, language) {
    const ligatures = [];
    const lookupTables = this.getLookupTables(script, language, feature, 4);

    for (const { subtables = [] } of lookupTables) {
      for (const { ligatureSets, coverage } of subtables) {
        const glyphs = this.expandCoverage(coverage);

        for (
          let i = 0,
            startGlyph = glyphs[i],
            ligSet = ligatureSets[i];
          i < glyphs.length;
          i++
        ) {
          for (const { components, ligGlyph } of ligSet) {
            ligatures.push({
              sub: [startGlyph].concat(components),
              by: ligGlyph,
            });
          }
        }
      }
    }
    return ligatures;
  }

  /**
   * Add or modify a single substitution (lookup type 1)
   * Format 2, more flexible, is always used.
   * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
   * @param {Object} substitution - { sub: id, by: id } (format 1 is not supported)
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   */
  addSingle(feature, substitution, script, language) {
    const lookupTable =
      this.getLookupTables(script, language, feature, 1, true)[0];

    const subtable = getSubstFormat(lookupTable, 2, {
      substFormat: 2,
      coverage: { format: 1, glyphs: [] },
      substitute: [],
    });

    check.assert(
      subtable.coverage.format === 1,
      "Single: unable to modify coverage table format " +
        subtable.coverage.format,
    );

    const coverageGlyph = substitution.sub;
    let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);

    if (pos < 0) {
      pos = -1 - pos;
      subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
      subtable.substitute.splice(pos, 0, 0);
    }

    subtable.substitute[pos] = substitution.by;
  }

  /**
   * Add or modify a multiple substitution (lookup type 2)
   * @param {string} feature - 4-letter feature name ('ccmp', 'stch')
   * @param {Object} substitution - { sub: id, by: [id] } for format 2.
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   */
  addMultiple(feature, substitution, script, language) {
    check.assert(
      substitution.by instanceof Array && substitution.by.length > 1,
      'Multiple: "by" must be an array of two or more ids',
    );

    const lookupTable =
      this.getLookupTables(script, language, feature, 2, true)[0];

    const subtable = getSubstFormat(lookupTable, 1, {
      substFormat: 1,
      coverage: { format: 1, glyphs: [] },
      sequences: [],
    });

    check.assert(
      subtable.coverage.format === 1,
      "Multiple: unable to modify coverage table format " +
        subtable.coverage.format,
    );

    const coverageGlyph = substitution.sub;
    let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);

    if (pos < 0) {
      pos = -1 - pos;
      subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
      subtable.sequences.splice(pos, 0, 0);
    }

    subtable.sequences[pos] = substitution.by;
  }

  /**
   * Add or modify an alternate substitution (lookup type 3)
   * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
   * @param {Object} substitution - { sub: id, by: [ids] }
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   */
  addAlternate(feature, substitution, script, language) {
    const lookupTable =
      this.getLookupTables(script, language, feature, 3, true)[0];

    const subtable = getSubstFormat(lookupTable, 1, {
      substFormat: 1,
      coverage: { format: 1, glyphs: [] },
      alternateSets: [],
    });

    check.assert(
      subtable.coverage.format === 1,
      "Alternate: unable to modify coverage table format " +
        subtable.coverage.format,
    );

    const coverageGlyph = substitution.sub;
    let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);

    if (pos < 0) {
      pos = -1 - pos;
      subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
      subtable.alternateSets.splice(pos, 0, 0);
    }

    subtable.alternateSets[pos] = substitution.by;
  }
  /**
   * Add a ligature (lookup type 4)
   * Ligatures with more components must be stored ahead of those with fewer components in order to be found
   * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
   * @param {Object} ligature - { sub: [ids], by: id }
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   */
  addLigature(feature, ligature, script, language) {
    const lookupTable =
      this.getLookupTables(script, language, feature, 4, true)[0];

    let subtable = lookupTable.subtables[0];
    if (!subtable) {
      subtable = {
        substFormat: 1,
        coverage: { format: 1, glyphs: [] },
        ligatureSets: [],
      };
      lookupTable.subtables[0] = subtable;
    }

    check.assert(
      subtable.coverage.format === 1,
      "Ligature: unable to modify coverage table format " +
        subtable.coverage.format,
    );

    const coverageGlyph = ligature.sub[0];
    const ligComponents = ligature.sub.slice(1);
    const ligatureTable = {
      ligGlyph: ligature.by,
      components: ligComponents,
    };

    let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos >= 0) {
      // ligatureSet already exists
      const ligatureSet = subtable.ligatureSets[pos];

      for (const { components } of ligatureSet) {
        // If ligature already exists, return.
        if (arraysEqual(components, ligComponents)) return;
      }

      // ligature does not exist: add it.
      ligatureSet.push(ligatureTable);
    } else {
      // Create a new ligatureSet and add coverage for the first glyph.
      pos = -1 - pos;
      subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
      subtable.ligatureSets.splice(pos, 0, [ligatureTable]);
    }
  }

  /**
   * List all feature data for a given script and language.
   * @param {string} feature - 4-letter feature name
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   * @return {Array} substitutions - The list of substitutions.
   */
  getFeature(feature, script, language) {
    if (/ss\d\d/.test(feature)) {
      // ss01 - ss20
      return this.getSingle(feature, script, language);
    }

    switch (feature) {
      case "aalt":
      case "salt":
        return this.getSingle(feature, script, language)
          .concat(this.getAlternates(feature, script, language));
      case "dlig":
      case "liga":
      case "rlig":
        return this.getLigatures(feature, script, language);
      case "ccmp":
        return this.getMultiple(feature, script, language)
          .concat(this.getLigatures(feature, script, language));
      case "stch":
        return this.getMultiple(feature, script, language);
    }

    return undefined;
  }

  /**
   * Add a substitution to a feature for a given script and language.
   * @param {string} feature - 4-letter feature name
   * @param {Object} sub - the substitution to add (an object like { sub: id or [ids], by: id or [ids] })
   * @param {string} [script='DFLT']
   * @param {string} [language='dflt']
   */
  add(feature, sub, script, language) {
    if (/ss\d\d/.test(feature)) {
      // ss01 - ss20
      return this.addSingle(feature, sub, script, language);
    }

    switch (feature) {
      case "aalt":
      case "salt":
        if (typeof sub.by === "number") {
          return this.addSingle(feature, sub, script, language);
        }
        return this.addAlternate(feature, sub, script, language);
      case "dlig":
      case "liga":
      case "rlig":
        return this.addLigature(feature, sub, script, language);
      case "ccmp":
        if (sub.by instanceof Array) {
          return this.addMultiple(feature, sub, script, language);
        }
        return this.addLigature(feature, sub, script, language);
    }

    return undefined;
  }
}

// Find the first subtable of a lookup table in a particular format.
function getSubstFormat(lookupTable, format, defaultSubtable) {
  const subtables = lookupTable.subtables || (lookupTable.subtables = []);

  for (const subtable of subtables) {
    if (subtable.substFormat === format) return subtable;
  }

  if (defaultSubtable) {
    subtables.push(defaultSubtable);
    return defaultSubtable;
  }

  return undefined;
}

export default Substitution;
