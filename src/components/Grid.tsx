'use client'

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase/client'
import { ColumnHeaderMenu } from '@/components/grid/ColumnHeaderMenu'
import { EditableCell } from '@/components/grid/EditableCell'
import { ExpandedRowPanel } from '@/components/grid/ExpandedRowPanel'
import { OptionsEditorDialog } from '@/components/grid/OptionsEditorDialog'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import { Maximize2, Plus, MoreHorizontal, Copy, Trash2, ClipboardType, Sigma } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { exportToCSV } from '@/lib/export'
import { formatPhoneTime } from '@/lib/timezones'

type DynamicRowData = Record<string, any>

const MemoizedGridCell = React.memo(({
  cell,
  virtualRowIndex,
  colIndex,
  selected,
  focused,
  handleCellMouseDown,
  handleCellMouseEnter,
  alternateColoring,
  pinnedOffset,
  dataVersion
}: {
  cell: any
  virtualRowIndex: number
  colIndex: number
  selected: boolean
  focused: boolean
  handleCellMouseDown: (r: number, c: number, e: React.MouseEvent) => void
  handleCellMouseEnter: (r: number, c: number) => void
  alternateColoring?: boolean
  pinnedOffset: number
  dataVersion: number
}) => {
  return (
    <div
      id={`cell-wrapper-${virtualRowIndex}-${colIndex}`}
      className={cn(
        "relative flex items-center px-0 border-r border-border/50 text-sm overflow-hidden whitespace-nowrap focus:outline-none select-none",
        cell.column.getIsPinned() === 'left'
          ? cn(
              "sticky z-20 shadow-[2px_0_0_0_var(--border)] transition-colors",
              alternateColoring && virtualRowIndex % 2 !== 0 ? "bg-muted" : "bg-background",
              "group-hover:bg-accent"
            )
          : "bg-transparent",
        selected ? "!bg-primary/10" : ""
      )}
      style={{ 
        width: cell.column.getSize(),
        left: cell.column.getIsPinned() === 'left' ? `${cell.column.getStart('left') + pinnedOffset}px` : undefined,
      }}
      onMouseDown={(e) => handleCellMouseDown(virtualRowIndex, colIndex, e)}
      onMouseEnter={() => handleCellMouseEnter(virtualRowIndex, colIndex)}
    >
      {selected && <div className="absolute inset-0 ring-1 ring-primary/40 pointer-events-none z-10" />}
      {focused && <div className="absolute inset-0 ring-2 ring-primary pointer-events-none z-20" />}
      <div className="w-full h-full px-1">
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </div>
    </div>
  )
})

