'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ExpandedRowPanel } from '@/components/grid/ExpandedRowPanel'

export function CardsView() {
  const { 
    databases,
    activeDatabaseId,
    activeViewId,
    filters,
    sorts,
    dataVersion,
    setAvailableFields,
    searchQuery,
    hiddenColumns,
    columnOrder,
    incrementDataVersion
  } = useStore()

  const [rowsData, setRowsData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      if (rowsData.length === 0) setIsLoading(true)
      try {
        const activeDatabase = databases.find(db => db.id === activeDatabaseId)
        const isLegacy = activeDatabase?.is_legacy !== false

        if (isLegacy) {
          let query = supabase.from('PhorzenSalesDatabase').select('*')
          
          if (activeViewId === 'Follow up') {
            query = (query as any).not('Follow-Up', 'is', null).neq('Follow-Up', '')
          }

          for (const f of filters) {
            if (!f.field) continue
            if (['contains', 'is'].includes(f.operator) && !f.value) continue
            switch (f.operator) {
              case 'contains': query = query.ilike(f.field, `%${f.value}%`); break
              case 'is': query = query.eq(f.field, f.value); break
              case 'is not empty': query = (query as any).not(f.field, 'is', null).neq(f.field, ''); break
              case 'is empty': query = (query as any).or(`"${f.field}".is.null,"${f.field}".eq.""`); break
            }
          }

          for (const s of sorts) {
            if (!s.field) continue
            query = query.order(s.field, { ascending: s.direction === 'asc' })
          }

          const { data, error } = await query
          if (error) {
            console.error('Error fetching data:', error)
            setRowsData([])
          } else {
            setRowsData(data || [])
            if (data && data.length > 0) {
               setAvailableFields(Object.keys(data[0]).filter(k => !k.toLowerCase().includes('id')))
            }
          }
        } else {
          // Dynamic Database
          const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'query', table_id: activeDatabaseId })
          })
          if (!res.ok) throw new Error('Fetch failed')
          const { data, error } = await res.json()
          if (error) throw new Error(error)

          let rows = (data || []).map((r: any) => ({
            id: r.id,
            ...r.data_jsonb
          }))

          for (const f of filters) {
            if (!f.field) continue
            if (['contains', 'is'].includes(f.operator) && !f.value) continue
            rows = rows.filter((r: any) => {
              const val = String(r[f.field] || '').toLowerCase()
              const search = String(f.value || '').toLowerCase()
              switch (f.operator) {
                case 'contains': return val.includes(search)
                case 'is': return val === search
                case 'is not empty': return val !== ''
                case 'is empty': return val === ''
                default: return true
              }
            })
          }

          for (const s of sorts) {
            if (!s.field) continue
            rows.sort((a: any, b: any) => {
              const valA = String(a[s.field] || '').toLowerCase()
              const valB = String(b[s.field] || '').toLowerCase()
              if (valA < valB) return s.direction === 'asc' ? -1 : 1
              if (valA > valB) return s.direction === 'asc' ? 1 : -1
              return 0
            })
          }

          setRowsData(rows)
          if (rows.length > 0) {
             setAvailableFields(Object.keys(rows[0]).filter(k => !k.toLowerCase().includes('id')))
          } else {
             setAvailableFields([])
          }
        }
      } catch (err) {
        console.error('Fetch exception:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [activeViewId, filters, sorts, dataVersion, setAvailableFields])

  const filteredRowsData = useMemo(() => {
    if (!searchQuery) return rowsData
    const lowerQuery = searchQuery.toLowerCase()
    return rowsData.filter(row => {
      return Object.values(row).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(lowerQuery)
      )
    })
  }, [rowsData, searchQuery])

  const displayColumns = useMemo(() => {
    if (rowsData.length === 0) return []
    const baseKeys = columnOrder.length > 0 
      ? columnOrder 
      : Object.keys(rowsData[0]).filter(k => !k.toLowerCase().includes('id'))
    
    return baseKeys.filter(col => !hiddenColumns.includes(col))
  }, [rowsData, columnOrder, hiddenColumns])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
        Loading cards...
      </div>
    )
  }

  if (filteredRowsData.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground p-8">
        No records found.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-muted/20 p-4 lg:p-6 custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
        {filteredRowsData.map((row) => (
          <div 
            key={row.id || row['Lead ID'] || row.lead_id || Math.random()} 
            onClick={() => setExpandedRow(row)}
            className="bg-background border border-border shadow-sm rounded-xl overflow-hidden hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer flex flex-col group"
          >
            <div className="px-5 py-4 border-b border-border/50 bg-muted/10">
              <h3 className="font-semibold text-lg truncate text-foreground group-hover:text-primary transition-colors">
                {row['Lead Name'] || row.Name || row.name || 'Unnamed Record'}
              </h3>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {displayColumns.map(col => {
                const val = row[col]
                if (val === null || val === undefined || val === '') return null
                
                const isBoolean = typeof val === 'boolean' || val === 'true' || val === 'false'
                const boolTrue = val === true || val === 'true'
                
                return (
                  <div key={col} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {col}
                    </span>
                    <div className="text-sm text-foreground break-words line-clamp-3">
                      {isBoolean ? (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          boolTrue 
                            ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}>
                          {boolTrue ? "Yes" : "No"}
                        </span>
                      ) : (
                        String(val)
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!expandedRow} onOpenChange={() => setExpandedRow(null)}>
        <DialogContent className="w-full md:w-[77vw] max-w-full md:max-w-[77vw] h-full md:h-[92vh] max-h-full md:max-h-[92vh] overflow-hidden p-0 border border-border/50 bg-background shadow-2xl md:rounded-2xl flex flex-col" showCloseButton={false}>
          <DialogHeader className="px-4 md:px-8 py-4 md:py-6 border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-10 flex-row items-center gap-2 md:gap-4">
            <button 
              onClick={() => setExpandedRow(null)}
              className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors -ml-2"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.21841C3.80708 2.99386 3.44301 2.99386 3.21846 3.21841C2.99391 3.44297 2.99391 3.80704 3.21846 4.03159L6.68688 7.50001L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31319L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.50001L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              </svg>
            </button>
            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground m-0 flex-1">
              {expandedRow?.['Lead Name'] || expandedRow?.['Lead ID'] || expandedRow?.id ? (
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground font-normal text-lg">Record:</span> 
                  {expandedRow['Lead Name'] || expandedRow['Lead ID'] || expandedRow.id}
                </span>
              ) : (
                'Record Details'
              )}
            </DialogTitle>
          </DialogHeader>
          {expandedRow && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ExpandedRowPanel
                rowData={expandedRow}
                headers={Object.keys(rowsData[0] || {}).filter(k => !k.toLowerCase().includes('id'))}
                onUpdate={incrementDataVersion}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
