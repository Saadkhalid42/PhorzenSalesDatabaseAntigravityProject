'use client'
import * as React from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, parseISO, isValid } from 'date-fns'
import { Check, ChevronDown, Plus, X, ListPlus } from 'lucide-react'

interface EditableCellProps {
  initialValue: any
  rowId: string
  columnId: string
  onUpdate?: () => void
  uniqueValues?: string[]
  isFocused?: boolean
  rowObj?: any
}

const formatValue = (val: any) => {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

const getColumnType = (col: string, val: any, overrides: Record<string, string>) => {
  // Explicit override from the user takes highest priority
  if (overrides[col]) return overrides[col]
  
  const lower = col.toLowerCase()
  if (lower.includes('date')) return 'date'
  if (lower.includes('url') || lower.includes('link') || lower.includes('website')) return 'url'
  if (
    lower.includes('status') ||
    lower.includes('stage') ||
    lower.includes('type') ||
    lower.includes('platform') ||
    lower.includes('source') ||
    lower.includes('category') ||
    lower.includes('priority')
  ) return 'select'
  if (lower.startsWith('is ') || lower.startsWith('has ') || typeof val === 'boolean') return 'boolean'
  if (lower.includes('amount') || lower.includes('revenue') || lower.includes('count') || typeof val === 'number') return 'number'
  return 'text'
}

const parseDateValue = (val: any): Date | undefined => {
  if (!val) return undefined
  try {
    if (val instanceof Date) return isValid(val) ? val : undefined
    const d = parseISO(String(val))
    return isValid(d) ? d : undefined
  } catch {
    return undefined
  }
}

// Pill colors for select options
const PILL_COLORS = [
  'bg-blue-500/15 text-blue-600 border-blue-400/30 dark:text-blue-400',
  'bg-green-500/15 text-green-700 border-green-400/30 dark:text-green-400',
  'bg-amber-500/15 text-amber-700 border-amber-400/30 dark:text-amber-400',
  'bg-purple-500/15 text-purple-700 border-purple-400/30 dark:text-purple-400',
  'bg-rose-500/15 text-rose-700 border-rose-400/30 dark:text-rose-400',
  'bg-cyan-500/15 text-cyan-700 border-cyan-400/30 dark:text-cyan-400',
  'bg-orange-500/15 text-orange-700 border-orange-400/30 dark:text-orange-400',
  'bg-indigo-500/15 text-indigo-700 border-indigo-400/30 dark:text-indigo-400',
]

function getPillColor(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash)
  return PILL_COLORS[Math.abs(hash) % PILL_COLORS.length]
}

// ── In-App Select Dropdown ─────────────────────────────────────────────────
function SelectDropdown({
  currentValue,
  uniqueValues,
  onSelect,
  onClose,
  columnId,
}: {
  currentValue: string
  uniqueValues: string[]
  onSelect: (val: string) => void
  onClose: () => void
  columnId: string
}) {
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { setOptionsEditor } = useStore()
  
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])
  
  const filtered = uniqueValues.filter(v => v.toLowerCase().includes(search.toLowerCase()))
  const showCustom = search && !uniqueValues.some(v => v.toLowerCase() === search.toLowerCase())
  
  return (
    <div className="flex flex-col w-56">
      {/* Search */}
      <div className="px-2 pt-2 pb-1 border-b border-border">
        <div className="relative">
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search options..."
            className="w-full h-7 bg-muted/50 rounded-md px-2 text-xs outline-none focus:ring-1 focus:ring-primary border border-border/50"
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'Enter' && showCustom) {
                onSelect(search)
                onClose()
              }
            }}
          />
        </div>
      </div>
      
      {/* Options */}
      <div className="max-h-48 overflow-y-auto py-1">
        {/* Clear option */}
        {currentValue && (
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors"
            onClick={() => { onSelect(''); onClose() }}
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
        
        {filtered.length === 0 && !showCustom && (
          <div className="px-3 py-3 text-xs text-muted-foreground text-center">No options found</div>
        )}
        
        {filtered.map(v => (
          <button
            key={v}
            className={cn(
              "w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2 transition-colors group",
              v === currentValue && "bg-primary/5"
            )}
            onClick={() => { onSelect(v); onClose() }}
          >
            <span className={cn(
              "flex-1 px-1.5 py-0.5 rounded text-[11px] font-medium border truncate",
              getPillColor(v)
            )}>
              {v}
            </span>
            {v === currentValue && <Check className="w-3 h-3 text-primary shrink-0" />}
          </button>
        ))}
        
        {showCustom && (
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2 transition-colors text-primary"
            onClick={() => { onSelect(search); onClose() }}
          >
            <Plus className="w-3 h-3 shrink-0" />
            <span>Use "<strong>{search}</strong>"</span>
          </button>
        )}
      </div>

      {/* Footer to Edit Select Options */}
      <div className="border-t border-border/80 px-2 py-1.5 bg-muted/20">
        <button
          onClick={() => {
            setOptionsEditor(columnId, true)
            onClose()
          }}
          className="w-full h-7 text-xs font-semibold text-primary hover:text-primary-foreground hover:bg-primary border border-primary/20 rounded-md flex items-center justify-center gap-1.5 transition-all shadow-sm focus:outline-none"
        >
          <ListPlus className="w-3.5 h-3.5" />
          Edit options
        </button>
      </div>
    </div>
  )
}

