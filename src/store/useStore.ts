import { create } from 'zustand'

export type FilterOperator = 'contains' | 'is' | 'is not' | 'is not empty' | 'is empty'

export interface FilterRule {
  id: string
  field: string
  operator: FilterOperator
  value: string
  combinator: 'and' | 'or' 
}

export interface SortRule {
  id: string
  field: string
  direction: 'asc' | 'desc'
}

export interface CellUpdate {
  rowId: string
  rowIdKey: string // usually 'id' or 'Lead ID' or 'lead_id'
  columnId: string
  oldValue: any
  newValue: any
}

export interface HistoryAction {
  id: string
  updates: CellUpdate[]
}

export interface Database { 
  id: string
  name: string
  is_legacy?: boolean 
}

export interface Workspace { id: string, name: string, icon?: string }
export type ViewType = 'grid' | 'cards' | 'dashboard'
export interface View { id: string, name: string, icon?: string, type?: ViewType }

export type WidgetType = 'stat' | 'bar' | 'pie' | 'line' | 'donut'
export type AggregationType = 'sum' | 'count' | 'average' | 'min' | 'max' | 'count_non_empty'

export interface WidgetCondition {
  id: string
  field: string
  operator: 'is_not_empty' | 'is_empty' | 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'gte' | 'lte'
  value?: string
}

export interface WidgetConfig {
  id: string
  name: string
  type: WidgetType
  // For stat widgets
  aggregation?: AggregationType
  aggregationField?: string // field to sum/average
  conditions?: WidgetCondition[]
  conditionCombinator?: 'and' | 'or'
  prefix?: string // e.g. '$'
  suffix?: string
  // For chart widgets
  groupByField?: string // x-axis / slices
  valueField?: string // what to measure
  valueAggregation?: AggregationType
  chartColors?: string[]
  // Layout (react-grid-layout)
  layout?: { x: number; y: number; w: number; h: number }
}

export interface ViewConfig {
  columnOrder: string[]
  filters: FilterRule[]
  sorts: SortRule[]
  frozenColumns: string[]
  hiddenColumns: string[]
  searchQuery: string
  alternateColoring?: boolean
  showTimeAndDate?: boolean
  rowHeight: number
  columnSizing: Record<string, number>
  fieldTypeOverrides: Record<string, string>
}

const DEFAULT_VIEW_CONFIG: ViewConfig = {
  columnOrder: [],
  filters: [],
  sorts: [],
  frozenColumns: [],
  hiddenColumns: [],
  searchQuery: '',
  alternateColoring: false,
  showTimeAndDate: false,
  rowHeight: 36,
  columnSizing: {},
  fieldTypeOverrides: {}
}

interface AppState {
  dashboardWidgets: Record<string, WidgetConfig[]> // viewId -> widgets
  databases: Database[]
  databaseWorkspaces: Record<string, Workspace[]>
  workspaceViews: Record<string, View[]>
  viewConfigs: Record<string, ViewConfig>
  
  workspaces: Workspace[] // derived for current database
  views: View[] // derived for current workspace
  
  activeDatabaseId: string
  activeWorkspaceId: string
  activeViewId: string
  
  hydrateState: (state: Partial<AppState>) => void
  
  setActiveDatabaseId: (id: string) => void
  addDatabase: (name: string, is_legacy?: boolean, forcedId?: string, initialColumnOrder?: string[]) => void
  renameDatabase: (id: string, name: string) => void
  deleteDatabase: (id: string) => void

  setWorkspaces: (ws: Workspace[]) => void
  setViews: (vs: View[]) => void
  setActiveWorkspaceId: (id: string) => void
  setActiveViewId: (id: string) => void
  
  addWorkspace: (name: string, icon?: string) => void
  renameWorkspace: (id: string, name: string, icon?: string) => void
  deleteWorkspace: (id: string) => void
  
