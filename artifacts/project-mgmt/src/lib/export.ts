export function exportToCsv<T>(
  filenameOrData: string | Record<string, unknown>[],
  dataOrFilename: T[] | string,
  columns?: { header: string; accessor: (item: T) => unknown }[]
) {
  let filename: string;
  let csvContent: string;

  if (typeof filenameOrData === "string" && columns) {
    filename = filenameOrData;
    const data = dataOrFilename as T[];
    if (!data || !data.length) return;
    const headerRow = columns.map(col => `"${col.header.replace(/"/g, '""')}"`).join(",");
    const dataRows = data.map(item =>
      columns.map(col => {
        const val = col.accessor(item);
        const strVal = val === null || val === undefined ? "" : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(",")
    );
    csvContent = [headerRow, ...dataRows].join("\n");
  } else {
    const rows = filenameOrData as Record<string, unknown>[];
    filename = dataOrFilename as string;
    if (!rows || !rows.length) return;
    const headers = Object.keys(rows[0]);
    const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",");
    const dataRows = rows.map(row =>
      headers.map(h => {
        const val = row[h];
        const strVal = val === null || val === undefined ? "" : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(",")
    );
    csvContent = [headerRow, ...dataRows].join("\n");
  }

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
