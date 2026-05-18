'use client'

import { useStore } from '@/store/useStore'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Button, buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Filter, ArrowUpDown, EyeOff, LayoutTemplate, Search, GripVertical } from 'lucide-react'
import { FilterBuilder } from '@/components/grid/FilterBuilder'
import { SortBuilder } from '@/components/grid/SortBuilder'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { useTheme, THEMES, ThemeName } from '@/providers/theme-provider'
import { Download, Trash2, Edit2, Plus, Palette, Check, Database, ChevronDown, Settings2, Clock, Menu, X } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import { CsvImportWizard } from '@/components/CsvImportWizard'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { IconPicker, RenderIcon, IconName } from '@/components/IconPicker'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Sortable workspace item ─────────────────────────────────────────────────
function SortableWorkspaceItem({
  ws,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  canDelete,
}: {
  ws: { id: string; name: string; icon?: string }
  isActive: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ws.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer select-none',
        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 flex-1 truncate">
        <span
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </span>
        <RenderIcon name={ws.icon} className="w-4 h-4 shrink-0" />
        <span className="text-sm truncate">{ws.name}</span>
      </div>
      <div className="hidden group-hover:flex items-center gap-1 opacity-70 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="hover:text-primary p-0.5"><Edit2 className="w-3 h-3" /></button>
        {canDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="hover:text-destructive p-0.5"><Trash2 className="w-3 h-3" /></button>
        )}
      </div>
    </div>
  )
}

// ── SortableViewItem ──────────────────────────────────────────────────────
function SortableViewItem({
  view,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  canDelete,
}: {
  view: { id: string; name: string; icon?: string }
  isActive: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: view.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer select-none',
        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 flex-1 truncate">
        <span
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </span>
        <RenderIcon name={view.icon} className="w-4 h-4 shrink-0" />
        <span className="text-sm truncate">{view.name}</span>
      </div>
      <div className="hidden group-hover:flex items-center gap-1 opacity-70 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="hover:text-primary p-0.5"><Edit2 className="w-3 h-3" /></button>
        {canDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="hover:text-destructive p-0.5"><Trash2 className="w-3 h-3" /></button>
        )}
      </div>
    </div>
  )
}

// ── SortableDatabaseItem ────────────────────────────────────────────────────
function SortableDatabaseItem({
  db,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  canDelete,
}: {
  db: { id: string; name: string }
  isActive: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: db.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer select-none',
        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 flex-1 truncate">
        <span
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </span>
        <Database className="w-4 h-4 shrink-0 opacity-70" />
        <span className="text-sm truncate">{db.name}</span>
      </div>
      <div className="hidden group-hover:flex items-center gap-1 opacity-70 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="hover:text-primary p-0.5"><Edit2 className="w-3 h-3" /></button>
        {canDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="hover:text-destructive p-0.5"><Trash2 className="w-3 h-3" /></button>
        )}
      </div>
    </div>
  )
}

// ── Sortable field item ───────────────────────────────────────────────────────
function SortableFieldItem({ field, isHidden, onToggle }: { field: string, isHidden: boolean, onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : 0 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between py-1 px-1 hover:bg-muted/50 rounded bg-background",
        isDragging && "opacity-50 ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground outline-none">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs text-foreground truncate">{field}</span>
      </div>
      <Switch checked={!isHidden} onCheckedChange={onToggle} />
    </div>
  )
}

