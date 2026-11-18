// src/utils/docOle2Parser.js
// Pure-JS OLE2 (.doc Word 97-2003) text extractor and minimal DOCX XML builder.

const OLE2_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

const readOle2Streams = (buf) => {
  if (!Buffer.isBuffer(buf) || buf.length < 512 || !buf.subarray(0, 8).equals(OLE2_MAGIC)) {
    throw new Error('Not a valid OLE2 .doc buffer');
  }

  const secShift = buf.readUInt16LE(0x1e);
  const secSize = 1 << secShift;
  const miniShift = buf.readUInt16LE(0x20);
  const miniSize = 1 << miniShift;
  const numFatSecs = buf.readUInt32LE(0x2c);
  const firstDirSec = buf.readInt32LE(0x30);
  const miniCutoff = buf.readUInt32LE(0x38);
  const firstMiniFatSec = buf.readInt32LE(0x3c);
  const firstDifatSec = buf.readInt32LE(0x44);
  const numDifatSecs = buf.readUInt32LE(0x48);

  const secOffset = (sid) => (sid + 1) * secSize;

  const difat = [];
  for (let i = 0; i < 109; i++) {
    difat.push(buf.readInt32LE(0x4c + i * 4));
  }
  let curDifat = firstDifatSec;
  for (let d = 0; d < numDifatSecs && curDifat >= 0; d++) {
    const off = secOffset(curDifat);
    const count = secSize / 4;
    for (let i = 0; i < count - 1; i++) {
      difat.push(buf.readInt32LE(off + i * 4));
    }
    curDifat = buf.readInt32LE(off + (count - 1) * 4);
  }

  const fat = [];
  for (let i = 0; i < numFatSecs; i++) {
    const sid = difat[i];
    if (sid == null || sid < 0) continue;
    const off = secOffset(sid);
    for (let j = 0; j < secSize; j += 4) {
      fat.push(buf.readInt32LE(off + j));
    }
  }

  const readChain = (startSec) => {
    const chunks = [];
    let s = startSec;
    const seen = new Set();
    while (s >= 0 && s < fat.length && !seen.has(s)) {
      seen.add(s);
      const off = secOffset(s);
      if (off + secSize <= buf.length) {
        chunks.push(buf.subarray(off, off + secSize));
      }
      s = fat[s];
    }
    return Buffer.concat(chunks);
  };

  const dirBytes = readChain(firstDirSec);
  const entries = [];
  for (let i = 0; i + 128 <= dirBytes.length; i += 128) {
    const e = dirBytes.subarray(i, i + 128);
    const nameLen = e.readUInt16LE(0x40);
    if (nameLen === 0) continue;
    const name = e.subarray(0, Math.max(0, nameLen - 2)).toString('utf16le');
    const etype = e[0x42];
    const startSec = e.readInt32LE(0x74);
    const size = e.readUInt32LE(0x78);
    entries.push({ name, etype, startSec, size });
  }

  const root = entries[0];
  const miniStream = root && root.startSec >= 0 ? readChain(root.startSec).subarray(0, root.size) : Buffer.alloc(0);
  const miniFatBytes = firstMiniFatSec >= 0 ? readChain(firstMiniFatSec) : Buffer.alloc(0);
  const miniFat = [];
  for (let i = 0; i + 4 <= miniFatBytes.length; i += 4) {
    miniFat.push(miniFatBytes.readInt32LE(i));
  }

  const readMiniChain = (startSec, size) => {
    const chunks = [];
    let s = startSec;
    const seen = new Set();
    while (s >= 0 && s < miniFat.length && !seen.has(s)) {
      seen.add(s);
      const off = s * miniSize;
      if (off + miniSize <= miniStream.length) {
        chunks.push(miniStream.subarray(off, off + miniSize));
      }
      s = miniFat[s];
    }
    return Buffer.concat(chunks).subarray(0, size);
  };

  const streams = {};
  for (const entry of entries) {
    if (entry.etype === 2) {
      streams[entry.name] =
        entry.size < miniCutoff && miniStream.length > 0
          ? readMiniChain(entry.startSec, entry.size)
          : readChain(entry.startSec).subarray(0, entry.size);
    }
  }
  return streams;
};

/**
 * Extracts raw Word text (preserving \r paragraph marks and \x07 table cell marks)
 * from a binary .doc buffer.
 */
