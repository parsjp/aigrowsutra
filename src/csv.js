/**
 * Minimal, dependency-free RFC-4180 CSV parser.
 * Handles quoted fields, escaped quotes (""), commas and newlines inside quotes.
 * Designed for the prompts.chat dataset (data/prompts.csv).
 */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const n = text.length;

  for (let i = 0; i < n; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parse CSV text into objects using the first row as the header. */
function csvToObjects(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  const objects = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 2) continue; // skip malformed rows
    const obj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = row[c] !== undefined ? row[c] : '';
    }
    objects.push(obj);
  }
  return objects;
}

module.exports = { parseCsv, csvToObjects };
