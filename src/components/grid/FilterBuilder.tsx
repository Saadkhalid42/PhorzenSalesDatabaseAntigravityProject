import * as React from 'react'
import { useState } from 'react'
import { useStore, FilterRule, FilterOperator } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Plus, X, ChevronDown, Check } from 'lucide-react'
import { FieldSelector } from '@/components/grid/FieldSelector'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const OPERATORS: FilterOperator[] = ['contains', 'is', 'is not', 'is not empty', 'is empty']

const PILL_COLORS = [
  'bg-blue-500/15 text-blue-600 border-blue-400/30 dark:text-blue-400',
  'bg-green-500/15 text-green-700 border-green-400/30 dark:text-green-400',
  'bg-amber-500/15 text-amber-700 border-amber-400/30 dark:text-amber-400',
  'bg-purple-500/15 text-purple-700 border-purple-400/30 dark:text-purple-400',
  'bg-rose-500/15 text-rose-700 border-rose-400/30 dark:text-rose-400',
  'bg-cyan-500/15 text-cyan-700 border-cyan-400/30 dark:text-cyan-400',
]

function getPillColor(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash)
  return PILL_COLORS[Math.abs(hash) % PILL_COLORS.length]
}

// In-app filter value picker for select fields
function FilterValuePicker({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "h-8 flex-1 flex items-center gap-1.5 px-2 border border-border rounded-md text-xs text-left transition-colors",
          "bg-background hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
        )}
      >
        {value ? (
          <span className={cn(
            "flex-1 px-1.5 py-0.5 rounded text-[11px] font-medium border truncate",
            getPillColor(value)
          )}>
            {value}
          </span>
        ) : (
          <span className="flex-1 text-muted-foreground">Pick a value…</span>
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-52 shadow-xl border border-border/60 rounded-xl overflow-hidden" align="start" sideOffset={4}>
        <div className="px-2 pt-2 pb-1 border-b border-border">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full h-7 bg-muted/50 rounded-md px-2 text-xs outline-none focus:ring-1 focus:ring-primary border border-border/50"
          />
        </div>
        <div className="max-h-48 overflow-y-auto py-1">
          {value && (
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors"
              onClick={() => { onChange(''); setOpen(false) }}
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          {filtered.map(opt => (
            <button
              key={opt}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2 transition-colors",
                opt === value && "bg-primary/5"
              )}
              onClick={() => { onChange(opt); setOpen(false) }}
            >
              <span className={cn(
                "flex-1 px-1.5 py-0.5 rounded text-[11px] font-medium border truncate",
                getPillColor(opt)
              )}>
                {opt}
              </span>
              {opt === value && <Check className="w-3 h-3 text-primary shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">No options</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function FilterBuilder() {
  const { filters, addFilter, removeFilter, updateFilter, availableFields, uniqueValuesByColumn } = useStore()

  const handleAddFilter = () => {
    addFilter({
      id: Math.random().toString(36).substr(2, 9),
      field: availableFields[0] || '',
      operator: 'contains',
      value: '',
      combinator: 'and'
    })
  }

  return (
    <div className="space-y-4 p-1">
      {filters.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-4">No filters applied to this view</p>
      ) : (
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <div key={filter.id} className="flex items-center gap-2 text-sm">
              <div className="w-16 shrink-0 text-muted-foreground text-xs">
                {index === 0 ? 'Where' : (
                  <select 
                    className="bg-transparent border-none outline-none focus:ring-0 cursor-pointer hover:text-primary transition-colors font-medium"
                    value={filter.combinator}
                    onChange={(e) => updateFilter(filter.id, { combinator: e.target.value as 'and' | 'or' })}
                  >
                    <option value="and">And</option>
                    <option value="or">Or</option>
                  </select>
                )}
              </div>
              
              <FieldSelector
                fields={availableFields}
                value={filter.field}
                onChange={(val) => updateFilter(filter.id, { field: val })}
                className="flex-1"
              />

              <select 
                className="h-8 flex-1 bg-muted/50 border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                value={filter.operator}
                onChange={(e) => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
              >
                {OPERATORS.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>

              {!['is empty', 'is not empty'].includes(filter.operator) && (
                <div className="flex-1">
                  {(['is', 'is not'].includes(filter.operator) && uniqueValuesByColumn[filter.field]?.length > 0) ? (
                    <FilterValuePicker
                      value={filter.value}
                      options={uniqueValuesByColumn[filter.field]}
                      onChange={(val) => updateFilter(filter.id, { value: val })}
                    />
                  ) : (
                    <input 
                      type="text"
                      placeholder="Value..."
                      className="h-8 w-full bg-background border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    />
                  )}
                </div>
              )}

              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeFilter(filter.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:bg-primary/10 w-fit" onClick={handleAddFilter}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add filter
      </Button>
    </div>
  )
}
