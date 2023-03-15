// Table metadata

import * as check from "./check.js";
import { encode, sizeOf } from "./types.js";

/**
 * @exports opentype.Table
 * @class
 */
export class Table {
  /**
   * @param {string} tableName
   * @param {Array} fields
   * @param {Object} options
   * @constructor
   */
  constructor(tableName, fields, options) {
    if (fields && fields.length) {
      for (let i = 0; i < fields.length; i += 1) {
        const field = fields[i];
        this[field.name] = field.value;
      }
    }

    this.tableName = tableName;
    this.fields = fields;
    if (options) {
      const optionKeys = Object.keys(options);
      for (let i = 0; i < optionKeys.length; i += 1) {
        const k = optionKeys[i];
        const v = options[k];
        if (this[k] !== undefined) {
          this[k] = v;
        }
      }
    }
  }
  /**
   * Encodes the table and returns an array of bytes
   * @return {Array}
   */
  encode() {
    return encode.TABLE(this);
  }
  /**
   * Get the size of the table.
   * @return {number}
   */
  sizeOf() {
    return sizeOf.TABLE(this);
  }
}

// Common Layout Tables
/**
 * @exports opentype.Coverage
 * @class
 * @param {opentype.Table}
 * @constructor
 * @extends opentype.Table
 */
export class Coverage extends Table {
  constructor(coverageTable) {
    if (coverageTable.format === 1) {
      super(
        "coverageTable",
        [{ name: "coverageFormat", type: "USHORT", value: 1 }]
          .concat(ushortList("glyph", coverageTable.glyphs)),
      );
    } else if (coverageTable.format === 2) {
      super(
        "coverageTable",
        [{ name: "coverageFormat", type: "USHORT", value: 2 }]
          .concat(
            recordList(
              "rangeRecord",
              coverageTable.ranges,
              function (RangeRecord, i) {
                return [
                  {
                    name: "startGlyphID" + i,
                    type: "USHORT",
                    value: RangeRecord.start,
                  },
                  {
                    name: "endGlyphID" + i,
                    type: "USHORT",
                    value: RangeRecord.end,
                  },
                  {
                    name: "startCoverageIndex" + i,
                    type: "USHORT",
                    value: RangeRecord.index,
                  },
                ];
              },
            ),
          ),
      );
    } else {
      check.assert(false, "Coverage format must be 1 or 2.");
    }
  }
}

export class ScriptList extends Table {
  constructor(scriptListTable) {
    super(
      "scriptListTable",
      recordList("scriptRecord", scriptListTable, function (scriptRecord, i) {
        const script = scriptRecord.script;
        let defaultLangSys = script.defaultLangSys;
        check.assert(
          !!defaultLangSys,
          "Unable to write GSUB: script " + scriptRecord.tag +
            " has no default language system.",
        );
        return [
          { name: "scriptTag" + i, type: "TAG", value: scriptRecord.tag },
          {
            name: "script" + i,
            type: "TABLE",
            value: new Table(
              "scriptTable",
              [
                {
                  name: "defaultLangSys",
                  type: "TABLE",
                  value: new Table(
                    "defaultLangSys",
                    [
                      { name: "lookupOrder", type: "USHORT", value: 0 },
                      {
                        name: "reqFeatureIndex",
                        type: "USHORT",
                        value: defaultLangSys.reqFeatureIndex,
                      },
                    ]
                      .concat(
                        ushortList(
                          "featureIndex",
                          defaultLangSys.featureIndexes,
                        ),
                      ),
                  ),
                },
              ].concat(
                recordList(
                  "langSys",
                  script.langSysRecords,
                  function (langSysRecord, i) {
                    const langSys = langSysRecord.langSys;
                    return [
                      {
                        name: "langSysTag" + i,
                        type: "TAG",
                        value: langSysRecord.tag,
                      },
                      {
                        name: "langSys" + i,
                        type: "TABLE",
                        value: new Table(
                          "langSys",
                          [
                            { name: "lookupOrder", type: "USHORT", value: 0 },
                            {
                              name: "reqFeatureIndex",
                              type: "USHORT",
                              value: langSys.reqFeatureIndex,
                            },
                          ].concat(
                            ushortList("featureIndex", langSys.featureIndexes),
                          ),
                        ),
                      },
                    ];
                  },
                ),
              ),
            ),
          },
        ];
      }),
    );
  }
}

/**
 * @exports opentype.FeatureList
 * @class
 * @param {opentype.Table}
 * @constructor
 * @extends opentype.Table
 */
