import * as React from 'react'
import { ChevronDown, Type, AlignLeft, Hash, CheckSquare, Calendar, ChevronRight, ArrowLeftToLine, ArrowRightToLine, Trash2, Edit2, Loader2 } from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { addColumn, deleteColumn, renameColumn, changeColumnType } from '@/app/actions/schema'
import { cn } from '@/lib/utils'

interface ColumnHeaderMenuProps {
  columnName: string
  onFreeze?: () => void
  isFrozen?: boolean
}

export function ColumnHeaderMenu({ columnName, onFreeze, isFrozen }: ColumnHeaderMenuProps) {
  const { incrementDataVersion, setFieldTypeOverride } = useStore()
  const [isPending, startTransition] = React.useTransition()

  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false)
  const [renameValue, setRenameValue] = React.useState(columnName)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [addValue, setAddValue] = React.useState('')
  const [addPosition, setAddPosition] = React.useState<'left' | 'right'>('right')

  const handleServerAction = (actionFn: Promise<{ success: boolean, error?: string }>) => {
    startTransition(async () => {
      const result = await actionFn
      if (result.success) {
        incrementDataVersion()
      } else {
        alert(`Action failed: ${result.error}`)
      }
    })
  }

  const handleAddFieldClick = (position: 'left' | 'right') => {
    setAddPosition(position)
    setAddValue('')
    setIsAddDialogOpen(true)
  }

  const handleAddSubmit = () => {
    if (!addValue) return
    setIsAddDialogOpen(false)
    handleServerAction(addColumn(addValue, 'Type: Single line text'))
  }

  const handleRenameClick = () => {
    setRenameValue(columnName)
    setIsRenameDialogOpen(true)
  }

  const handleRenameSubmit = () => {
    if (!renameValue || renameValue === columnName) {
      setIsRenameDialogOpen(false)
      return
    }
    setIsRenameDialogOpen(false)
    handleServerAction(renameColumn(columnName, renameValue))
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the column "${columnName}"? This cannot be undone.`)) {
      handleServerAction(deleteColumn(columnName))
    }
  }

  const handleChangeType = (type: string) => {
    // Map UI type names to our internal field type identifiers
    const internalTypeMap: Record<string, string> = {
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
    const internalType = internalTypeMap[type]
    if (internalType) {
      setFieldTypeOverride(columnName, internalType)
    }
    handleServerAction(changeColumnType(columnName, type))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={isPending} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-6 w-6 ml-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded focus-visible:ring-0")}>
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 text-sm">
        <DropdownMenuItem onClick={() => handleAddFieldClick('left')}>
          <ArrowLeftToLine className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Insert left</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddFieldClick('right')}>
          <ArrowRightToLine className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Insert right</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Type className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Field type</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56 max-h-[400px] overflow-y-auto">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Basic</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleChangeType('Single line text')}>Single line text</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Long text')}>Long text</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Number')}>Number</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Rating')}>Rating</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Boolean')}>Boolean</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Date')}>Date</DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Validation</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleChangeType('Email')}>Email</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Phone number')}>Phone number</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('URL')}>URL</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Password')}>Password</DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Selection</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleChangeType('Single select')}>Single select</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Multiple select')}>Multiple select</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Collaborator')}>Collaborator</DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Relationship</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleChangeType('Link to table')}>Link to table</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Lookup')}>Lookup</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Count')}>Count</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Rollup')}>Rollup</DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Automatic</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleChangeType('Formula')}>Formula</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Autonumber')}>Autonumber</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('UUID')}>UUID</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Created on')}>Created on</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Last modified')}>Last modified</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Created by')}>Created by</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Last modified by')}>Last modified by</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeType('Duration')}>Duration</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        <DropdownMenuItem onClick={handleRenameClick}>
          <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Rename field</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />

        {onFreeze && (
          <DropdownMenuItem onClick={onFreeze}>
            <span className="ml-6">{isFrozen ? 'Unfreeze field' : 'Freeze field'}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete field</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Field</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new field name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleRenameSubmit()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameSubmit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Field Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Field ({addPosition})</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              placeholder="Enter new field name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSubmit()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSubmit}>Add field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  )
}
