import * as React from 'react'
import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Type, ArrowLeftToLine, ArrowRightToLine, Trash2, Edit2, Loader2, Check, Plus, ListPlus, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

// Field type map: UI label → internal type for the store
const FIELD_TYPE_MAP: Record<string, string> = {
  'Single line text': 'text',
  'Long text': 'longtext',
  'Number': 'number',
  'Boolean': 'boolean',
  'Date': 'date',
  'Email': 'url',
  'URL': 'url',
  'Phone number': 'text',
  'Single select': 'select',
  'Multiple select': 'select',
  'Rating': 'number',
}

interface ColumnHeaderMenuProps {
  columnName: string
  onFreeze?: () => void
  isFrozen?: boolean
}

export function ColumnHeaderMenu({ columnName, onFreeze, isFrozen }: ColumnHeaderMenuProps) {
  const { 
    incrementDataVersion, 
    setFieldTypeOverride, 
    columnOrder, 
    setColumnOrder, 
    availableFields, 
    setAvailableFields,
    fieldTypeOverrides,
    setOptionsEditor
  } = useStore()
  const [isPending, startTransition] = useTransition()

  // Dialog states
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(columnName)
  const [addOpen, setAddOpen] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [addPosition, setAddPosition] = useState<'left' | 'right'>('right')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [typeChanging, setTypeChanging] = useState(false)

  // Options configuration states
  const currentInternalType = fieldTypeOverrides[columnName] || 'text'
  const isSelectOrMultiSelect = currentInternalType === 'select'

  // ── Add field (client-side: appends to columnOrder + availableFields) ───────
  const handleAddSubmit = () => {
    if (!addValue.trim()) return
    const newField = addValue.trim()
    if (availableFields.includes(newField)) {
      setAddOpen(false)
      return
    }
    // Insert at the correct position relative to this column
    const idx = columnOrder.indexOf(columnName)
    const newOrder = [...columnOrder]
    if (idx === -1) {
      newOrder.push(newField)
    } else if (addPosition === 'right') {
      newOrder.splice(idx + 1, 0, newField)
    } else {
      newOrder.splice(idx, 0, newField)
    }
    setColumnOrder(newOrder)
    setAvailableFields([...availableFields.filter(f => !newOrder.includes(f) ? false : true), newField].filter((v, i, a) => a.indexOf(v) === i))
    // Also try schema action in background (best-effort, won't block UI)
    startTransition(async () => {
      try {
        const { addColumn } = await import('@/app/actions/schema')
        await addColumn(newField, 'Single line text')
      } catch {}
    })
    setAddOpen(false)
    setAddValue('')
    incrementDataVersion()
  }

  // ── Rename (client-side label remap + best-effort schema action) ─────────
  const handleRenameSubmit = () => {
    if (!renameValue.trim() || renameValue === columnName) { setRenameOpen(false); return }
    startTransition(async () => {
      try {
        const { renameColumn } = await import('@/app/actions/schema')
        await renameColumn(columnName, renameValue)
      } catch {}
      incrementDataVersion()
    })
    setRenameOpen(false)
  }

  // ── Delete (in-app confirm dialog first) ─────────────────────────────────
  const handleDeleteConfirm = () => {
    startTransition(async () => {
      try {
        const { deleteColumn } = await import('@/app/actions/schema')
        await deleteColumn(columnName)
      } catch {}
      // Remove from column order client-side
      const newOrder = columnOrder.filter(c => c !== columnName)
      setColumnOrder(newOrder)
      setAvailableFields(availableFields.filter(f => f !== columnName))
      incrementDataVersion()
    })
    setDeleteOpen(false)
  }

  // ── Change type (client-side override only; best-effort schema) ───────────
  const handleChangeType = (uiType: string) => {
    const internalType = FIELD_TYPE_MAP[uiType] || 'text'
    setFieldTypeOverride(columnName, internalType)
    setTypeChanging(true)
    startTransition(async () => {
      try {
        const { changeColumnType } = await import('@/app/actions/schema')
        await changeColumnType(columnName, uiType)
      } catch {}
      setTypeChanging(false)
      incrementDataVersion()
    })
  }

  const handleSelectTypeSelect = (uiType: string) => {
    setOptionsEditor(columnName, true, uiType)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isPending || typeChanging}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'h-6 w-6 ml-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded focus-visible:ring-0'
          )}
        >
          {(isPending || typeChanging) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 text-sm">
          <DropdownMenuItem onClick={() => { setAddPosition('left'); setAddValue(''); setAddOpen(true) }}>
            <ArrowLeftToLine className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Insert left</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setAddPosition('right'); setAddValue(''); setAddOpen(true) }}>
            <ArrowRightToLine className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Insert right</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {isSelectOrMultiSelect && (
            <>
              <DropdownMenuItem onClick={() => setOptionsEditor(columnName, true)}>
                <ListPlus className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Edit select options</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Type className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Field type</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 max-h-[400px] overflow-y-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Basic</DropdownMenuLabel>
                {['Single line text', 'Long text', 'Number', 'Rating', 'Boolean', 'Date'].map(t => (
                  <DropdownMenuItem key={t} onClick={() => handleChangeType(t)}>{t}</DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Validation</DropdownMenuLabel>
                {['Email', 'Phone number', 'URL', 'Password'].map(t => (
                  <DropdownMenuItem key={t} onClick={() => handleChangeType(t)}>{t}</DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Selection</DropdownMenuLabel>
                {['Single select', 'Multiple select'].map(t => (
                  <DropdownMenuItem key={t} onClick={() => handleSelectTypeSelect(t)}>{t}</DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={() => { setRenameValue(columnName); setRenameOpen(true) }}>
            <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Rename field</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {onFreeze && (
            <DropdownMenuItem onClick={onFreeze}>
              <span className="ml-6">{isFrozen ? 'Unfreeze field' : 'Freeze field'}</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete field</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Field</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new field name"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRenameSubmit() } }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameSubmit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Field Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Field ({addPosition} of "{columnName}")</DialogTitle>
            <DialogDescription>
              Enter a name for the new field. It will appear {addPosition} of this column.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              placeholder="Enter field name"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubmit() } }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={!addValue.trim()}>Add field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Field</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{columnName}"</strong>? All data in this field will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
