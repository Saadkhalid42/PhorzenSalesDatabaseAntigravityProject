export function exportToCSV(data: any[], visibleColumns: string[], filename: string = 'export.csv') {
  if (data.length === 0) return

  // Header row
  const header = visibleColumns.map(col => `"${col.replace(/"/g, '""')}"`).join(',')
  
  // Data rows
  const rows = data.map(row => {
    return visibleColumns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }).join(',')
  })

  const csv = [header, ...rows].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