  addView: (name: string, icon?: string, type?: ViewType) => void
  getDashboardWidgets: (viewId: string) => WidgetConfig[]
  setDashboardWidgets: (viewId: string, widgets: WidgetConfig[]) => void
  addDashboardWidget: (viewId: string, widget: WidgetConfig) => void
  updateDashboardWidget: (viewId: string, widgetId: string, updates: Partial<WidgetConfig>) => void
  deleteDashboardWidget: (viewId: string, widgetId: string) => void
  renameView: (id: string, name: string, icon?: string) => void
  deleteView: (id: string) => void
  reorderDatabases: (from: number, to: number) => void
  reorderWorkspaces: (from: number, to: number) => void
  reorderViews: (from: number, to: number) => void

  columnOrder: string[]
  setColumnOrder: (order: string[]) => void
  
  filters: FilterRule[]
  setFilters: (filters: FilterRule[]) => void
  addFilter: (filter: FilterRule) => void
  removeFilter: (id: string) => void
  updateFilter: (id: string, updates: Partial<FilterRule>) => void

  sorts: SortRule[]
  setSorts: (sorts: SortRule[]) => void
  addSort: (sort: SortRule) => void
  removeSort: (id: string) => void
  updateSort: (id: string, updates: Partial<SortRule>) => void

  dataVersion: number
  incrementDataVersion: () => void

  frozenColumns: string[]
  setFrozenColumns: (cols: string[]) => void
  toggleFrozenColumn: (col: string) => void

  rowHeight: number
  setRowHeight: (height: number) => void

  hiddenColumns: string[]
  setHiddenColumns: (cols: string[]) => void
  toggleHiddenColumn: (col: string) => void

  availableFields: string[]
  setAvailableFields: (fields: string[]) => void

  uniqueValuesByColumn: Record<string, string[]>
  setUniqueValuesByColumn: (map: Record<string, string[]>) => void

  columnSizing: Record<string, number>
  setColumnSizing: (sizing: Record<string, number>) => void

  fieldTypeOverrides: Record<string, string>
  setFieldTypeOverride: (column: string, type: string) => void
  clearFieldTypeOverride: (column: string) => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  alternateColoring: boolean
  setAlternateColoring: (val: boolean) => void

  showTimeAndDate: boolean
  setShowTimeAndDate: (val: boolean) => void

  // History
  undoStack: HistoryAction[]
  redoStack: HistoryAction[]
  pushHistory: (action: Omit<HistoryAction, 'id'>) => void
  popUndo: () => HistoryAction | null
  popRedo: () => HistoryAction | null
  clearHistory: () => void
}

const initialDbId = 'db-legacy'
const initialWorkspaceId = 'w-1'
const secondWorkspaceId = 'w-2'
const initialViewId = 'v-1'
const initialViews = [{ id: 'v-1', name: 'Grid' }, { id: 'v-2', name: 'Follow up' }]
const sharehViews = [{ id: 'v-3', name: 'Grid' }]

