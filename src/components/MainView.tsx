'use client'

import { useEffect, useState, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { Grid } from '@/components/Grid'
import { CardsView } from '@/components/CardsView'
import { DashboardView } from '@/components/DashboardView'

export function MainView() {
  const { activeViewId, views, hydrateState } = useStore()
  const activeView = views.find(v => v.id === activeViewId)
  
  const [isHydrated, setIsHydrated] = useState(false)
  const isHydrating = useRef(false)

  // 1. Fetch initial state on mount
  useEffect(() => {
    if (isHydrating.current) return
    isHydrating.current = true

    fetch('/api/state')
      .then(res => res.json())
      .then(data => {
        if (data.state) {
          hydrateState(data.state)
        }
      })
      .catch(err => console.error('Failed to load state:', err))
      .finally(() => {
        setIsHydrated(true)
      })
  }, [hydrateState])

  // 2. Sync state to DB on changes
  useEffect(() => {
    if (!isHydrated) return

    // Subscribe to store changes to save to DB
    const unsubscribe = useStore.subscribe((state, prevState) => {
      // Don't sync if these properties haven't changed (ignore dataVersion, history, etc)
      if (
        state.databases === prevState.databases &&
        state.databaseWorkspaces === prevState.databaseWorkspaces &&
        state.activeDatabaseId === prevState.activeDatabaseId &&
        state.workspaces === prevState.workspaces &&
        state.workspaceViews === prevState.workspaceViews &&
        state.viewConfigs === prevState.viewConfigs &&
        state.activeWorkspaceId === prevState.activeWorkspaceId &&
        state.activeViewId === prevState.activeViewId &&
        state.dashboardWidgets === prevState.dashboardWidgets
      ) {
        return
      }

      const stateToSave = {
        databases: state.databases,
        databaseWorkspaces: state.databaseWorkspaces,
        activeDatabaseId: state.activeDatabaseId,
        workspaces: state.workspaces,
        workspaceViews: state.workspaceViews,
        viewConfigs: state.viewConfigs,
        activeWorkspaceId: state.activeWorkspaceId,
        activeViewId: state.activeViewId,
        views: state.views,
        dashboardWidgets: state.dashboardWidgets,
      }

      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateToSave })
      }).catch(err => console.error('Failed to save state:', err))
    })

    return () => unsubscribe()
  }, [isHydrated])

  if (!isHydrated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground gap-3">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm">Loading workspace...</p>
      </div>
    )
  }

  if (activeView?.type === 'cards') {
    return <CardsView />
  }

  if (activeView?.type === 'dashboard') {
    return <DashboardView />
  }

  return <Grid />
}
