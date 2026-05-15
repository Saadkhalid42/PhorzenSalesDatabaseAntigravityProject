import * as React from 'react'
import { useStore, FilterRule, FilterOperator } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { FieldSelector } from '@/components/grid/FieldSelector'

const OPERATORS: FilterOperator[] = ['contains', 'is', 'is not empty', 'is empty']

export function FilterBuilder() {
  const { filters, addFilter, removeFilter, updateFilter, availableFields } = useStore()

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
                <input 
                  type="text"
                  placeholder="Value..."
                  className="h-8 flex-1 bg-background border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                />
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