export function Toolbar() {
  const {
    databases,
    activeDatabaseId,
    setActiveDatabaseId,
    addDatabase,
    renameDatabase,
    deleteDatabase,
    activeWorkspaceId,
    activeViewId,
    setActiveWorkspaceId,
    setActiveViewId,
    rowHeight,
    setRowHeight,
    availableFields,
    hiddenColumns,
    toggleHiddenColumn,
    setHiddenColumns,
    columnOrder,
    setColumnOrder,
    searchQuery,
    setSearchQuery,
    workspaces,
    views,
    addWorkspace,
    renameWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
    addView,
    renameView,
    deleteView,
    reorderViews,
    reorderDatabases,
    alternateColoring,
    setAlternateColoring,
    showTimeAndDate,
    setShowTimeAndDate,
    incrementDataVersion
  } = useStore()

  const { theme, setTheme } = useTheme()
  const [hideFieldSearch, setHideFieldSearch] = useState('')
  const [activeHideFieldId, setActiveHideFieldId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')

  // Compute display fields based on columnOrder
  const displayFields = useMemo(() => {
    const ordered = columnOrder.filter(f => availableFields.includes(f))
    const missing = availableFields.filter(f => !columnOrder.includes(f))
    return [...ordered, ...missing]
  }, [columnOrder, availableFields])

  const handleDbDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIdx = databases.findIndex(db => db.id === active.id)
    const toIdx = databases.findIndex(db => db.id === over.id)
    if (fromIdx !== -1 && toIdx !== -1) {
      reorderDatabases(fromIdx, toIdx)
    }
  }

  const handleHideFieldDragEnd = (event: DragEndEvent) => {
    setActiveHideFieldId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIdx = displayFields.findIndex(f => f === active.id)
    const toIdx = displayFields.findIndex(f => f === over.id)
    if (fromIdx !== -1 && toIdx !== -1) {
      setColumnOrder(arrayMove(displayFields, fromIdx, toIdx))
    }
  }

  // Shortcut to open search (Cmd+F / Ctrl+F)
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      const isCmdF = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f'
      if (isCmdF) {
        e.preventDefault()
        const input = document.getElementById('global-search-input') as HTMLInputElement | null
        if (input) {
          input.focus()
          input.select()
        }
      }
    }
    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])

  // Dialog States
  const [dbDialog, setDbDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; id?: string; name: string }>({ open: false, mode: 'create', name: '' })
  const [csvWizardOpen, setCsvWizardOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [hideOpen, setHideOpen] = useState(false)
  const [rowHeightOpen, setRowHeightOpen] = useState(false)
  const [wsDialog, setWsDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; id?: string; name: string; icon?: string }>({ open: false, mode: 'create', name: '' })
  const [viewDialog, setViewDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; id?: string; name: string; icon?: string, type?: 'grid' | 'cards' | 'dashboard' }>({ open: false, mode: 'create', name: '', type: 'grid' })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [entityToDelete, setEntityToDelete] = useState<{ type: 'db' | 'ws' | 'view', id: string, name?: string } | null>(null)

  const activeDb = databases.find(db => db.id === activeDatabaseId)
  const activeWs = workspaces.find(w => w.id === activeWorkspaceId)
  const activeView = views.find(v => v.id === activeViewId)

  const filteredDatabases = useMemo(() => 
    databases.filter(db => db.name.toLowerCase().includes(menuSearch.toLowerCase())), 
    [databases, menuSearch]
  )
  const filteredWorkspaces = useMemo(() => 
    workspaces.filter(ws => ws.name.toLowerCase().includes(menuSearch.toLowerCase())), 
    [workspaces, menuSearch]
  )
  const filteredViews = useMemo(() => 
    views.filter(v => v.name.toLowerCase().includes(menuSearch.toLowerCase())), 
    [views, menuSearch]
  )

  const handleSaveDb = async () => {
    if (!dbDialog.name.trim()) return
    if (dbDialog.mode === 'create') {
      const newDbId = crypto.randomUUID()
      try {
        const createRes = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_table',
            table_id: newDbId,
            name: dbDialog.name
          })
        })
        if (!createRes.ok) throw new Error('Failed to create table in backend')
        addDatabase(dbDialog.name, false, newDbId)
        const { toast } = await import('sonner')
        toast.success(`Database "${dbDialog.name}" created successfully!`)
      } catch (err) {
        console.error(err)
        const { toast } = await import('sonner')
        toast.error('Failed to create database on server. Added locally.')
        addDatabase(dbDialog.name, false, newDbId)
      }
    } else if (dbDialog.mode === 'edit' && dbDialog.id) {
      renameDatabase(dbDialog.id, dbDialog.name)
      const { toast } = await import('sonner')
      toast.success('Database renamed successfully!')
    }
    setDbDialog({ open: false, mode: 'create', name: '' })
  }

  const handleSaveWorkspace = () => {
    if (!wsDialog.name.trim()) return
    if (wsDialog.mode === 'create') {
      addWorkspace(wsDialog.name, wsDialog.icon)
    } else if (wsDialog.id) {
      renameWorkspace(wsDialog.id, wsDialog.name, wsDialog.icon)
    }
    setWsDialog({ open: false, mode: 'create', name: '' })
  }

  const handleSaveView = () => {
    if (!viewDialog.name.trim()) return
    if (viewDialog.mode === 'create') {
      addView(viewDialog.name, viewDialog.icon, viewDialog.type)
    } else if (viewDialog.id) {
      renameView(viewDialog.id, viewDialog.name, viewDialog.icon)
    }
    setViewDialog({ open: false, mode: 'create', name: '', type: 'grid' })
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleWsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIdx = workspaces.findIndex(w => w.id === active.id)
    const toIdx = workspaces.findIndex(w => w.id === over.id)
    if (fromIdx !== -1 && toIdx !== -1) reorderWorkspaces(fromIdx, toIdx)
  }

  const handleViewDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIdx = views.findIndex(v => v.id === active.id)
    const toIdx = views.findIndex(v => v.id === over.id)
    if (fromIdx !== -1 && toIdx !== -1) reorderViews(fromIdx, toIdx)
  }

  return (
    <div className="flex flex-col shrink-0 border-b border-border relative z-40">
      <div className="flex items-center h-12 md:h-11 px-3 md:px-4 bg-background text-sm select-none gap-2 border-b border-border relative">
        
        {/* Mobile Menu Trigger */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-9 w-9" 
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Database & Workspace - Desktop */}
        <div className="hidden md:flex items-center space-x-2 mr-2">
          {/* Database Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 font-medium px-2 bg-muted/30 border border-border rounded-md hover:bg-muted max-w-[200px] truncate flex items-center gap-2')}>
              <Database className="w-4 h-4 text-primary" />
              {activeDb?.name || 'Database'}
              <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Databases</h4>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDbDragEnd}>
                <SortableContext items={databases.map(db => db.id)} strategy={verticalListSortingStrategy}>
                  {databases.map(db => (
                    <SortableDatabaseItem
                      key={db.id}
                      db={db}
                      isActive={db.id === activeDatabaseId}
                      onSelect={() => setActiveDatabaseId(db.id)}
                      onEdit={() => setDbDialog({ open: true, mode: 'edit', id: db.id, name: db.name })}
                      onDelete={() => { setEntityToDelete({ type: 'db', id: db.id, name: db.name }); setDeleteConfirmOpen(true); }}
                      canDelete={databases.length > 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <div className="h-px bg-border my-1" />
              <div
                className="flex items-center px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer text-muted-foreground text-sm"
                onClick={() => setDbDialog({ open: true, mode: 'create', name: '' })}
              >
                <Plus className="w-3 h-3 mr-2" /> New Blank Database
              </div>
              <div
                className="flex items-center px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer text-muted-foreground text-sm"
                onClick={() => setCsvWizardOpen(true)}
              >
                <Download className="w-3 h-3 mr-2" /> Import CSV Database
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Workspace Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 font-medium px-2 bg-muted/30 border border-border rounded-md hover:bg-muted max-w-[200px] truncate flex items-center gap-2')}>
              <RenderIcon name={activeWs?.icon} className="w-4 h-4" />
              {activeWs?.name || 'Workspace'}
              <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 p-2">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Workspaces</h4>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWsDragEnd}>
                <SortableContext items={workspaces.map(w => w.id)} strategy={verticalListSortingStrategy}>
                  {workspaces.map(ws => (
                    <SortableWorkspaceItem
                      key={ws.id}
                      ws={ws}
                      isActive={ws.id === activeWorkspaceId}
                      onSelect={() => setActiveWorkspaceId(ws.id)}
                      onEdit={() => setWsDialog({ open: true, mode: 'edit', id: ws.id, name: ws.name, icon: ws.icon })}
                      onDelete={() => { setEntityToDelete({ type: 'ws', id: ws.id, name: ws.name }); setDeleteConfirmOpen(true); }}
                      canDelete={workspaces.length > 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <div className="h-px bg-border my-1" />
              <div
                className="flex items-center px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer text-muted-foreground text-sm"
                onClick={() => setWsDialog({ open: true, mode: 'create', name: '' })}
              >
                <Plus className="w-3 h-3 mr-2" /> New workspace
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active Database/View Label - Mobile */}
        <div className="flex-1 md:hidden flex items-center gap-2 truncate">
          <Database className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold truncate">{activeDb?.name}</span>
          <span className="text-muted-foreground/50 text-xs px-1.5 py-0.5 bg-muted rounded">
            {activeView?.name}
          </span>
        </div>

        {/* Desktop View Dropdown */}
        <div className="hidden md:flex items-center mr-4">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 px-2 bg-muted/30 border border-border rounded-md hover:bg-muted max-w-[200px] truncate flex items-center gap-2')}>
              <RenderIcon name={activeView?.icon} className="w-4 h-4" />
              {activeView?.name || 'View'} View
              <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 p-2">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Views</h4>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleViewDragEnd}>
                <SortableContext items={views.map(v => v.id)} strategy={verticalListSortingStrategy}>
                  {views.map(v => (
                    <SortableViewItem
                      key={v.id}
                      view={v}
                      isActive={v.id === activeViewId}
                      onSelect={() => setActiveViewId(v.id)}
                      onEdit={() => setViewDialog({ open: true, mode: 'edit', id: v.id, name: v.name, icon: v.icon })}
                      onDelete={() => { setEntityToDelete({ type: 'view', id: v.id, name: v.name }); setDeleteConfirmOpen(true); }}
                      canDelete={views.length > 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <div className="h-px bg-border my-1" />
              <div
                className="flex items-center px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer text-muted-foreground text-sm"
                onClick={() => setViewDialog({ open: true, mode: 'create', name: '' })}
              >
                <Plus className="w-3 h-3 mr-2" /> New view
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 hidden md:block" />

        {/* Right side actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Mobile Search Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-9 w-9" 
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-9 md:h-8 px-2 md:px-3 text-muted-foreground hover:text-foreground bg-muted/30 border border-border rounded-md hover:bg-muted flex items-center')}>
              <Settings2 className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Tools</span>
              <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-2">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">View Settings</h4>
              <DropdownMenuItem onClick={() => setFilterOpen(true)} className="cursor-pointer">
                <Filter className="w-4 h-4 mr-2" /> Filter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOpen(true)} className="cursor-pointer">
                <ArrowUpDown className="w-4 h-4 mr-2" /> Sort
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setHideOpen(true)} className="cursor-pointer">
                <EyeOff className="w-4 h-4 mr-2" /> Hide fields
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRowHeightOpen(true)} className="cursor-pointer">
                <LayoutTemplate className="w-4 h-4 mr-2" /> Row height
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Preferences</h4>
              <div className="px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Palette className="w-4 h-4 opacity-70" />
                  <span>Alternate coloring</span>
                </div>
                <Switch checked={alternateColoring} onCheckedChange={setAlternateColoring} />
              </div>
              <div className="px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="w-4 h-4 opacity-70" />
                  <span>Show local time</span>
                </div>
                <Switch checked={showTimeAndDate} onCheckedChange={setShowTimeAndDate} />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop Search */}
          <div className="hidden md:flex relative group/search">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
             <Input
              id="global-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 w-[150px] lg:w-[200px] pl-8 text-sm bg-muted/30 border-transparent hover:bg-muted/50 focus:bg-background focus:border-primary transition-all duration-200"
            />
          </div>

          <div className="h-4 w-[1px] bg-border mx-1 hidden md:block" />

          {/* Export */}
          <button
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-9 md:h-8 px-2 text-muted-foreground hover:text-foreground')}
            onClick={() => window.dispatchEvent(new CustomEvent('export-csv'))}
            title="Export to CSV"
          >
            <Download className="w-5 h-5 md:w-4 md:h-4" />
          </button>

          {/* Theme Picker */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'h-9 md:h-8 w-9 md:w-8 text-muted-foreground hover:text-foreground transition-colors'
              )}
              title="Change theme"
            >
              <Palette className="w-5 h-5 md:w-4 md:h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3 max-h-[80vh] overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Themes</p>
              <div className="space-y-0.5">
                {THEMES.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setTheme(t.name)}
                    className={cn(
                      'flex items-center gap-3 w-full px-2 py-2 rounded-md text-sm transition-colors',
                      theme === t.name ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <div className="flex gap-1 shrink-0">
                      {t.preview.map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="flex-1 text-left">{t.label}</span>
                    {theme === t.name && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Saved Views Pills Bar */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 bg-muted/10 border-b border-border/60 overflow-x-auto scrollbar-none select-none">
        {views.map((v) => {
          const isActive = v.id === activeViewId
          return (
            <button
              key={v.id}
              onClick={() => setActiveViewId(v.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 shrink-0 shadow-sm",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-primary/10"
                  : "bg-background text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/40"
              )}
            >
              <RenderIcon name={v.icon} className="w-3.5 h-3.5" />
              <span>{v.name}</span>
            </button>
          )
        })}
        
        {/* Create new view shortcut pill */}
        <button
          onClick={() => setViewDialog({ open: true, mode: 'create', name: '', type: 'grid' })}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-border/80 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New view</span>
        </button>
      </div>

      {/* Mobile Search Bar - Expands below main header */}
      {mobileSearchOpen && (
        <div className="md:hidden flex items-center p-2 bg-muted/20 border-b border-border animate-in slide-in-from-top-2 duration-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="h-10 pl-9 text-base bg-background border-border shadow-inner"
            />
          </div>
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => { setSearchQuery(''); setMobileSearchOpen(false); }}>
            Cancel
          </Button>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="p-0 sm:max-w-xs h-full top-0 left-0 translate-x-0 translate-y-0 flex flex-col rounded-none border-r border-border bg-background duration-300" showCloseButton={false}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg">Phorzen Sales</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Search menus..."
                className="h-9 pl-9 text-sm bg-background border-border"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            {/* Databases section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Databases</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setMobileMenuOpen(false); setDbDialog({ open: true, mode: 'create', name: '' }); }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {filteredDatabases.map(db => (
                  <div
                    key={db.id}
                    onClick={() => { setActiveDatabaseId(db.id); setMobileMenuOpen(false); }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer",
                      db.id === activeDatabaseId ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 opacity-70" />
                      <span className="font-medium">{db.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workspaces section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Workspaces</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setMobileMenuOpen(false); setWsDialog({ open: true, mode: 'create', name: '' }); }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {filteredWorkspaces.map(ws => (
                  <div
                    key={ws.id}
                    onClick={() => { setActiveWorkspaceId(ws.id); setMobileMenuOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
                      ws.id === activeWorkspaceId ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <RenderIcon name={ws.icon} className="w-5 h-5" />
                    <span className="font-medium">{ws.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Views section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Views</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setMobileMenuOpen(false); setViewDialog({ open: true, mode: 'create', name: '' }); }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {filteredViews.map(v => (
                  <div
                    key={v.id}
                    onClick={() => { setActiveViewId(v.id); setMobileMenuOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
                      v.id === activeViewId ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <RenderIcon name={v.icon} className="w-5 h-5" />
                    <span className="font-medium">{v.name} View</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-muted/20 mt-auto">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 rounded-xl"
              onClick={() => { setMobileMenuOpen(false); setCsvWizardOpen(true); }}
            >
              <Download className="w-5 h-5" />
              Import CSV Database
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popovers for Tools */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger className="absolute top-10 left-0 w-0 h-0 opacity-0 pointer-events-none" />
        <PopoverContent className="w-[95vw] md:w-[600px] p-0 overflow-hidden bg-background max-h-[80vh] overflow-y-auto" align="start">
          <div className="p-4"><FilterBuilder /></div>
        </PopoverContent>
      </Popover>

      <Popover open={sortOpen} onOpenChange={setSortOpen}>
        <PopoverTrigger className="absolute top-10 left-0 w-0 h-0 opacity-0 pointer-events-none" />
        <PopoverContent className="w-[95vw] md:w-[450px] p-0 overflow-hidden bg-background max-h-[80vh] overflow-y-auto" align="start">
          <div className="p-4"><SortBuilder /></div>
        </PopoverContent>
      </Popover>

      <Popover open={hideOpen} onOpenChange={setHideOpen}>
        <PopoverTrigger className="absolute top-10 left-0 w-0 h-0 opacity-0 pointer-events-none" />
        <PopoverContent className="w-[95vw] md:w-64 p-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto" align="start">
          <div className="font-medium text-sm">Hide fields</div>
          <div className="relative mb-1">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={hideFieldSearch}
              onChange={(e) => setHideFieldSearch(e.target.value)}
              placeholder="Find a field..."
              className="h-8 pl-7 text-xs bg-muted/30"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">Visible fields</h4>
              <div className="flex gap-2">
                <button onClick={() => setHiddenColumns(availableFields)} className="text-[10px] text-muted-foreground hover:text-foreground">Hide all</button>
                <button onClick={() => setHiddenColumns([])} className="text-[10px] text-muted-foreground hover:text-foreground">Show all</button>
              </div>
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveHideFieldId(e.active.id as string)}
                onDragEnd={handleHideFieldDragEnd}
              >
                <SortableContext items={displayFields} strategy={verticalListSortingStrategy}>
                  {displayFields.filter(f => f.toLowerCase().includes(hideFieldSearch.toLowerCase())).map(field => (
                    <SortableFieldItem
                      key={field}
                      field={field}
                      isHidden={hiddenColumns.includes(field)}
                      onToggle={() => toggleHiddenColumn(field)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={rowHeightOpen} onOpenChange={setRowHeightOpen}>
        <PopoverTrigger className="absolute top-10 left-0 w-0 h-0 opacity-0 pointer-events-none" />
        <PopoverContent className="w-64 p-4 flex flex-col gap-4" align="start">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm text-foreground">Row height</div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{rowHeight}px</span>
          </div>
          <Slider
            value={[rowHeight]}
            min={24}
            max={120}
            step={4}
            onValueChange={(val) => {
              if (Array.isArray(val)) {
                setRowHeight(val[0])
              } else if (typeof val === 'number') {
                setRowHeight(val)
              }
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            <span>Short</span>
            <span>Tall</span>
          </div>
        </PopoverContent>
      </Popover>

      {/* Shared Dialogs */}
      <Dialog open={dbDialog.open} onOpenChange={(open) => setDbDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dbDialog.mode === 'create' ? 'Create New Database' : 'Rename Database'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={dbDialog.name}
              onChange={(e) => setDbDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Database name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDbDialog({ open: false, mode: 'create', name: '' })}>Cancel</Button>
            <Button onClick={handleSaveDb}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wsDialog.open} onOpenChange={(open) => setWsDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{wsDialog.mode === 'create' ? 'Create New Workspace' : 'Rename Workspace'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              value={wsDialog.name}
              onChange={(e) => setWsDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Workspace name"
              autoFocus
            />
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Icon</label>
              <IconPicker selected={wsDialog.icon as IconName} onSelect={(icon) => setWsDialog(prev => ({ ...prev, icon }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWsDialog({ open: false, mode: 'create', name: '' })}>Cancel</Button>
            <Button onClick={handleSaveWorkspace}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewDialog.mode === 'create' ? 'Create New View' : 'Rename View'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              value={viewDialog.name}
              onChange={(e) => setViewDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder="View name"
              autoFocus
            />
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Icon</label>
              <IconPicker selected={viewDialog.icon as IconName} onSelect={(icon) => setViewDialog(prev => ({ ...prev, icon }))} />
            </div>
            {viewDialog.mode === 'create' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">View Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['grid', 'cards', 'dashboard'] as const).map(type => (
                    <Button 
                      key={type}
                      variant={viewDialog.type === type ? 'default' : 'outline'}
                      className="capitalize"
                      onClick={() => setViewDialog(prev => ({ ...prev, type }))}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog({ open: false, mode: 'create', name: '', type: 'grid' })}>Cancel</Button>
            <Button onClick={handleSaveView}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {entityToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (entityToDelete?.type === 'db') deleteDatabase(entityToDelete.id)
              if (entityToDelete?.type === 'ws') deleteWorkspace(entityToDelete.id)
              if (entityToDelete?.type === 'view') deleteView(entityToDelete.id)
              setDeleteConfirmOpen(false)
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportWizard open={csvWizardOpen} onOpenChange={setCsvWizardOpen} />
    </div>
  )
}
