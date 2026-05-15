'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout/legacy'
const ResponsiveGridLayout = WidthProvider(Responsive)
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useStore, WidgetConfig, WidgetCondition } from '@/store/useStore'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Plus, Edit2, Trash2, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { WidgetBuilderDialog } from '@/components/dashboard/DashboardPrimitives'
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const PALETTE = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316','#14b8a6','#ef4444','#84cc16']

const ROW_H = 80

// ─── Condition Matching ─────────────────────────────────────────────────────
function matchRow(row: Record<string,any>, conds: WidgetCondition[], combo: 'and'|'or'): boolean {
  if (!conds.length) return true
  const results = conds.map(c => {
    const val = String(row[c.field] ?? '').toLowerCase().trim()
    const cv  = String(c.value ?? '').toLowerCase().trim()
    switch (c.operator) {
      case 'is_not_empty':  return val !== ''
      case 'is_empty':      return val === ''
      case 'equals':        return val === cv
      case 'not_equals':    return val !== cv
      case 'contains':      return val.includes(cv)
      case 'not_contains':  return !val.includes(cv)
      case 'starts_with':   return val.startsWith(cv)
      case 'ends_with':     return val.endsWith(cv)
      case 'greater_than':  return parseFloat(val) > parseFloat(cv)
      case 'less_than':     return parseFloat(val) < parseFloat(cv)
      case 'gte':           return parseFloat(val) >= parseFloat(cv)
      case 'lte':           return parseFloat(val) <= parseFloat(cv)
      default: return true
    }
  })
  return combo === 'and' ? results.every(Boolean) : results.some(Boolean)
}

function computeStat(rows: Record<string,any>[], w: WidgetConfig): string {
  const filtered = rows.filter(r => matchRow(r, w.conditions||[], w.conditionCombinator||'and'))
  const field = w.aggregationField || ''
  let result = 0
  switch (w.aggregation) {
    case 'count':          result = filtered.length; break
    case 'count_non_empty':result = filtered.filter(r=>r[field]!=null&&r[field]!=='').length; break
    case 'sum':            result = filtered.reduce((s,r)=>s+(parseFloat(String(r[field]??'').replace(/[^0-9.-]/g,''))||0),0); break
    case 'average': {
      const nums = filtered.map(r=>parseFloat(String(r[field]??'').replace(/[^0-9.-]/g,''))).filter(n=>!isNaN(n))
      result = nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0; break
    }
    case 'min': result = Math.min(...filtered.map(r=>parseFloat(String(r[field]??'').replace(/[^0-9.-]/g,''))).filter(n=>!isNaN(n))||[0]); break
    case 'max': result = Math.max(...filtered.map(r=>parseFloat(String(r[field]??'').replace(/[^0-9.-]/g,''))).filter(n=>!isNaN(n))||[0]); break
    default:    result = filtered.length
  }
  const fmt = Number.isInteger(result) ? result.toLocaleString() : result.toLocaleString(undefined,{maximumFractionDigits:2})
  return `${w.prefix||''}${fmt}${w.suffix||''}`
}

function computeChart(rows: Record<string,any>[], w: WidgetConfig): {name:string;value:number}[] {
  const filtered = rows.filter(r => matchRow(r, w.conditions||[], w.conditionCombinator||'and'))
  const gf = w.groupByField || ''
  const vf = w.valueField   || ''
  const agg = w.valueAggregation || 'count'
  const groups: Record<string,number[]> = {}
  filtered.forEach(r => {
    const key = String(r[gf]??'').trim()||'(empty)'
    const num = parseFloat(String(r[vf]??'').replace(/[^0-9.-]/g,''))
    if (!groups[key]) groups[key] = []
    if (!isNaN(num)) groups[key].push(num)
  })
  return Object.entries(groups).map(([name,nums]) => {
    let value = 0
    if (agg==='count') value = filtered.filter(r=>(String(r[gf]??'').trim()||'(empty)')===name).length
    else if (agg==='sum') value = nums.reduce((a,b)=>a+b,0)
    else if (agg==='average') value = nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0
    else if (agg==='min') value = nums.length ? Math.min(...nums) : 0
    else if (agg==='max') value = nums.length ? Math.max(...nums) : 0
    return { name, value: Math.round(value*100)/100 }
  }).sort((a,b)=>b.value-a.value).slice(0,15)
}

