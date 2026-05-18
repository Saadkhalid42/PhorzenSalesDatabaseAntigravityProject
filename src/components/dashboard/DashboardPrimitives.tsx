'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Search, Check, ChevronDown, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useStore, WidgetCondition, WidgetConfig, AggregationType } from '@/store/useStore'
import { FilterValuePicker } from '@/components/grid/FilterBuilder'

import { Combobox } from '@/components/ui/combobox'

// ─── Operator Combobox ──────────────────────────────────────────────────────
export const OPERATORS: { value: WidgetCondition['operator']; label: string; hasValue: boolean }[] = [
  { value: 'is_not_empty',  label: 'is not empty',   hasValue: false },
  { value: 'is_empty',      label: 'is empty',        hasValue: false },
  { value: 'equals',        label: 'is',              hasValue: true  },
  { value: 'not_equals',    label: 'is not',          hasValue: true  },
  { value: 'contains',      label: 'contains',        hasValue: true  },
  { value: 'not_contains',  label: 'does not contain',hasValue: true  },
  { value: 'starts_with',   label: 'starts with',     hasValue: true  },
  { value: 'ends_with',     label: 'ends with',       hasValue: true  },
  { value: 'greater_than',  label: '>',               hasValue: true  },
  { value: 'less_than',     label: '<',               hasValue: true  },
  { value: 'gte',           label: '≥',               hasValue: true  },
  { value: 'lte',           label: '≤',               hasValue: true  },
]

// ─── Condition Row ──────────────────────────────────────────────────────────
export function ConditionRow({ cond, fields, onChange, onRemove }: {
  cond: WidgetCondition; fields: string[]
  onChange: (u: Partial<WidgetCondition>) => void; onRemove: () => void
}) {
  const { uniqueValuesByColumn, customSelectOptions } = useStore()
  const opMeta = OPERATORS.find(o => o.value === cond.operator)
  const uniqueValues = customSelectOptions[cond.field] || uniqueValuesByColumn[cond.field] || []
  const useDropdown = ['equals', 'not_equals'].includes(cond.operator) && uniqueValues.length > 0

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 grid grid-cols-2 gap-2">
        <Combobox value={cond.field} onChange={v => onChange({ field: v, value: '' })} options={fields} placeholder="Field…" />
        <Combobox
          value={opMeta?.label ?? ''}
          onChange={v => { const op = OPERATORS.find(o => o.label === v); if (op) onChange({ operator: op.value, value: '' }) }}
          options={OPERATORS.map(o => o.label)}
          placeholder="Operator…"
        />
        {opMeta?.hasValue && (
          <div className="col-span-2">
            {useDropdown ? (
              <FilterValuePicker
                value={cond.value || ''}
                options={uniqueValues}
                onChange={v => onChange({ value: v })}
              />
            ) : (
              <Input value={cond.value || ''} onChange={e => onChange({ value: e.target.value })}
                placeholder="Value…" className="h-8 text-sm" />
            )}
          </div>
        )}
      </div>
      <button onClick={onRemove} className="mt-2 p-1 text-muted-foreground hover:text-destructive rounded shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Agg options ────────────────────────────────────────────────────────────
export const AGG_OPTIONS = [
  { value: 'count',          label: 'Count rows' },
  { value: 'count_non_empty',label: 'Count non-empty' },
  { value: 'sum',            label: 'Sum' },
  { value: 'average',        label: 'Average' },
  { value: 'min',            label: 'Min' },
  { value: 'max',            label: 'Max' },
]

// ─── Widget Builder Form ────────────────────────────────────────────────────
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BarChart2, PieChart, TrendingUp, Hash, LayoutDashboard } from 'lucide-react'
import type { WidgetType } from '@/store/useStore'

const BLANK: Omit<WidgetConfig, 'id'> = {
  name: '', type: 'stat', aggregation: 'count', conditions: [],
  conditionCombinator: 'and', prefix: '', suffix: '',
  layout: { x: 0, y: 0, w: 3, h: 2 }
}

const TYPE_OPTS: { value: WidgetType; label: string; icon: React.ReactNode }[] = [
  { value: 'stat',  label: 'Stat',   icon: <Hash className="w-4 h-4" /> },
  { value: 'bar',   label: 'Bar',    icon: <BarChart2 className="w-4 h-4" /> },
  { value: 'pie',   label: 'Pie',    icon: <PieChart className="w-4 h-4" /> },
  { value: 'donut', label: 'Donut',  icon: <PieChart className="w-4 h-4" /> },
  { value: 'line',  label: 'Line',   icon: <TrendingUp className="w-4 h-4" /> },
]

