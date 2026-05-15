'use client'

import React, { useState } from 'react'
import Papa from 'papaparse'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/store/useStore'
import { Upload, X } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'

interface CsvImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CsvImportWizard({ open, onOpenChange }: CsvImportWizardProps) {
  const onClose = () => onOpenChange(false)
  const { addDatabase } = useStore()
  const [dbName, setDbName] = useState('New Database')
  const [file, setFile] = useState<File | null>(null)
  const [useHeaders, setUseHeaders] = useState(true)
  
  const [previewData, setPreviewData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [fieldTypes, setFieldTypes] = useState<Record<string, string>>({})
  
  const [isImporting, setIsImporting] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setDbName(f.name.replace('.csv', ''))

    Papa.parse(f, {
      header: true, // we temporarily parse as header to see columns
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const cols = Object.keys(results.data[0] as any)
          setColumns(cols)
          setPreviewData(results.data)
          
          const initialTypes: Record<string, string> = {}
          cols.forEach(c => initialTypes[c] = 'text')
          setFieldTypes(initialTypes)
        }
      }
    })
  }

  const handleImport = () => {
    if (!file) return
    setIsImporting(true)

    Papa.parse(file, {
      header: useHeaders,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newDbId = crypto.randomUUID()
          
          // Format data based on types
          const formattedRows = results.data.map((row: any) => {
            const formatted: any = {}
            columns.forEach(col => {
              const val = row[col]
              if (fieldTypes[col] === 'number') {
                formatted[col] = Number(val) || null
              } else if (fieldTypes[col] === 'boolean') {
                formatted[col] = String(val).toLowerCase() === 'true' || val === '1' || val === 'yes' || val === true
              } else {
                formatted[col] = val
              }
            })
            return {
              table_id: newDbId,
              data_jsonb: formatted
            }
          })

          // Create table in backend
          const createRes = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_table',
              table_id: newDbId,
              name: dbName
            })
          })
          if (!createRes.ok) throw new Error('Failed to create table in backend')

          // Bulk insert
          const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'insert',
              rows: formattedRows
            })
          })

          if (!res.ok) throw new Error('Failed to insert rows')

          // Add to store
          addDatabase(dbName, false, newDbId, results.meta.fields)
          
          // Note: addDatabase will make this active. The effect in Grid.tsx will fetch the newly inserted rows!
          onClose()
        } catch (error) {
          console.error(error)
          alert('Import failed. Check console.')
        } finally {
          setIsImporting(false)
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV Database</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Database Name</label>
            <Input value={dbName} onChange={e => setDbName(e.target.value)} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Use Top Row as Headers</label>
              <p className="text-xs text-muted-foreground">The first row will define the column names.</p>
            </div>
            <Switch checked={useHeaders} onCheckedChange={setUseHeaders} />
          </div>

          {!file ? (
            <div className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center gap-4 hover:bg-muted/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-sm font-medium">Upload a CSV file</div>
              <Input type="file" accept=".csv" className="w-64" onChange={handleFileUpload} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Column Mapping</h4>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}><X className="w-4 h-4 mr-2"/> Remove File</Button>
              </div>
              
              <div className="rounded-md border border-border overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs sticky top-0">
                      <tr>
                        <th className="p-2 font-medium">Column Name</th>
                        <th className="p-2 font-medium">Field Type</th>
                        <th className="p-2 font-medium">Preview (Row 1)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {columns.map(col => (
                        <tr key={col} className="bg-background">
                          <td className="p-2 font-medium text-xs">{col}</td>
                          <td className="p-2">
                            <Combobox 
                              options={['text', 'number', 'boolean', 'date', 'select', 'multi-select', 'phone', 'email', 'link']}
                              value={fieldTypes[col]}
                              onChange={(v) => setFieldTypes(s => ({...s, [col]: v}))}
                              className="w-full h-8 text-xs"
                            />
                          </td>
                          <td className="p-2 text-xs text-muted-foreground truncate max-w-[200px]">
                            {previewData[0]?.[col] || ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || isImporting}>
            {isImporting ? 'Importing...' : 'Create Database'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
