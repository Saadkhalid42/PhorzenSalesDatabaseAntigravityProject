'use client'
import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, parseISO, isValid } from 'date-fns'

interface EditableCellProps {
  initialValue: any
  rowId: string
  columnId: string
  onUpdate?: () => void
  uniqueValues?: string[]
  isFocused?: boolean
}

const formatValue = (val: any) => {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

const getColumnType = (col: string, val: any) => {
  const lower = col.toLowerCase()
  if (lower.includes('date')) return 'date'
  if (lower.includes('url') || lower.includes('link') || lower.includes('website')) return 'url'
  if (lower.includes('status') || lower.includes('stage') || lower.includes('type')) return 'select'
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

export function EditableCell({ initialValue, rowId, columnId, onUpdate, uniqueValues = [], isFocused }: EditableCellProps) {
  const [lastInitialValue, setLastInitialValue] = useState(initialValue)
  const [currentValue, setCurrentValue] = useState(initialValue)
  const [value, setValue] = useState(formatValue(initialValue))
  const [isEditing, setIsEditing] = useState(false)
  const [isDateOpen, setIsDateOpen] = useState(false)
  const { pushHistory } = useStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (isFocused && !isEditing && containerRef.current) {
      containerRef.current.focus()
    }
  }, [isFocused, isEditing])

  const fieldType = getColumnType(columnId, currentValue)

  if (initialValue !== lastInitialValue) {
    setLastInitialValue(initialValue)
    setCurrentValue(initialValue)
    setValue(formatValue(initialValue))
  }

  const saveChange = async (newValue: any) => {
    if (String(newValue) !== String(currentValue)) {
      const previousValue = currentValue
      setCurrentValue(newValue)
      const rowIdKey = 'id'

      try {
        const { error } = await (supabase.from('PhorzenSalesDatabase') as any)
          .update({ [columnId]: newValue })
          .eq(rowIdKey, rowId)

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
  }

  const handleStartEdit = (replaceWith?: string) => {
    if (fieldType === 'boolean') return
    if (fieldType === 'date') {
      setIsDateOpen(true)
      return
    }

    setIsEditing(true)
    if (replaceWith !== undefined) {
      setValue(replaceWith)
    } else {
      setValue(formatValue(currentValue))
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)
  }

  const onBlurEdit = async () => {
    setIsEditing(false)
    await saveChange(value)
  }

  const onContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) return

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
      handleStartEdit(e.key)
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

  // ── Editing state ──────────────────────────────────────────────────────────
  if (isEditing) {
    if (fieldType === 'select') {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          className="w-full h-full bg-background outline-none border border-primary text-sm px-1 font-sans rounded-sm z-50 relative"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={onBlurEdit}
          onKeyDown={onInputKeyDown}
        >
          <option value="">-- Select --</option>
          {uniqueValues.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
          {!uniqueValues.includes(value) && value !== '' && (
            <option value={value}>{value}</option>
          )}
        </select>
      )
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
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

      {fieldType === 'select' && displayVal && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-muted/50 text-[10px] px-1 rounded text-muted-foreground pointer-events-none">
          ▾
        </div>
      )}
    </div>
  )
}