export function WidgetBuilderDialog({ open, initial, fields, onSave, onClose }: {
  open: boolean; initial?: WidgetConfig; fields: string[]
  onSave: (w: Omit<WidgetConfig, 'id'>) => void; onClose: () => void
}) {
  const [form, setForm] = useState<Omit<WidgetConfig, 'id'>>(BLANK)

  useEffect(() => {
    setForm(initial ? { ...initial } : { ...BLANK })
  }, [initial, open])

  const p = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const isStat  = form.type === 'stat'
  const isChart = ['bar', 'pie', 'line', 'donut'].includes(form.type)
  const needsAggField = form.aggregation && ['sum','average','min','max','count_non_empty'].includes(form.aggregation)
  const needsValField = form.valueAggregation && ['sum','average'].includes(form.valueAggregation)

  const addCond = () => p('conditions', [...(form.conditions||[]), { id: `c-${Date.now()}`, field: '', operator: 'is_not_empty' as const }])
  const updCond = (id: string, u: Partial<WidgetCondition>) => p('conditions', (form.conditions||[]).map(c => c.id===id?{...c,...u}:c))
  const delCond = (id: string) => p('conditions', (form.conditions||[]).filter(c=>c.id!==id))

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Widget' : 'Add Widget'}</DialogTitle>
          <DialogDescription>Configure your dashboard widget.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Widget Name</label>
            <Input value={form.name} onChange={e => p('name', e.target.value)} placeholder="e.g. Total Revenue" autoFocus />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {TYPE_OPTS.map(t => (
                <button key={t.value} type="button" onClick={() => p('type', t.value)}
                  className={cn('flex flex-col items-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition-colors',
                    form.type===t.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground')}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stat options */}
          {isStat && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aggregation</label>
                <Combobox value={AGG_OPTIONS.find(a=>a.value===form.aggregation)?.label||''} onChange={v=>{const a=AGG_OPTIONS.find(x=>x.label===v);if(a)p('aggregation',a.value as AggregationType)}} options={AGG_OPTIONS.map(a=>a.label)} />
              </div>
              {needsAggField && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Field to aggregate</label>
                  <Combobox value={form.aggregationField||''} onChange={v=>p('aggregationField',v)} options={fields} placeholder="Select field…" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prefix (e.g. $)</label>
                  <Input value={form.prefix||''} onChange={e=>p('prefix',e.target.value)} placeholder="$" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suffix (e.g. %)</label>
                  <Input value={form.suffix||''} onChange={e=>p('suffix',e.target.value)} placeholder="%" className="h-8 text-sm" />
                </div>
              </div>
            </>
          )}

          {/* Chart options */}
          {isChart && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Group By (X-axis / Slices)</label>
                <Combobox value={form.groupByField||''} onChange={v=>p('groupByField',v)} options={fields} placeholder="Select field…" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Measure</label>
                <Combobox value={AGG_OPTIONS.find(a=>a.value===form.valueAggregation)?.label||'Count rows'} onChange={v=>{const a=AGG_OPTIONS.find(x=>x.label===v);if(a)p('valueAggregation',a.value as AggregationType)}} options={AGG_OPTIONS.map(a=>a.label)} />
              </div>
              {needsValField && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value Field</label>
                  <Combobox value={form.valueField||''} onChange={v=>p('valueField',v)} options={fields} placeholder="Select field…" />
                </div>
              )}
            </div>
          )}

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter Rows</label>
              {(form.conditions||[]).length > 1 && (
                <div className="flex gap-1 text-xs">
                  {(['and','or'] as const).map(c=>(
                    <button key={c} type="button" onClick={()=>p('conditionCombinator',c)}
                      className={cn('px-2 py-0.5 rounded-full border text-xs transition-colors', form.conditionCombinator===c?'bg-primary text-primary-foreground border-primary':'border-border text-muted-foreground hover:bg-muted')}>
                      {c.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {(form.conditions||[]).map(c => (
                <ConditionRow key={c.id} cond={c} fields={fields} onChange={u=>updCond(c.id,u)} onRemove={()=>delCond(c.id)} />
              ))}
            </div>
            <button type="button" onClick={addCond} className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1">
              <Plus className="w-3 h-3" /> Add condition
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={()=>form.name.trim()&&onSave(form)} disabled={!form.name.trim()}>
            {initial ? 'Update' : 'Add Widget'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