// ─── Widget Card ────────────────────────────────────────────────────────────
function WidgetCard({ widget, rows, isEditMode, onEdit, onDelete }: {
  widget: WidgetConfig; rows: Record<string,any>[]
  isEditMode: boolean; onEdit: ()=>void; onDelete: ()=>void
}) {
  const isStat = widget.type === 'stat'
  const chartData = !isStat ? computeChart(rows, widget) : []
  const statVal   = isStat  ? computeStat(rows, widget)  : ''
  const colors = PALETTE

  return (
    <div className="w-full h-full group relative rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{widget.name}</span>
        <div className="hidden group-hover:flex items-center gap-1">
          <button onClick={onEdit}   className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2  className="w-3 h-3"/></button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3"/></button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-3 pb-3">
        {isStat ? (
          <span className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent tabular-nums">{statVal}</span>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {widget.type==='pie'||widget.type==='donut' ? (
              <RechartsPie>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={widget.type==='donut'?'40%':0} outerRadius="72%" paddingAngle={2}
                  label={({name,percent})=>`${name} ${((percent??0)*100).toFixed(0)}%`} labelLine={false}>
                  {chartData.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}
                </Pie>
                <Tooltip formatter={(v:any)=>v.toLocaleString()}/>
              </RechartsPie>
            ) : widget.type==='line' ? (
              <LineChart data={chartData} margin={{top:4,right:8,left:0,bottom:24}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4}/>
                <XAxis dataKey="name" tick={{fontSize:9}} angle={-30} textAnchor="end" interval="preserveStartEnd"/>
                <YAxis tick={{fontSize:9}}/>
                <Tooltip formatter={(v:any)=>v.toLocaleString()}/>
                <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{r:3}}/>
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{top:4,right:8,left:0,bottom:24}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4}/>
                <XAxis dataKey="name" tick={{fontSize:9}} angle={-30} textAnchor="end" interval={0}/>
                <YAxis tick={{fontSize:9}}/>
                <Tooltip formatter={(v:any)=>v.toLocaleString()}/>
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {chartData.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Drag handle area at bottom to not conflict with resize */}
      {isEditMode && <div className="drag-handle absolute inset-x-0 top-0 h-10 cursor-grab active:cursor-grabbing bg-black/5 hover:bg-black/10 transition-colors z-10" />}
    </div>
  )
}

// ─── DashboardView ──────────────────────────────────────────────────────────
const COLS = 12

