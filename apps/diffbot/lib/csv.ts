/**
 * Remove columns by header name from CSV text. The vendor documents a `token`
 * field on every Crawl record, and CSV export keeps all top-level fields, so the
 * column must be dropped before the text leaves the app. Handles quoted fields
 * with embedded commas, quotes and newlines (RFC 4180).
 */
export function dropCsvColumns(csv: string, names: string[]): string {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) return csv;
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  const drop = new Set<number>();
  rows[0].forEach((h, i) => {
    if (wanted.has(h.trim().toLowerCase())) drop.add(i);
  });
  if (drop.size === 0) return csv;
  const esc = (v: string) => /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return rows.map((r) => r.filter((_, i) => !drop.has(i)).map(esc).join(",")).join("\n") + "\n";
}