export const useStore = create<AppState>((set, get) => ({
  databases: [{ id: initialDbId, name: 'Main Database', is_legacy: true }],
  databaseWorkspaces: {
    [initialDbId]: [
      { id: initialWorkspaceId, name: 'Saad' },
      { id: secondWorkspaceId, name: 'shareh' }
    ]
  },
  workspaceViews: { 
    [initialWorkspaceId]: initialViews,
    [secondWorkspaceId]: sharehViews
  },
  viewConfigs: { [initialViewId]: DEFAULT_VIEW_CONFIG, 'v-3': DEFAULT_VIEW_CONFIG },
  dashboardWidgets: {},

  
  workspaces: [
    { id: initialWorkspaceId, name: 'Saad' },
    { id: secondWorkspaceId, name: 'shareh' }
  ],
  views: initialViews,
  
  activeDatabaseId: initialDbId,
  activeWorkspaceId: initialWorkspaceId,
  activeViewId: initialViewId,
  
  hydrateState: (newState) => set((state) => {
    let dbs = newState.databases || state.databases
    let dbWs = newState.databaseWorkspaces || state.databaseWorkspaces
    
    // Migration for older states that didn't have databases
    if (!newState.databases || newState.databases.length === 0) {
      dbs = [{ id: initialDbId, name: 'Main Database', is_legacy: true }]
      dbWs = { [initialDbId]: newState.workspaces || state.workspaces }
      newState.activeDatabaseId = initialDbId
    }

    const activeDbId = newState.activeDatabaseId || state.activeDatabaseId || dbs[0]?.id
    const currentWorkspaces = dbWs[activeDbId] || []
    const activeWsId = newState.activeWorkspaceId || currentWorkspaces[0]?.id || ''
    
    const wViews = newState.workspaceViews || state.workspaceViews
    const currentViews = wViews[activeWsId] || []
    
    return { 
      ...state, 
      ...newState, 
      databases: dbs,
      databaseWorkspaces: dbWs,
      workspaces: currentWorkspaces,
      activeDatabaseId: activeDbId,
      activeWorkspaceId: activeWsId,
      views: currentViews
    }
  }),
  
  setActiveDatabaseId: (id) => set((state) => {
    const wss = state.databaseWorkspaces[id] || []
    const firstWs = wss[0]
    
    if (!firstWs) {
      // Empty database, let's create a default workspace and view
      const newWsId = `w-${Date.now()}`
      const newWs = { id: newWsId, name: 'Default Workspace' }
      const newViewId = `v-${Date.now()}`
      const newView: View = { id: newViewId, name: 'Grid', type: 'grid' }
      
      return {
        activeDatabaseId: id,
        databaseWorkspaces: { ...state.databaseWorkspaces, [id]: [newWs] },
        workspaces: [newWs],
        activeWorkspaceId: newWsId,
        workspaceViews: { ...state.workspaceViews, [newWsId]: [newView] },
        views: [newView],
        activeViewId: newViewId,
        viewConfigs: { ...state.viewConfigs, [newViewId]: DEFAULT_VIEW_CONFIG },
        ...DEFAULT_VIEW_CONFIG
      }
    }
    
    const viewsForWs = state.workspaceViews[firstWs.id] || [{ id: `v-${Date.now()}`, name: 'Grid', type: 'grid' }]
    const firstView = viewsForWs[0]
    const nextConfig = state.viewConfigs[firstView.id] || DEFAULT_VIEW_CONFIG
    
    return {
      activeDatabaseId: id,
      workspaces: wss,
      activeWorkspaceId: firstWs.id,
      views: viewsForWs,
      workspaceViews: { ...state.workspaceViews, [firstWs.id]: viewsForWs },
      activeViewId: firstView.id,
      ...nextConfig
    }
  }),

  addDatabase: (name, is_legacy, forcedId, initialColumnOrder) => set((state) => {
    const newDbId = forcedId || crypto.randomUUID()
    const newDb = { id: newDbId, name, is_legacy }
    const newWsId = crypto.randomUUID()
    const newWs = { id: newWsId, name: 'Default Workspace' }
    const newViewId = crypto.randomUUID()
    const newView: View = { id: newViewId, name: 'Grid', type: 'grid' }
    
    const config = { ...DEFAULT_VIEW_CONFIG }
    if (initialColumnOrder) {
      config.columnOrder = initialColumnOrder
    }
    
    return {
      databases: [...state.databases, newDb],
      activeDatabaseId: newDb.id,
      databaseWorkspaces: { ...state.databaseWorkspaces, [newDb.id]: [newWs] },
      workspaces: [newWs],
      activeWorkspaceId: newWsId,
      workspaceViews: { ...state.workspaceViews, [newWsId]: [newView] },
      views: [newView],
      activeViewId: newViewId,
      viewConfigs: { ...state.viewConfigs, [newViewId]: config },
      ...config
    }
  }),

  renameDatabase: (id, name) => set((state) => ({
    databases: state.databases.map(db => db.id === id ? { ...db, name } : db)
  })),
  reorderDatabases: (from, to) => set((state) => {
    const dbs = [...state.databases]
    const [moved] = dbs.splice(from, 1)
    dbs.splice(to, 0, moved)
    return { databases: dbs }
  }),

  deleteDatabase: (id) => set((state) => {
    const dbs = state.databases.filter(db => db.id !== id)
    if (dbs.length === 0) return state // don't delete the last db
    
    const nextActiveId = state.activeDatabaseId === id ? dbs[0].id : state.activeDatabaseId
    
    // Trigger setActiveDatabaseId logic manually for the next DB
    const wss = state.databaseWorkspaces[nextActiveId] || []
    const firstWs = wss[0]
    const viewsForWs = firstWs ? (state.workspaceViews[firstWs.id] || []) : []
    const firstView = viewsForWs[0]
    const nextConfig = firstView ? (state.viewConfigs[firstView.id] || DEFAULT_VIEW_CONFIG) : DEFAULT_VIEW_CONFIG

    return { 
      databases: dbs, 
      activeDatabaseId: nextActiveId,
      workspaces: wss,
      activeWorkspaceId: firstWs?.id || '',
      views: viewsForWs,
      activeViewId: firstView?.id || '',
      ...nextConfig
    }
  }),
  
  setWorkspaces: (ws) => set((state) => ({ 
    workspaces: ws,
    databaseWorkspaces: { ...state.databaseWorkspaces, [state.activeDatabaseId]: ws }
  })),
  setViews: (vs) => set((state) => ({ 
    views: vs,
    workspaceViews: { ...state.workspaceViews, [state.activeWorkspaceId]: vs }
  })),
  
  setActiveWorkspaceId: (id) => set((state) => {
    const viewsForWs = state.workspaceViews[id] || [{ id: `v-${Date.now()}`, name: 'Grid', type: 'grid' }]
    const firstView = viewsForWs[0]
    const nextConfig = state.viewConfigs[firstView.id] || DEFAULT_VIEW_CONFIG
    return {
      activeWorkspaceId: id,
      views: viewsForWs,
      workspaceViews: { ...state.workspaceViews, [id]: viewsForWs },
      activeViewId: firstView.id,
      ...nextConfig
    }
  }),
  
  setActiveViewId: (id) => set((state) => {
    const nextConfig = state.viewConfigs[id] || DEFAULT_VIEW_CONFIG
    return {
      activeViewId: id,
      ...nextConfig
    }
  }),

  addWorkspace: (name, icon) => set((state) => {
    const newWs = { id: `w-${Date.now()}`, name, icon }
    const newWorkspaces = [...state.workspaces, newWs]
    return { 
      workspaces: newWorkspaces, 
      databaseWorkspaces: { ...state.databaseWorkspaces, [state.activeDatabaseId]: newWorkspaces },
      activeWorkspaceId: newWs.id 
    }
  }),
  renameWorkspace: (id, name, icon) => set((state) => {
    const newWs = state.workspaces.map(w => w.id === id ? { ...w, name, icon: icon !== undefined ? icon : w.icon } : w)
    return {
      workspaces: newWs,
      databaseWorkspaces: { ...state.databaseWorkspaces, [state.activeDatabaseId]: newWs }
    }
  }),
  deleteWorkspace: (id) => set((state) => {
    const ws = state.workspaces.filter(w => w.id !== id)
    const nextActiveId = state.activeWorkspaceId === id ? (ws[0]?.id || '') : state.activeWorkspaceId
    
    // trigger workspace switch
    const viewsForWs = state.workspaceViews[nextActiveId] || []
    const firstView = viewsForWs[0]
    const nextConfig = firstView ? (state.viewConfigs[firstView.id] || DEFAULT_VIEW_CONFIG) : DEFAULT_VIEW_CONFIG

    return { 
      workspaces: ws, 
      databaseWorkspaces: { ...state.databaseWorkspaces, [state.activeDatabaseId]: ws },
      activeWorkspaceId: nextActiveId,
      views: viewsForWs,
      activeViewId: firstView?.id || '',
      ...nextConfig
    }
  }),
  reorderWorkspaces: (from, to) => set((state) => {
    const ws = [...state.workspaces]
    const [moved] = ws.splice(from, 1)
    ws.splice(to, 0, moved)
    return { 
      workspaces: ws,
      databaseWorkspaces: { ...state.databaseWorkspaces, [state.activeDatabaseId]: ws }
    }
  }),

  addView: (name, icon, type) => set((state) => {
    const newView: View = { id: `v-${Date.now()}`, name, icon, type: type || 'grid' }
    const newViews = [...state.views, newView]
    
    // Inherit config from current active view if it exists
    const currentConfig = state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG
    const newConfig = { 
      ...DEFAULT_VIEW_CONFIG, 
      columnOrder: [...currentConfig.columnOrder],
      frozenColumns: [...currentConfig.frozenColumns],
      hiddenColumns: [...currentConfig.hiddenColumns],
      rowHeight: currentConfig.rowHeight,
      columnSizing: { ...currentConfig.columnSizing }
    }

    return { 
      views: newViews, 
      workspaceViews: { ...state.workspaceViews, [state.activeWorkspaceId]: newViews },
      activeViewId: newView.id,
      viewConfigs: { ...state.viewConfigs, [newView.id]: newConfig },
      ...newConfig
    }
  }),
  renameView: (id, name, icon) => set((state) => {
    const newViews = state.views.map(v => v.id === id ? { ...v, name, icon: icon !== undefined ? icon : v.icon } : v)
    return {
      views: newViews,
      workspaceViews: { ...state.workspaceViews, [state.activeWorkspaceId]: newViews }
    }
  }),
  deleteView: (id) => set((state) => {
    const newViews = state.views.filter(v => v.id !== id)
    if (newViews.length === 0) newViews.push({ id: `v-${Date.now()}`, name: 'Grid', type: 'grid' })
    const nextActiveId = state.activeViewId === id ? newViews[0].id : state.activeViewId
    const nextConfig = state.viewConfigs[nextActiveId] || DEFAULT_VIEW_CONFIG
    return { 
      views: newViews, 
      workspaceViews: { ...state.workspaceViews, [state.activeWorkspaceId]: newViews },
      activeViewId: nextActiveId,
      ...(state.activeViewId === id ? nextConfig : {})
    }
  }),
  reorderViews: (from, to) => set((state) => {
    const vs = [...state.views]
    const [moved] = vs.splice(from, 1)
    vs.splice(to, 0, moved)
    return { 
      views: vs,
      workspaceViews: { ...state.workspaceViews, [state.activeWorkspaceId]: vs }
    }
  }),

  getDashboardWidgets: (viewId) => get().dashboardWidgets[viewId] || [],
  setDashboardWidgets: (viewId, widgets) => set((state) => ({
    dashboardWidgets: { ...state.dashboardWidgets, [viewId]: widgets }
  })),
  addDashboardWidget: (viewId, widget) => set((state) => {
    const existing = state.dashboardWidgets[viewId] || []
    return { dashboardWidgets: { ...state.dashboardWidgets, [viewId]: [...existing, widget] } }
  }),
  updateDashboardWidget: (viewId, widgetId, updates) => set((state) => {
    const existing = state.dashboardWidgets[viewId] || []
    return { dashboardWidgets: { ...state.dashboardWidgets, [viewId]: existing.map(w => w.id === widgetId ? { ...w, ...updates } : w) } }
  }),
  deleteDashboardWidget: (viewId, widgetId) => set((state) => {
    const existing = state.dashboardWidgets[viewId] || []
    return { dashboardWidgets: { ...state.dashboardWidgets, [viewId]: existing.filter(w => w.id !== widgetId) } }
  }),

  columnOrder: [],
  setColumnOrder: (order) => set((state) => ({ 
    columnOrder: order,
    viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), columnOrder: order } }
  })),

  filters: [],
  setFilters: (filters) => set((state) => ({ 
    filters,
    viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), filters } }
  })),
  addFilter: (filter) => set((state) => {
    const newFilters = [...state.filters, filter]
    return { filters: newFilters, viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), filters: newFilters } } }
  }),
  removeFilter: (id) => set((state) => {
    const newFilters = state.filters.filter(f => f.id !== id)
    return { filters: newFilters, viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), filters: newFilters } } }
  }),
  updateFilter: (id, updates) => set((state) => {
    const newFilters = state.filters.map(f => f.id === id ? { ...f, ...updates } : f)
    return { filters: newFilters, viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), filters: newFilters } } }
  }),

  sorts: [],
  setSorts: (sorts) => set((state) => ({ 
    sorts,
    viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), sorts } }
  })),
  addSort: (sort) => set((state) => {
    const newSorts = [...state.sorts, sort]
    return { sorts: newSorts, viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), sorts: newSorts } } }
  }),
  removeSort: (id) => set((state) => {
    const newSorts = state.sorts.filter(s => s.id !== id)
    return { sorts: newSorts, viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), sorts: newSorts } } }
  }),
  updateSort: (id, updates) => set((state) => {
    const newSorts = state.sorts.map(s => s.id === id ? { ...s, ...updates } : s)
    return { sorts: newSorts, viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), sorts: newSorts } } }
  }),

  dataVersion: 0,
  incrementDataVersion: () => set(s => ({ dataVersion: s.dataVersion + 1 })),

  frozenColumns: [],
  setFrozenColumns: (cols) => set((state) => ({ 
    frozenColumns: cols,
    viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), frozenColumns: cols } }
  })),
  toggleFrozenColumn: (col) => set((state) => {
    const next = state.frozenColumns.includes(col) ? state.frozenColumns.filter(c => c !== col) : [...state.frozenColumns, col]
    return { frozenColumns: next, viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), frozenColumns: next } } }
  }),

  rowHeight: 36,
  setRowHeight: (height) => set((state) => ({ 
    rowHeight: height,
    viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), rowHeight: height } }
  })),

  hiddenColumns: [],
  setHiddenColumns: (cols) => set((state) => ({ 
    hiddenColumns: cols,
    viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), hiddenColumns: cols } }
  })),
  toggleHiddenColumn: (col) => set((state) => {
    const next = state.hiddenColumns.includes(col) ? state.hiddenColumns.filter(c => c !== col) : [...state.hiddenColumns, col]
    return { hiddenColumns: next, viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), hiddenColumns: next } } }
  }),

  availableFields: [],
  setAvailableFields: (fields) => set({ availableFields: fields }),

  uniqueValuesByColumn: {},
  setUniqueValuesByColumn: (map) => set({ uniqueValuesByColumn: map }),

  columnSizing: {},
  setColumnSizing: (sizing) => set({ columnSizing: sizing }),

  fieldTypeOverrides: {},
  setFieldTypeOverride: (column, type) => set((state) => ({
    fieldTypeOverrides: { ...state.fieldTypeOverrides, [column]: type }
  })),
  clearFieldTypeOverride: (column) => set((state) => {
    const next = { ...state.fieldTypeOverrides }
    delete next[column]
    return { fieldTypeOverrides: next }
  }),

  searchQuery: '',
  setSearchQuery: (query) => set((state) => ({ 
    searchQuery: query,
    viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), searchQuery: query } }
  })),

  alternateColoring: false,
  setAlternateColoring: (val) => set((state) => ({
    alternateColoring: val,
    viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), alternateColoring: val } }
  })),

  showTimeAndDate: false,
  setShowTimeAndDate: (val) => set((state) => ({
    showTimeAndDate: val,
    viewConfigs: { ...state.viewConfigs, [state.activeViewId]: { ...(state.viewConfigs[state.activeViewId] || DEFAULT_VIEW_CONFIG), showTimeAndDate: val } }
  })),

  undoStack: [],
  redoStack: [],
  pushHistory: (action) => set((state) => ({
    undoStack: [...state.undoStack, { ...action, id: `a-${Date.now()}` }],
    redoStack: []
  })),
  popUndo: () => {
    let actionToUndo = null
    set((state) => {
      if (state.undoStack.length === 0) return state
      const newUndo = [...state.undoStack]
      actionToUndo = newUndo.pop()!
      return { undoStack: newUndo, redoStack: [...state.redoStack, actionToUndo] }
    })
    return actionToUndo
  },
  popRedo: () => {
    let actionToRedo = null
    set((state) => {
      if (state.redoStack.length === 0) return state
      const newRedo = [...state.redoStack]
      actionToRedo = newRedo.pop()!
      return { redoStack: newRedo, undoStack: [...state.undoStack, actionToRedo] }
    })
    return actionToRedo
  },
  clearHistory: () => set({ undoStack: [], redoStack: [] })
}))
