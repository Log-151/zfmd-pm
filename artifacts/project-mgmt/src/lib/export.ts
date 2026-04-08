export function exportToCsv<T>(filename: string, data: T[], columns: { header: string; accessor: (item: T) => any }[]) {
  if (!data || !data.length) return;

  const headerRow = columns.map(col => `"${col.header.replace(/"/g, '""')}"`).join(',');
  const dataRows = data.map(item => {
    return columns.map(col => {
      const val = col.accessor(item);
      const strVal = val === null || val === undefined ? '' : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