export function Grid() {
  const { 
    databases,
    activeDatabaseId,
    activeWorkspaceId, 
    activeViewId,
    filters,
    sorts,
    frozenColumns,
    toggleFrozenColumn,
    dataVersion,
    incrementDataVersion,
    rowHeight,
    hiddenColumns,
    setAvailableFields,
    availableFields,
    searchQuery,
    columnOrder,
    setColumnOrder,
    pushHistory,
    popUndo,
    popRedo,
    alternateColoring,
    showTimeAndDate,
    setUniqueValuesByColumn,
    uniqueValuesByColumn: storeUniqueValues,
    columnSizing,
    setColumnSizing
  } = useStore()

  const [rowsData, setRowsData] = useState<any[]>([])
  const pinnedOffset = showTimeAndDate ? 156 : 56;

  const [isLoading, setIsLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [rowToDelete, setRowToDelete] = useState<any>(null)
  const [isAddingRow, setIsAddingRow] = useState(false)
  
  // Selection State
  const [selection, setSelection] = useState<{ startRow: number, startCol: number, endRow: number, endCol: number } | null>(null)
  const [multiCells, setMultiCells] = useState<Set<string>>(new Set())
  const isDraggingSelectionRef = useRef(false)

  useEffect(() => {
    const handleMouseUp = () => { isDraggingSelectionRef.current = false }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Undo/Redo keyboard event listener
  useEffect(() => {
    const saveCellToDatabase = async (rowId: string, columnId: string, newValue: any) => {
      try {
        const activeDatabase = databases.find(db => db.id === activeDatabaseId)
        const isLegacy = activeDatabase?.is_legacy !== false
        
        if (isLegacy) {
          await (supabase.from('PhorzenSalesDatabase') as any)
            .update({ [columnId]: newValue })
            .eq('id', rowId)
        } else {
          const rowObj = rowsData.find(r => String(r._db_uuid || r.id) === String(rowId))
          if (!rowObj) return
          const oldDataJsonb = { ...rowObj }
          delete oldDataJsonb.id
          delete oldDataJsonb._db_uuid
          const newDataJsonb = {
            ...oldDataJsonb,
            [columnId]: newValue
          }
          await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              updates: {
                id: rowId,
                data_jsonb: {
                  data_jsonb: newDataJsonb
                }
              }
            })
          })
        }
      } catch (err) {
        console.error('Failed to save cell revert to database:', err)
      }
    }

    const handleUndoRedoKeyDown = async (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      )
      if (isTyping) return

      const isCmdZ = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey
      const isCmdShiftZ = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey

      if (isCmdZ) {
        e.preventDefault()
        const action = popUndo()
        if (action) {
          const { toast } = await import('sonner')
          toast.success('Undid last change', { icon: '↩️' })
          
          for (const update of action.updates) {
            const { rowId, columnId, oldValue } = update
            setRowsData(prev => prev.map(r => String(r._db_uuid || r.id) === String(rowId) ? { ...r, [columnId]: oldValue } : r))
            await saveCellToDatabase(rowId, columnId, oldValue)
          }
          incrementDataVersion()
        }
      } else if (isCmdShiftZ) {
        e.preventDefault()
        const action = popRedo()
        if (action) {
          const { toast } = await import('sonner')
          toast.success('Redid change', { icon: '↪️' })
          
          for (const update of action.updates) {
            const { rowId, columnId, newValue } = update
            setRowsData(prev => prev.map(r => String(r._db_uuid || r.id) === String(rowId) ? { ...r, [columnId]: newValue } : r))
            await saveCellToDatabase(rowId, columnId, newValue)
          }
          incrementDataVersion()
        }
      }
    }

    window.addEventListener('keydown', handleUndoRedoKeyDown)
    return () => window.removeEventListener('keydown', handleUndoRedoKeyDown)
  }, [popUndo, popRedo, databases, activeDatabaseId, rowsData, incrementDataVersion])

  // Auto-focus selected cell
  useEffect(() => {
    if (selection && !isDraggingSelectionRef.current && parentRef.current) {
      const { endRow, endCol } = selection
      setTimeout(() => {
        const el = parentRef.current?.querySelector(`#cell-wrapper-${endRow}-${endCol} [tabindex="-1"]`) as HTMLElement
        if (el) el.focus()
      }, 0)
    }
  }, [selection])

  const handleCellChange = useCallback((rId: string, colId: string, val: any) => {
    setRowsData(prev => prev.map(r => String(r._db_uuid || r.id) === String(rId) ? { ...r, [colId]: val } : r))
  }, [])

  const handleAddRow = async () => {
    setIsAddingRow(true)
    try {
      const activeDatabase = databases.find(db => db.id === activeDatabaseId)
      const isLegacy = activeDatabase?.is_legacy !== false
      
      if (isLegacy) {
        const { error } = await (supabase.from('PhorzenSalesDatabase') as any).insert([{
          'Lead Name': 'New Lead'
        }])
        if (error) console.error('Failed to add row:', error)
      } else {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'insert',
            rows: [{ table_id: activeDatabaseId, data_jsonb: { 'Lead Name': 'New Lead' } }]
          })
        })
        if (!res.ok) console.error('Failed to add row')
      }
      incrementDataVersion()
    } catch (e) {
      console.error(e)
    } finally {
      setIsAddingRow(false)
    }
  }

  useEffect(() => {
    async function fetchData() {
      // Only show loading screen if we don't have data yet. 
      // This allows background refreshing without blanking the UI.
      if (rowsData.length === 0) {
        setIsLoading(true)
      }
      try {
        const activeDatabase = databases.find(db => db.id === activeDatabaseId)
        const isLegacy = activeDatabase?.is_legacy !== false

        if (isLegacy) {
          let query = supabase.from('PhorzenSalesDatabase').select('*')
          
          if (activeViewId === 'Follow up') {
            query = (query as any).not('Follow-Up', 'is', null).neq('Follow-Up', '')
          }

          // Apply dynamic filters
          for (const f of filters) {
            if (!f.field) continue
            if (['contains', 'is'].includes(f.operator) && !f.value) continue
            
            switch (f.operator) {
              case 'contains':
                query = query.ilike(f.field, `%${f.value}%`)
                break
              case 'is':
                query = query.eq(f.field, f.value)
                break
              case 'is not':
                query = query.neq(f.field, f.value)
                break
              case 'is not empty':
                query = (query as any).not(f.field, 'is', null).neq(f.field, '')
                break
              case 'is empty':
                query = (query as any).or(`"${f.field}".is.null,"${f.field}".eq.""`)
                break
            }
          }

          // Apply dynamic sorts
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
              const keys = Object.keys(data[0]).filter(k => !k.toLowerCase().includes('id'))
              if (availableFields.length === 0) {
                setAvailableFields(keys)
              } else {
                const missing = keys.filter(k => !availableFields.includes(k))
                if (missing.length > 0) {
                  setAvailableFields([...availableFields, ...missing])
                }
              }
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
            ...r.data_jsonb,
            _db_uuid: r.id,
            id: r.data_jsonb?.id || r.id
          }))

          // Apply filters locally
          for (const f of filters) {
            if (!f.field) continue
            if (['contains', 'is'].includes(f.operator) && !f.value) continue
            
            rows = rows.filter((r: any) => {
              const val = String(r[f.field] || '').toLowerCase()
              const search = String(f.value || '').toLowerCase()
              switch (f.operator) {
                case 'contains': return val.includes(search)
                case 'is': return val === search
                case 'is not': return val !== search
                case 'is not empty': return val !== ''
                case 'is empty': return val === ''
                default: return true
              }
            })
          }

          // Apply sorts locally
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
            const keys = Object.keys(rows[0]).filter(k => !k.toLowerCase().includes('id'))
            if (availableFields.length === 0) {
              setAvailableFields(keys)
            } else {
              const missing = keys.filter(k => !availableFields.includes(k))
              if (missing.length > 0) {
                setAvailableFields([...availableFields, ...missing])
              }
            }
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

  // Extract unique values for potential select fields
  const uniqueValuesByColumn = useMemo(() => {
    const map: Record<string, string[]> = {}
    if (rowsData.length === 0) return map
    
    const allKeys = Object.keys(rowsData[0])
    allKeys.forEach(col => {
      const set = new Set<string>()
      rowsData.forEach(row => {
        if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
          set.add(String(row[col]))
        }
      })
      if (set.size > 0 && set.size < 100) { 
        map[col] = Array.from(set).sort()
      }
    })
    return map
  }, [rowsData])

  // Sync to store for FilterBuilder
  useEffect(() => {
    setUniqueValuesByColumn(uniqueValuesByColumn)
  }, [uniqueValuesByColumn, setUniqueValuesByColumn])

  // Dynamically generate columns based on availableFields (or keys of the first row)
  const columns: ColumnDef<DynamicRowData>[] = useMemo(() => {
    let keys = availableFields.filter(key => {
      const lower = key.toLowerCase()
      return lower !== 'id' && lower !== 'lead id' && lower !== 'lead_id'
    })

    if (keys.length === 0 && rowsData.length > 0) {
      keys = Object.keys(rowsData[0]).filter(key => {
        const lower = key.toLowerCase()
        return lower !== 'id' && lower !== 'lead id' && lower !== 'lead_id'
      })
    }

    return keys.map(key => ({
      id: key,
      accessorFn: (row: any) => row[key],
      header: ({ column, header }) => (
        <div className="flex items-center justify-between w-full h-full group/header relative">
          <span className="truncate">{key}</span>
          <ColumnHeaderMenu 
            columnName={key} 
            isFrozen={column.getIsPinned() === 'left'}
            onFreeze={() => toggleFrozenColumn(key)} 
          />
        </div>
      ),
      size: key.toLowerCase().includes('id') ? 100 : key.toLowerCase().includes('email') ? 250 : 150,
      cell: info => {
        // Fallback row id logic
        const rowId = info.row.original._db_uuid || info.row.original.id || info.row.original['Lead ID'] || info.row.original.lead_id
        return <EditableCell initialValue={info.getValue()} rowId={rowId} columnId={key} uniqueValues={uniqueValuesByColumn[key] || []} rowObj={info.row.original} onCellChange={handleCellChange} />
      }
    }))
  }, [availableFields, rowsData, uniqueValuesByColumn, handleCellChange])
  
  // Initialize column order if empty
  useEffect(() => {
    if (columnOrder.length === 0 && columns.length > 0) {
      setColumnOrder(columns.map(c => c.id as string))
    }
  }, [columns.length, columnOrder.length, setColumnOrder, columns])

  // Local instant search filter
  const filteredRowsData = useMemo(() => {
    if (!searchQuery) return rowsData
    const lowerQuery = searchQuery.toLowerCase()
    return rowsData.filter(row => {
      // Search across all string values in the row
      return Object.values(row).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(lowerQuery)
      )
    })
  }, [rowsData, searchQuery])

  // Convert hiddenColumns to visibility object
  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {}
    hiddenColumns.forEach(col => {
      visibility[col] = false
    })
    return visibility
  }, [hiddenColumns])

  const table = useReactTable({
    data: filteredRowsData,
    columns,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      columnPinning: { left: frozenColumns },
      columnVisibility,
      columnOrder: columnOrder.length > 0 ? columnOrder : undefined,
      columnSizing,
    },
    onColumnSizingChange: (updater) => {
      const newSizing = typeof updater === 'function' ? updater(columnSizing) : updater
      setColumnSizing(newSizing)
      incrementDataVersion()
    },
    onColumnOrderChange: (updater) => {
      setColumnOrder(typeof updater === 'function' ? updater(columnOrder) : updater)
    },
    getCoreRowModel: getCoreRowModel(),
  })

  const { rows } = table.getRowModel()
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  })

  // Force virtualizer to recalculate when row height changes to ensure realtime updates
  useEffect(() => {
    // @ts-ignore - measure exists in some versions to force recalculation
    if (typeof rowVirtualizer.measure === 'function') {
      // @ts-ignore
      rowVirtualizer.measure()
    }
  }, [rowHeight, rowVirtualizer])

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  // Handle CSV Export
  useEffect(() => {
    const handleExport = () => {
      const visibleCols = table.getVisibleFlatColumns().map(c => c.id).filter(id => id !== 'select_column_or_something')
      // Map the current sorted/filtered rowsData
      const exportData = rows.map(r => r.original)
      exportToCSV(exportData, visibleCols, `export-${activeViewId}.csv`)
    }
    window.addEventListener('export-csv', handleExport)
    return () => window.removeEventListener('export-csv', handleExport)
  }, [rows, table, activeViewId])



  // Handle Drag and Drop for Columns
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 5px drag to start, allows clicking and resizing
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setColumnOrder(
        arrayMove(
          columnOrder.length > 0 ? columnOrder : columns.map(c => (c as any).accessorKey as string),
          columnOrder.indexOf(active.id as string),
          columnOrder.indexOf(over.id as string)
        )
      )
    }
  }

  // Draggable Header Component
  const DraggableHeader = ({ header }: { header: any }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: header.column.id })

    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 100 : header.column.getIsPinned() === 'left' ? 40 : 1,
      width: header.getSize(),
      left: header.column.getIsPinned() === 'left' ? `${header.column.getStart('left') + pinnedOffset}px` : undefined,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center px-3 border-r border-border relative",
          header.column.getIsPinned() === 'left'
            ? "sticky bg-muted shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.4)] z-50"
            : "bg-muted/80"
        )}
      >
        <div {...attributes} {...listeners} className="flex-1 truncate cursor-grab active:cursor-grabbing mr-2 h-full flex items-center pt-[1px]">
          {flexRender(header.column.columnDef.header, header.getContext())}
        </div>
        
        {/* Resize Handle at the far right of the cell box */}
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cn(
            "absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none z-50 flex items-center justify-center group/resize",
            header.column.getIsResizing() ? "opacity-100" : "opacity-0 hover:opacity-100"
          )}
        >
          <div className={cn(
            "w-[1.5px] h-full transition-colors",
            header.column.getIsResizing() ? "bg-primary" : "bg-primary/40 group-hover/resize:bg-primary"
          )} />
        </div>
      </div>
    )
  }

  // Selection Handlers — MUST be before any early return to satisfy Rules of Hooks
  const handleCellMouseDown = useCallback((rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    if (e.button !== 0) return // only left click
    if ((e.target as HTMLElement).tagName === 'A' || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return
    
    if (e.metaKey || e.ctrlKey) {
      isDraggingSelectionRef.current = false
      setMultiCells(prev => {
        const next = new Set(prev)
        const key = `${rowIndex}-${colIndex}`
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
      if (!selection && !e.shiftKey) {
        setSelection({ startRow: rowIndex, startCol: colIndex, endRow: rowIndex, endCol: colIndex })
      }
      return
    }

    setMultiCells(new Set())
    isDraggingSelectionRef.current = true
    setSelection(prev => {
      if (e.shiftKey && prev) {
        return { ...prev, endRow: rowIndex, endCol: colIndex }
      }
      return { startRow: rowIndex, startCol: colIndex, endRow: rowIndex, endCol: colIndex }
    })
  }, [selection])

  const handleCellMouseEnter = useCallback((rowIndex: number, colIndex: number) => {
    setSelection(prev => {
      if (!isDraggingSelectionRef.current || !prev) return prev
      if (prev.endRow === rowIndex && prev.endCol === colIndex) return prev
      return { ...prev, endRow: rowIndex, endCol: colIndex }
    })
  }, [])

  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (multiCells.has(`${rowIndex}-${colIndex}`)) return true
    if (!selection) return false
    const minRow = Math.min(selection.startRow, selection.endRow)
    const maxRow = Math.max(selection.startRow, selection.endRow)
    const minCol = Math.min(selection.startCol, selection.endCol)
    const maxCol = Math.max(selection.startCol, selection.endCol)
    return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol
  }

  const selectedCellsStats = useMemo(() => {
    const numericValues: number[] = []
    let totalCellsCount = 0
    let numericCellsCount = 0
    
    const currentRows = table.getRowModel().rows
    
    currentRows.forEach((row, rowIndex) => {
      row.getVisibleCells().forEach((cell, colIndex) => {
        if (isCellSelected(rowIndex, colIndex)) {
          totalCellsCount++
          const rawValue = cell.getValue()
          if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
            const cleaned = String(rawValue).replace(/[$,]/g, '').trim()
            if (cleaned !== '') {
              const num = Number(cleaned)
              if (!isNaN(num)) {
                numericValues.push(num)
                numericCellsCount++
              }
            }
          }
        }
      })
    })
    
    if (totalCellsCount <= 1) return null

    if (numericCellsCount === 0) {
      return {
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        count: totalCellsCount,
        numericCount: 0
      }
    }
    
    const sum = numericValues.reduce((a, b) => a + b, 0)
    const avg = sum / numericCellsCount
    const min = Math.min(...numericValues)
    const max = Math.max(...numericValues)
    
    return {
      sum,
      avg,
      min,
      max,
      count: totalCellsCount,
      numericCount: numericCellsCount
    }
  }, [selection, multiCells, table, isCellSelected, rowsData])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
        Loading workspace...
      </div>
    )
  }

  const isCellFocused = (rowIndex: number, colIndex: number) => {
    if (!selection) return false
    return rowIndex === selection.endRow && colIndex === selection.endCol
  }

  const executeHistoryAction = async (action: any, isUndo: boolean) => {
    const promises = []
    for (const u of action.updates) {
      promises.push(
        (supabase.from('PhorzenSalesDatabase') as any)
          .update({ [u.columnId]: isUndo ? u.oldValue : u.newValue })
          .eq(u.rowIdKey, u.rowId)
      )
    }
    if (promises.length > 0) {
      await Promise.all(promises)
      incrementDataVersion()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return

    // Handle Undo/Redo
    if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (e.shiftKey) {
        const action = popRedo()
        if (action) executeHistoryAction(action, false)
      } else {
        const action = popUndo()
        if (action) executeHistoryAction(action, true)
      }
      return
    }

    // Cmd+F → focus search
    if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search records..."]')
      if (searchInput) {
        searchInput.focus()
        searchInput.select()
      }
      return
    }

    if (!selection) return

    const visibleCols = table.getVisibleFlatColumns()

    // Handle Backspace / Delete clearing
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      const minRow = Math.min(selection.startRow, selection.endRow)
      const maxRow = Math.max(selection.startRow, selection.endRow)
      const minCol = Math.min(selection.startCol, selection.endCol)
      const maxCol = Math.max(selection.startCol, selection.endCol)
      
      const activeDatabase = databases.find(db => db.id === activeDatabaseId)
      const isLegacy = activeDatabase?.is_legacy !== false
      const updatesList: any[] = []
      
      for (let r = minRow; r <= maxRow; r++) {
        const row = rows[r]
        if (!row) continue
        const rowId = row.original._db_uuid || row.original.id || row.original['Lead ID'] || row.original.lead_id
        
        for (let c = minCol; c <= maxCol; c++) {
          if (isCellSelected(r, c)) {
            const colId = visibleCols[c].id
            const oldValue = row.original[colId]
            if (oldValue !== null && oldValue !== undefined && oldValue !== '') {
              updatesList.push({
                rowId,
                columnId: colId,
                oldValue,
                newValue: null,
                rowObj: row.original
              })
            }
          }
        }
      }
      
      if (updatesList.length > 0) {
        // Update local state rowsData immediately
        setRowsData(prev => prev.map(row => {
          const match = updatesList.filter(u => String(u.rowId) === String(row._db_uuid || row.id))
          if (match.length > 0) {
            const updatedRow = { ...row }
            match.forEach(m => {
              updatedRow[m.columnId] = null
            })
            return updatedRow
          }
          return row
        }))
        
        // Register in history for Undo/Redo support!
        pushHistory({
          updates: updatesList.map(u => ({
            rowId: String(u.rowId),
            rowIdKey: 'id',
            columnId: u.columnId,
            oldValue: u.oldValue,
            newValue: null
          }))
        })
        
        // Asynchronously save to database
        const saveAll = async () => {
          try {
            for (const u of updatesList) {
              if (isLegacy) {
                await (supabase.from('PhorzenSalesDatabase') as any)
                  .update({ [u.columnId]: null })
                  .eq('id', u.rowId)
              } else {
                const oldDataJsonb = { ...u.rowObj }
                delete oldDataJsonb.id
                const newDataJsonb = {
                  ...oldDataJsonb,
                  [u.columnId]: null
                }
                await fetch('/api/data', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'update',
                    updates: {
                      id: u.rowId,
                      data_jsonb: {
                        data_jsonb: newDataJsonb
                      }
                    }
                  })
                })
              }
            }
            incrementDataVersion()
          } catch (err) {
            console.error('Failed to clear cells from DB:', err)
          }
        }
        saveAll()
      }
      return
    }

    // Handle Copy
    if (e.key === 'c' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const minRow = Math.min(selection.startRow, selection.endRow)
      const maxRow = Math.max(selection.startRow, selection.endRow)
      const minCol = Math.min(selection.startCol, selection.endCol)
      const maxCol = Math.max(selection.startCol, selection.endCol)

      let tsv = ''
      for (let r = minRow; r <= maxRow; r++) {
        const row = rows[r]
        if (!row) continue
        const rowData = []
        for (let c = minCol; c <= maxCol; c++) {
          const colId = visibleCols[c].id
          rowData.push(row.original[colId] || '')
        }
        tsv += rowData.join('\t') + '\n'
      }
      navigator.clipboard.writeText(tsv).catch(console.error)
      return
    }

    if (!e.shiftKey) setMultiCells(new Set())
    let { startRow, startCol, endRow, endCol } = selection
    let newRow = endRow
    let newCol = endCol

    if (e.key === 'ArrowUp') newRow = Math.max(0, newRow - 1)
    else if (e.key === 'ArrowDown') newRow = Math.min(rows.length - 1, newRow + 1)
    else if (e.key === 'ArrowLeft') newCol = Math.max(0, newCol - 1)
    else if (e.key === 'ArrowRight') newCol = Math.min(visibleCols.length - 1, newCol + 1)
    else return

    e.preventDefault()
    if (e.shiftKey) {
      setSelection({ ...selection, endRow: newRow, endCol: newCol })
    } else {
      setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol })
    }
    rowVirtualizer.scrollToIndex(newRow)
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!selection) return
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return

    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (!text) return

    const parsedRows = text.split('\n').filter(r => r.length > 0).map(r => r.split('\t'))
    if (parsedRows.length === 0) return

    const minRow = Math.min(selection.startRow, selection.endRow)
    const minCol = Math.min(selection.startCol, selection.endCol)
    const visibleCols = table.getVisibleFlatColumns()
    const updates = []
    const historyUpdates: any[] = []

    for (let r = 0; r < parsedRows.length; r++) {
      const targetRowIndex = minRow + r
      if (targetRowIndex >= rows.length) break
      
      const row = rows[targetRowIndex]
      const rowId = row.original._db_uuid || row.original.id || row.original['Lead ID'] || row.original.lead_id
      if (!rowId) continue
      
      const updatePayload: any = {}
      let hasUpdates = false
      const rowIdKey = row.original._db_uuid ? 'id' : (row.original.id ? 'id' : (row.original['Lead ID'] ? 'Lead ID' : 'lead_id'))
      
      for (let c = 0; c < parsedRows[r].length; c++) {
        const targetColIndex = minCol + c
        if (targetColIndex >= visibleCols.length) break
        const colId = visibleCols[targetColIndex].id
        if (colId.toLowerCase().includes('id')) continue // skip IDs
        
        const newValue = parsedRows[r][c]
        const oldValue = row.original[colId]

        if (String(newValue) !== String(oldValue)) {
          updatePayload[colId] = newValue
          hasUpdates = true
          historyUpdates.push({
            rowId,
            rowIdKey,
            columnId: colId,
            oldValue,
            newValue
          })
        }
      }
      
      if (hasUpdates) {
        updates.push(
          (supabase.from('PhorzenSalesDatabase') as any)
            .update(updatePayload)
            .eq(rowIdKey, rowId)
        )
      }
    }

    if (updates.length > 0) {
      pushHistory({ updates: historyUpdates })
      await Promise.all(updates)
      incrementDataVersion()
    }
  }

  const handleCopySingleRow = (row: any, withHeaders: boolean) => {
    const visibleCols = table.getVisibleFlatColumns();
    let tsv = '';
    
    if (withHeaders) {
      tsv += visibleCols.map(c => c.id).join('\t') + '\n';
    }
    
    const rowData = visibleCols.map(c => row[c.id] || '');
    tsv += rowData.join('\t') + '\n';
    
    navigator.clipboard.writeText(tsv).catch(console.error);
  };

  const handleDeleteSingleRow = async (row: any) => {
    const rowIdKey = row.id ? 'id' : (row['Lead ID'] ? 'Lead ID' : 'lead_id');
    const rowId = row[rowIdKey];
    if (!rowId) return;

    try {
      const { error } = await (supabase.from('PhorzenSalesDatabase') as any)
        .delete()
        .eq(rowIdKey, rowId);
      
      if (error) {
        console.error('Failed to delete row:', error);
      } else {
        incrementDataVersion();
      }
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-auto relative bg-background outline-none custom-scrollbar touch-pan-y touch-pan-x"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    >
      <div
        className="grid relative border-collapse"
        style={{ height: `${totalSize}px`, minHeight: '100%' }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {/* Header */}
          <div className="sticky top-0 z-40 flex bg-muted/80 backdrop-blur-sm border-b border-border text-xs font-medium text-muted-foreground h-9 shadow-sm w-fit min-w-full">
            <div className="sticky left-0 z-50 flex items-stretch shrink-0">
              <div className="flex items-center justify-center w-14 border-r border-border bg-muted/80">
                {/* Checkbox placeholder */}
              </div>
              {showTimeAndDate && (
                <div className="flex items-center px-3 w-[100px] border-r border-border bg-muted/80 font-semibold text-xs">
                  Local Time
                </div>
              )}
            </div>
            <SortableContext items={table.getFlatHeaders().map(h => h.id)} strategy={horizontalListSortingStrategy}>
              {table.getFlatHeaders().map(header => (
                <DraggableHeader key={header.id} header={header} />
              ))}
            </SortableContext>
          </div>
        </DndContext>

        {/* Virtualized Body */}
        {rows.length === 0 ? (
           <div className="absolute top-9 left-0 w-full p-4 text-center text-sm text-muted-foreground">
             No data available in this view.
           </div>
        ) : (
          virtualRows.map(virtualRow => {
            const row = rows[virtualRow.index]
            return (
              <div
                key={row.id}
                className={cn(
                  "absolute top-0 left-0 flex w-fit min-w-full border-b border-border/50 transition-colors group",
                  alternateColoring && virtualRow.index % 2 !== 0 ? "bg-muted" : "bg-background",
                  "hover:bg-accent group-has-[[aria-expanded=true]]:bg-accent"
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start + 36}px)`, // +36 for header offset
                }}
              >
                <div className="sticky left-0 z-30 flex items-stretch shrink-0">
                  <div className={cn(
                    "flex items-center justify-center w-14 border-r border-border/50 select-none transition-colors",
                    alternateColoring && virtualRow.index % 2 !== 0 ? "bg-muted" : "bg-background",
                    "group-hover:bg-accent group-has-[[aria-expanded=true]]:bg-accent"
                  )}>
                  <div className="group-hover:hidden group-has-[[aria-expanded=true]]:hidden text-[10px] text-muted-foreground/50">{virtualRow.index + 1}</div>
                  <div className="hidden group-hover:flex group-has-[[aria-expanded=true]]:flex items-center justify-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted outline-none">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => handleCopySingleRow(row.original, false)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy row
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopySingleRow(row.original, true)}>
                          <ClipboardType className="w-4 h-4 mr-2" />
                          Copy with headers
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => { setRowToDelete(row.original); setDeleteConfirmOpen(true); }}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete row
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button onClick={() => setExpandedRow(row.original)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {showTimeAndDate && (() => {
                  const phoneKey = Object.keys(row.original).find(k => k.toLowerCase().includes('lead number')) || Object.keys(row.original).find(k => k.toLowerCase().includes('phone'))
                  const phoneValue = phoneKey ? row.original[phoneKey] : null
                  return (
                    <div className={cn(
                      "flex items-center px-3 w-[100px] border-r border-border/50 transition-colors text-xs text-muted-foreground truncate font-medium",
                      alternateColoring && virtualRow.index % 2 !== 0 ? "bg-muted" : "bg-background",
                      "group-hover:bg-accent group-has-[[aria-expanded=true]]:bg-accent"
                    )}>
                      {formatPhoneTime(phoneValue) || '--'}
                    </div>
                  )
                })()}
                </div>
                {row.getVisibleCells().map((cell, colIndex) => {
                  const selected = isCellSelected(virtualRow.index, colIndex)
                  const focused = isCellFocused(virtualRow.index, colIndex)
                  return (
                    <MemoizedGridCell
                      key={cell.id}
                      cell={cell}
                      virtualRowIndex={virtualRow.index}
                      colIndex={colIndex}
                      selected={selected}
                      focused={focused}
                      handleCellMouseDown={handleCellMouseDown}
                      handleCellMouseEnter={handleCellMouseEnter}
                      alternateColoring={alternateColoring}
                      pinnedOffset={pinnedOffset}
                      dataVersion={dataVersion}
                    />
                  )
                })}
              </div>
            )
          })
        )}
        
        {/* Add Row Button at Bottom */}
        <div 
          className="absolute left-0 flex items-center px-4 w-fit min-w-full h-9 border-b border-border hover:bg-muted/30 cursor-pointer text-muted-foreground text-sm font-medium transition-colors"
          style={{ transform: `translateY(${totalSize + 36}px)` }}
          onClick={handleAddRow}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isAddingRow ? 'Adding...' : 'Add row'}
        </div>
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
                headers={table.getFlatHeaders().map(h => h.id)}
                onUpdate={incrementDataVersion}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Row</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this row? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { 
              if (rowToDelete) handleDeleteSingleRow(rowToDelete); 
              setDeleteConfirmOpen(false); 
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Selected Cells Summary Panel */}
      {selectedCellsStats && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 px-4 py-2.5 bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 hover:scale-[1.02] transition-all select-none">
          {selectedCellsStats.numericCount > 0 ? (
            <>
              <div className="flex items-center gap-2 border-r border-border/50 pr-4">
                <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                  <Sigma className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Sum</span>
                  <span className="text-sm font-bold text-foreground">
                    {selectedCellsStats.sum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Average</span>
                  <span className="text-foreground font-semibold">
                    {selectedCellsStats.avg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Count</span>
                  <span className="text-foreground font-semibold">{selectedCellsStats.numericCount}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Min</span>
                  <span className="text-foreground font-semibold">
                    {selectedCellsStats.min.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Max</span>
                  <span className="text-foreground font-semibold">
                    {selectedCellsStats.max.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Sigma className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Count</span>
                <span className="text-sm font-bold text-foreground">
                  {selectedCellsStats.count}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <OptionsEditorDialog />
    </div>
  )
}
