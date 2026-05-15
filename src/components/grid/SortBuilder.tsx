import * as React from 'react'
import { useStore, SortRule } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Plus, X, ArrowDownAZ, ArrowUpAZ } from 'lucide-react'
import { FieldSelector } from '@/components/grid/FieldSelector'

export function SortBuilder() {
  const { sorts, addSort, removeSort, updateSort, availableFields } = useStore()

  const handleAddSort = () => {
    addSort({
      id: Math.random().toString(36).substr(2, 9),
      field: availableFields[0] || '',
      direction: 'asc'
    })
  }

  return (
    <div className="space-y-4 p-1">
      {sorts.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-4">No sorts applied to this view</p>
      ) : (
        <div className="space-y-2">
          {sorts.map((sort, index) => (
            <div key={sort.id} className="flex items-center gap-2 text-sm">
              <div className="w-16 shrink-0 text-muted-foreground text-xs font-medium">
                {index === 0 ? 'Sort by' : 'Then by'}
              </div>
              
              <FieldSelector
                fields={availableFields}
                value={sort.field}
                onChange={(val) => updateSort(sort.id, { field: val })}
                className="flex-1"
              />

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs w-[120px] justify-between border-border bg-background"
                onClick={() => updateSort(sort.id, { direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
              >
                {sort.direction === 'asc' ? (
                  <><ArrowDownAZ className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Ascending</>
                ) : (
                  <><ArrowUpAZ className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Descending</>
                )}
              </Button>

              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeSort(sort.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:bg-primary/10 w-fit" onClick={handleAddSort}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add sort
      </Button>
    </div>
  )
}