export class FeatureList extends Table {
  constructor(featureListTable) {
    super(
      "featureListTable",
      recordList(
        "featureRecord",
        featureListTable,
        function (featureRecord, i) {
          const feature = featureRecord.feature;
          return [
            { name: "featureTag" + i, type: "TAG", value: featureRecord.tag },
            {
              name: "feature" + i,
              type: "TABLE",
              value: new Table(
                "featureTable",
                [
                  {
                    name: "featureParams",
                    type: "USHORT",
                    value: feature.featureParams,
                  },
                ].concat(
                  ushortList("lookupListIndex", feature.lookupListIndexes),
                ),
              ),
            },
          ];
        },
      ),
    );
  }
}

/**
 * @exports opentype.LookupList
 * @class
 * @param {opentype.Table}
 * @param {Object}
 * @constructor
 * @extends opentype.Table
 */
export class LookupList extends Table {
  constructor(lookupListTable, subtableMakers) {
    super(
      "lookupListTable",
      tableList("lookup", lookupListTable, function (lookupTable) {
        let subtableCallback = subtableMakers[lookupTable.lookupType];
        check.assert(
          !!subtableCallback,
          "Unable to write GSUB lookup type " + lookupTable.lookupType +
            " tables.",
        );
        return new Table(
          "lookupTable",
          [
            {
              name: "lookupType",
              type: "USHORT",
              value: lookupTable.lookupType,
            },
            {
              name: "lookupFlag",
              type: "USHORT",
              value: lookupTable.lookupFlag,
            },
          ].concat(
            tableList("subtable", lookupTable.subtables, subtableCallback),
          ),
        );
      }),
    );
  }
}

/**
 * @exports opentype.ClassDef
 * @class
 * @param {opentype.Table}
 * @param {Object}
 * @constructor
 * @extends opentype.Table
 *
 * @see https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
 */
export class ClassDef extends Table {
  constructor(classDefTable) {
    if (classDefTable.format === 1) {
      super(
        "classDefTable",
        [
          { name: "classFormat", type: "USHORT", value: 1 },
          {
            name: "startGlyphID",
            type: "USHORT",
            value: classDefTable.startGlyph,
          },
        ]
          .concat(ushortList("glyph", classDefTable.classes)),
      );
    } else if (classDefTable.format === 2) {
      super(
        "classDefTable",
        [{ name: "classFormat", type: "USHORT", value: 2 }]
          .concat(
            recordList(
              "rangeRecord",
              classDefTable.ranges,
              function (RangeRecord, i) {
                return [
                  {
                    name: "startGlyphID" + i,
                    type: "USHORT",
                    value: RangeRecord.start,
                  },
                  {
                    name: "endGlyphID" + i,
                    type: "USHORT",
                    value: RangeRecord.end,
                  },
                  {
                    name: "class" + i,
                    type: "USHORT",
                    value: RangeRecord.classId,
                  },
                ];
              },
            ),
          ),
      );
    } else {
      check.assert(false, "Class format must be 1 or 2.");
    }
  }
}

/** @private */
export function ushortList(itemName, list, count) {
  if (count === undefined) {
    count = list.length;
  }
  const fields = new Array(list.length + 1);
  fields[0] = { name: itemName + "Count", type: "USHORT", value: count };
  for (let i = 0; i < list.length; i++) {
    fields[i + 1] = { name: itemName + i, type: "USHORT", value: list[i] };
  }
  return fields;
}

/**  @private */
export function tableList(itemName, records, itemCallback) {
  const count = records.length;
  const fields = new Array(count + 1);
  fields[0] = { name: itemName + "Count", type: "USHORT", value: count };
  for (let i = 0; i < count; i++) {
    fields[i + 1] = {
      name: itemName + i,
      type: "TABLE",
      value: itemCallback(records[i], i),
    };
  }
  return fields;
}

/** @private */
export function recordList(itemName, records, itemCallback) {
  const count = records.length;
  let fields = [];
  fields[0] = { name: itemName + "Count", type: "USHORT", value: count };
  for (let i = 0; i < count; i++) {
    fields = fields.concat(itemCallback(records[i], i));
  }
  return fields;
}

export { Table as Record };

// Record = same as Table, but inlined (a Table has an offset and its data is further in the stream)
// Don't use offsets inside Records (probable bug), only in Tables.
export default {
  Table,
  Record: Table,
  Coverage,
  ClassDef,
  ScriptList,
  FeatureList,
  LookupList,
  ushortList,
  tableList,
  recordList,
};
