// The `GPOS` table contains kerning pairs, among other things.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm

import * as check from "../check.js";
import { decode } from "../types.js";
import { Parser } from "../parse.js";
import { Table } from "../table.js";

// Parse the metadata `meta` table.
// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6meta.html
export function parse(data, start) {
  const p = new Parser(data, start);
  const tableVersion = p.parseULong();
  check.argument(tableVersion === 1, "Unsupported META table version.");
  p.parseULong(); // flags - currently unused and set to 0
  p.parseULong(); // tableOffset
  const numDataMaps = p.parseULong();

  const tags = {};
  for (let i = 0; i < numDataMaps; i++) {
    const tag = p.parseTag();
    const dataOffset = p.parseULong();
    const dataLength = p.parseULong();
    if (tag === "appl" || tag === "bild") {
      continue;
    }
    const text = decode.UTF8(data, start + dataOffset, dataLength);

    tags[tag] = text;
  }
  return tags;
}

export function make(tags) {
  const numTags = Object.keys(tags).length;
  let stringPool = "";
  const stringPoolOffset = 16 + numTags * 12;

  const result = new Table("meta", [
    { name: "version", type: "ULONG", value: 1 },
    { name: "flags", type: "ULONG", value: 0 },
    { name: "offset", type: "ULONG", value: stringPoolOffset },
    { name: "numTags", type: "ULONG", value: numTags },
  ]);

  for (let tag in tags) {
    const pos = stringPool.length;
    stringPool += tags[tag];

    result.fields.push({ name: "tag " + tag, type: "TAG", value: tag });
    result.fields.push({
      name: "offset " + tag,
      type: "ULONG",
      value: stringPoolOffset + pos,
    });
    result.fields.push({
      name: "length " + tag,
      type: "ULONG",
      value: tags[tag].length,
    });
  }

  result.fields.push({
    name: "stringPool",
    type: "CHARARRAY",
    value: stringPool,
  });

  return result;
}

export default { parse, make };