export function EditableCell({ initialValue, rowId, columnId, onUpdate, uniqueValues = [], isFocused, rowObj }: EditableCellProps) {
  const [lastInitialValue, setLastInitialValue] = useState(initialValue)
  const [currentValue, setCurrentValue] = useState(initialValue)
  const [value, setValue] = useState(formatValue(initialValue))
  const [isEditing, setIsEditing] = useState(false)
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const { pushHistory, fieldTypeOverrides, databases, activeDatabaseId, customSelectOptions, uniqueValuesByColumn } = useStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isFocused && !isEditing && containerRef.current) {
      containerRef.current.focus()
    }
  }, [isFocused, isEditing])

  const fieldType = getColumnType(columnId, currentValue, fieldTypeOverrides)

  if (initialValue !== lastInitialValue) {
    setLastInitialValue(initialValue)
    setCurrentValue(initialValue)
    setValue(formatValue(initialValue))
  }

  const saveChange = useCallback(async (newValue: any) => {
    if (String(newValue) !== String(currentValue)) {
      const previousValue = currentValue
      setCurrentValue(newValue)
      const rowIdKey = 'id'

      try {
        const activeDatabase = databases.find(db => db.id === activeDatabaseId)
        const isLegacy = activeDatabase?.is_legacy !== false

        let error = null
        if (isLegacy) {
          const { error: err } = await (supabase.from('PhorzenSalesDatabase') as any)
            .update({ [columnId]: newValue })
            .eq(rowIdKey, rowId)
          error = err
        } else {
          // Dynamic Database: construct newDataJsonb and call /api/data
          const oldDataJsonb = { ...rowObj }
          delete oldDataJsonb.id
          const newDataJsonb = {
            ...oldDataJsonb,
            [columnId]: newValue
          }
          const res = await fetch('/api/data', {
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
          if (!res.ok) {
            error = new Error('Failed to update dynamic database row')
          } else {
            const json = await res.json()
            if (json.error) error = new Error(json.error)
          }
        }

        if (error) {
          console.error('Failed to update cell:', error)
          setCurrentValue(previousValue)
        } else {
          try {
            await supabase.from('change_logs').insert([{
              row_id: String(rowId),
              field_name: columnId,
              old_value: formatValue(previousValue),
              new_value: formatValue(newValue)
            }] as any)
          } catch (logError) {
            console.error('Failed to insert change log:', logError)
          }

          pushHistory({
            updates: [{
              rowId,
              rowIdKey,
              columnId,
              oldValue: previousValue,
              newValue
            }]
          })

          if (onUpdate) onUpdate()
        }
      } catch (e) {
        console.error(e)
        setCurrentValue(previousValue)
      }
    }
  }, [currentValue, columnId, rowId, pushHistory, onUpdate, databases, activeDatabaseId, rowObj])

  const handleStartEdit = (replaceWith?: string) => {
    if (fieldType === 'boolean') return
    if (fieldType === 'date') {
      setIsDateOpen(true)
      return
    }
    if (fieldType === 'select') {
      setIsSelectOpen(true)
      return
    }

    setIsEditing(true)
    if (replaceWith !== undefined) {
      setValue(replaceWith)
    } else {
      setValue(formatValue(currentValue))
    }

    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus()
    }, 0)
  }

  const onBlurEdit = async () => {
    setIsEditing(false)
    await saveChange(value)
  }

  const onContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditing || isSelectOpen) return

    if (e.key === 'Enter') {
      e.preventDefault()
      handleStartEdit()
      return
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      saveChange(null)
      return
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      if (fieldType === 'select') {
        setIsSelectOpen(true)
      } else {
        handleStartEdit(e.key)
      }
    }
  }

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsEditing(false)
      setValue(formatValue(currentValue))
      containerRef.current?.focus()
    }
  }

  const toggleBoolean = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newVal = !currentValue
    saveChange(newVal)
  }

  // ── Date Cell ──────────────────────────────────────────────────────────────
  if (fieldType === 'date') {
    const selectedDate = parseDateValue(currentValue)
    const displayStr = selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''

    return (
      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
        <PopoverTrigger
          ref={containerRef as any}
          tabIndex={-1}
          className="w-full h-full flex items-center px-2 cursor-pointer text-sm font-sans relative group outline-none"
          onDoubleClick={() => setIsDateOpen(true)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsDateOpen(true) }
            if (e.key === 'Backspace') { e.preventDefault(); saveChange(null) }
          }}
        >
          {displayStr
            ? <span className="truncate">{displayStr}</span>
            : <span className="text-muted-foreground/30 font-light">-</span>
          }
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 shadow-xl border border-border/60 rounded-xl overflow-hidden"
          align="start"
          sideOffset={4}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                const iso = format(date, 'yyyy-MM-dd')
                setCurrentValue(iso)
                saveChange(iso)
              }
              setIsDateOpen(false)
            }}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    )
  }

  // ── Select Cell (In-App Popover) ─────────────────────────────────────────
  if (fieldType === 'select') {
    const displayVal = formatValue(currentValue)
    return (
      <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
        <PopoverTrigger
          ref={containerRef as any}
          tabIndex={-1}
          className="w-full h-full flex items-center px-1 gap-1 cursor-pointer text-sm font-sans relative group outline-none"
          onKeyDown={onContainerKeyDown as any}
        >
          {displayVal ? (
            <span className={cn(
              "flex-1 px-1.5 py-0.5 rounded text-[11px] font-medium border truncate",
              getPillColor(displayVal)
            )}>
              {displayVal}
            </span>
          ) : (
            <span className="flex-1 text-muted-foreground/30 font-light">-</span>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-auto shadow-xl border border-border/60 rounded-xl overflow-hidden"
          align="start"
          sideOffset={4}
        >
          <SelectDropdown
            currentValue={displayVal}
            uniqueValues={customSelectOptions[columnId] || uniqueValuesByColumn[columnId] || uniqueValues}
            onSelect={val => {
              setCurrentValue(val)
              saveChange(val)
            }}
            onClose={() => setIsSelectOpen(false)}
            columnId={columnId}
          />
        </PopoverContent>
      </Popover>
    )
  }

  // ── Editing state (text/number) ────────────────────────────────────────────
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={fieldType === 'number' ? 'number' : 'text'}
        className="w-full h-full bg-background outline-none border border-primary text-sm px-1 font-sans shadow-sm z-50 relative min-w-[120px]"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={onBlurEdit}
        onKeyDown={onInputKeyDown}
      />
    )
  }

  // ── Display state ──────────────────────────────────────────────────────────
  const displayVal = formatValue(currentValue)

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="w-full h-full flex items-center px-1 truncate cursor-cell text-sm font-sans relative group outline-none"
      onDoubleClick={() => handleStartEdit()}
      onKeyDown={onContainerKeyDown}
    >
      {fieldType === 'boolean' ? (
        <div className="flex items-center justify-center w-full h-full cursor-pointer" onClick={toggleBoolean}>
          <input type="checkbox" checked={!!currentValue} readOnly className="w-4 h-4 cursor-pointer" />
        </div>
      ) : fieldType === 'url' && displayVal ? (
        <a
          href={displayVal.startsWith('http') ? displayVal : `https://${displayVal}`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:underline truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {displayVal}
        </a>
      ) : displayVal === '' ? (
        <span className="text-muted-foreground/30 font-light">-</span>
      ) : (
        <span className="truncate">{displayVal}</span>
      )}
    </div>
  )
}