export function DashboardView() {
  const { activeViewId, activeDatabaseId, availableFields, databases,
    getDashboardWidgets, addDashboardWidget, updateDashboardWidget, deleteDashboardWidget, setDashboardWidgets } = useStore()

  const [rows, setRows]         = useState<Record<string,any>[]>([])
  const [addOpen, setAddOpen]   = useState(false)
  const [editW, setEditW]       = useState<WidgetConfig|null>(null)
  const [delW,  setDelW]        = useState<WidgetConfig|null>(null)
  const [containerW, setContainerW] = useState(1200)
  const [isEditMode, setIsEditMode] = useState(false)

  const widgets = getDashboardWidgets(activeViewId)

  // Measure container
  const containerRef = useCallback((node: HTMLDivElement|null) => {
    if (!node) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(node)
  }, [])

  // Load data
  useEffect(() => {
    async function load() {
      const db = databases.find(d=>d.id===activeDatabaseId)
      if (!db) return
      if (db.is_legacy !== false) {
        const { data } = await (supabase.from('PhorzenSalesDatabase') as any).select('*').limit(5000)
        setRows(data || [])
      } else {
        const res = await fetch(`/api/data?table_id=${activeDatabaseId}`)
        const d = await res.json()
        setRows((d.rows||[]).map((r:any)=>r.data_jsonb||r))
      }
    }
    load()
  }, [activeDatabaseId, databases])

  // Build RGL layout from widgets
  const layout = widgets.map(w => ({
    i: w.id,
    x: w.layout?.x ?? 0,
    y: w.layout?.y ?? Infinity,
    w: w.layout?.w ?? 4,
    h: w.layout?.h ?? 3,
    minW: 2, minH: 2
  }))

  const onLayoutChange = useCallback((newLayout: readonly any[]) => {
    const updated = widgets.map(w => {
      const l = newLayout.find(l=>l.i===w.id)
      return l ? { ...w, layout: { x:l.x, y:l.y, w:l.w, h:l.h } } : w
    })
    setDashboardWidgets(activeViewId, updated)
  }, [widgets, activeViewId, setDashboardWidgets])

  const handleAdd = useCallback((form: Omit<WidgetConfig,'id'>) => {
    addDashboardWidget(activeViewId, { ...form, id: `w-${Date.now()}`, layout: { x:0, y:Infinity, w:4, h:3 } })
    setAddOpen(false)
  }, [activeViewId, addDashboardWidget])

  const handleEdit = useCallback((form: Omit<WidgetConfig,'id'>) => {
    if (!editW) return
    updateDashboardWidget(activeViewId, editW.id, form)
    setEditW(null)
  }, [activeViewId, editW, updateDashboardWidget])

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-primary"/>
          <span className="text-sm font-medium">Dashboard</span>
          <span className="text-xs text-muted-foreground">· {widgets.length} widget{widgets.length!==1?'s':''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={isEditMode ? "default" : "outline"} size="sm" onClick={()=>setIsEditMode(!isEditMode)} className="h-8 gap-1.5">
            <Edit2 className="w-4 h-4"/> {isEditMode ? 'Done Editing' : 'Edit Layout'}
          </Button>
          <Button size="sm" onClick={()=>setAddOpen(true)} className="h-8 gap-1.5">
            <Plus className="w-4 h-4"/> Add Widget
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div ref={containerRef} className="flex-1 p-4 overflow-auto">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground min-h-[400px]">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center">
              <LayoutDashboard className="w-10 h-10 opacity-25"/>
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">No widgets yet</p>
              <p className="text-sm mt-1">Click <strong>Add Widget</strong> to build your first dashboard</p>
            </div>
            <Button onClick={()=>setAddOpen(true)} className="gap-2 mt-1">
              <Plus className="w-4 h-4"/> Add your first widget
            </Button>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={ROW_H}
            onLayoutChange={(curr, all) => onLayoutChange(curr)}
            draggableHandle=".drag-handle"
            isDraggable={isEditMode}
            isResizable={isEditMode}
            margin={[12,12]}
            containerPadding={[0,0]}
          >
            {widgets.map(w => (
              <div key={w.id} className={cn("overflow-hidden rounded-xl bg-card", isEditMode && "ring-2 ring-primary/20 ring-offset-1 ring-offset-background")}>
                {isEditMode && (
                  <div className="drag-handle absolute inset-x-0 top-0 h-8 z-30 cursor-move flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-primary/5 border-b border-primary/10">
                    <div className="w-8 h-1 bg-primary/20 rounded-full" />
                  </div>
                )}
                <WidgetCard widget={w} rows={rows} isEditMode={isEditMode}
                  onEdit={()=>setEditW(w)}
                  onDelete={()=>setDelW(w)}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Add Widget */}
      <WidgetBuilderDialog open={addOpen} fields={availableFields} onSave={handleAdd} onClose={()=>setAddOpen(false)}/>

      {/* Edit Widget */}
      <WidgetBuilderDialog open={!!editW} initial={editW??undefined} fields={availableFields} onSave={handleEdit} onClose={()=>setEditW(null)}/>

      {/* Delete confirm */}
      <Dialog open={!!delW} onOpenChange={v=>!v&&setDelW(null)}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Widget</DialogTitle>
            <DialogDescription>Remove <strong>{delW?.name}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={()=>setDelW(null)}>Cancel</Button>
            <Button variant="destructive" onClick={()=>{ if(delW) deleteDashboardWidget(activeViewId,delW.id); setDelW(null) }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