export const extractDocText = (buf) => {
  const streams = readOle2Streams(buf);
  const wd = streams.WordDocument;
  if (!wd || wd.length < 0x1b0) return '';

  const fibFlags = wd.readUInt16LE(0x0a);
  const tableName = fibFlags & 0x0200 ? '1Table' : '0Table';
  const tbl = streams[tableName];
  if (!tbl) return '';

  const ccpText = wd.readUInt32LE(0x4c);
  const fcClx = wd.readUInt32LE(0x1a2);
  const lcbClx = wd.readUInt32LE(0x1a6);
  if (!lcbClx || fcClx + lcbClx > tbl.length) return '';

  const clx = tbl.subarray(fcClx, fcClx + lcbClx);
  let pos = 0;
  while (pos < clx.length) {
    const clxt = clx[pos];
    if (clxt === 1) {
      const cbGrpprl = clx.readUInt16LE(pos + 1);
      pos += 3 + cbGrpprl;
    } else if (clxt === 2) {
      const lcb = clx.readUInt32LE(pos + 1);
      const pcdData = clx.subarray(pos + 5, pos + 5 + lcb);
      const n = Math.floor((lcb - 4) / 12);
      const cps = [];
      for (let i = 0; i <= n; i++) {
        cps.push(pcdData.readUInt32LE(i * 4));
      }
      const chunks = [];
      for (let i = 0; i < n; i++) {
        const cpStart = cps[i];
        const cpEnd = Math.min(cps[i + 1], ccpText);
        if (cpStart >= ccpText) break;
        const pcdOff = (n + 1) * 4 + i * 8;
        const fcRaw = pcdData.readUInt32LE(pcdOff + 2);
        const isAnsi = Boolean(fcRaw & 0x40000000);
        const fc = fcRaw & 0x3fffffff;
        const chars = cpEnd - cpStart;
        if (isAnsi) {
          const byteOff = Math.floor(fc / 2);
          chunks.push(wd.subarray(byteOff, byteOff + chars).toString('latin1'));
        } else {
          chunks.push(wd.subarray(fc, fc + chars * 2).toString('utf16le'));
        }
      }
      return chunks.join('');
    } else {
      break;
    }
  }
  return '';
};

const cleanControlChars = (str) => {
  // Strip Word field instructions (\x13 ... \x14 display \x15 -> display; or \x13 ... \x15 -> '')
  let out = String(str || '')
    .replace(/\x13[^\x14\x15]*\x14([^\x15]*)\x15/g, '$1')
    .replace(/\x13[^\x15]*\x15/g, '');
  // Remove other Word binary control chars except \r, \n, \t, \x07
  out = out.replace(/[\x00-\x06\x08\x0b\x0c\x0e-\x1f]/g, '');
  return out;
};

/**
 * Splits extracted .doc text into paragraph and table blocks.
 * @returns {Array<{ type: 'paragraph', text: string } | { type: 'table', rows: string[][] }>}
 */
export const parseDocBlocks = (rawText) => {
  const cleaned = cleanControlChars(rawText);
  const blocks = [];
  const rawParagraphs = cleaned.split('\r');
  let currentTableRows = [];

  const flushTable = () => {
    if (currentTableRows.length > 0) {
      blocks.push({ type: 'table', rows: currentTableRows });
      currentTableRows = [];
    }
  };

  // Word tables use \x07 as cell terminator and \x07\x07 (row mark) at the end of a row
  let pendingRow = [];
  for (const segment of rawParagraphs) {
    if (segment.includes('\x07')) {
      const parts = segment.split('\x07');
      // If segment ends with \x07\x07, the last two elements are empty strings -> end of row
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1 && part === '') continue;
        if (i === parts.length - 2 && parts[parts.length - 1] === '' && part === '') {
          if (pendingRow.length > 0) {
            currentTableRows.push(pendingRow);
            pendingRow = [];
          }
          continue;
        }
        pendingRow.push(part.trim());
      }
      if (segment.endsWith('\x07\x07') && pendingRow.length > 0) {
        currentTableRows.push(pendingRow);
        pendingRow = [];
      }
    } else {
      if (pendingRow.length > 0) {
        // Multi-paragraph cell content before next \x07
        pendingRow[pendingRow.length - 1] = `${pendingRow[pendingRow.length - 1]}\n${segment.trim()}`.trim();
      } else {
        flushTable();
        blocks.push({ type: 'paragraph', text: segment });
      }
    }
  }
  if (pendingRow.length > 0) currentTableRows.push(pendingRow);
  flushTable();

  return blocks;
};

export const buildMinimalDocxEntries = (documentXml) => [
  {
    name: '[Content_Types].xml',
    data: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
      'utf8'
    )
  },
  {
    name: '_rels/.rels',
    data: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
      'utf8'
    )
  },
  {
    name: 'word/_rels/document.xml.rels',
    data: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
      'utf8'
    )
  },
  {
    name: 'word/document.xml',
    data: Buffer.from(documentXml, 'utf8')
  }
];
