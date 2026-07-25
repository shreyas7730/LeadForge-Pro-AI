/** CSV helpers — Phase 2 (used by future ExportService) */

export function escapeCsvCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(
  rows: Record<string, unknown>[],
  columns: string[]
): string {
  const header = columns.map(escapeCsvCell).join(',');
  const body = rows.map((row) =>
    columns.map((col) => escapeCsvCell(row[col])).join(',')
  );
  return [header, ...body].join('\r\n');
}
