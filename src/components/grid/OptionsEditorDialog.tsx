'use client'

import * as React from 'react'
import { useState, useEffect, useTransition } from 'react'
import { ChevronDown, ChevronUp, Edit2, Trash2, Check, Plus, ListPlus, X, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

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

export function OptionsEditorDialog() {
  const {
    optionsEditorOpen,
    optionsEditorColumn,
    optionsEditorTargetType,
    setOptionsEditor,
    customSelectOptions,
    setCustomSelectOptions,
    uniqueValuesByColumn,
    setFieldTypeOverride,
    incrementDataVersion
  } = useStore()

  const [isPending, startTransition] = useTransition()
  const [optionsList, setOptionsList] = useState<string[]>([])
  const [newOptionVal, setNewOptionVal] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [typeChanging, setTypeChanging] = useState(false)

  // Seed default options when opening the dialog
  useEffect(() => {
    if (optionsEditorOpen && optionsEditorColumn) {
      const currentOptions = customSelectOptions[optionsEditorColumn] || []
      const observedValues = uniqueValuesByColumn[optionsEditorColumn] || []
      // Combine currently configured options and existing raw cell values
      const mergedOptions = Array.from(
        new Set([
          ...currentOptions,
          ...observedValues.map(v => String(v).trim())
        ])
      ).filter(v => v !== '')
      
      setOptionsList(mergedOptions)
      setNewOptionVal('')
      setEditingIndex(null)
    }
  }, [optionsEditorOpen, optionsEditorColumn, customSelectOptions, uniqueValuesByColumn])

  if (!optionsEditorColumn) return null

  const getPillColor = (val: string) => {
    if (!val) return 'bg-muted/30 border-muted text-muted-foreground'
    let hash = 0
    for (let i = 0; i < val.length; i++) {
      hash = val.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
      'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
      'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
      'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400',
      'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400',
      'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
      'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400',
      'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
      'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
      'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400',
      'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
      'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400',
      'bg-pink-500/10 border-pink-500/20 text-pink-600 dark:text-pink-400',
      'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
    ]
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  const handleAddOption = () => {
    const val = newOptionVal.trim()
    if (!val) return
    if (optionsList.includes(val)) {
      import('sonner').then(({ toast }) => {
        toast.error('This option already exists!')
      })
      return
    }
    setOptionsList([...optionsList, val])
    setNewOptionVal('')
  }

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const next = [...optionsList]
    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= next.length) return
    const temp = next[index]
    next[index] = next[swapWith]
    next[swapWith] = temp
    setOptionsList(next)
  }

  const handleDeleteOption = (index: number) => {
    setOptionsList(optionsList.filter((_, i) => i !== index))
  }

  const handleSaveInlineEdit = (index: number) => {
    const val = editingValue.trim()
    if (!val) {
      setEditingIndex(null)
      return
    }
    const current = optionsList[index]
    if (val === current) {
      setEditingIndex(null)
      return
    }
    if (optionsList.includes(val) && optionsList.indexOf(val) !== index) {
      import('sonner').then(({ toast }) => {
        toast.error('This option already exists!')
      })
      return
    }
    const next = [...optionsList]
    next[index] = val
    setOptionsList(next)
    setEditingIndex(null)
  }

  const handleSaveOptions = async () => {
    setCustomSelectOptions(optionsEditorColumn, optionsList)

    if (optionsEditorTargetType) {
      const internalType = FIELD_TYPE_MAP[optionsEditorTargetType] || 'text'
      setFieldTypeOverride(optionsEditorColumn, internalType)
      setTypeChanging(true)
      
      startTransition(async () => {
        try {
          const { changeColumnType } = await import('@/app/actions/schema')
          await changeColumnType(optionsEditorColumn, optionsEditorTargetType)
        } catch {}
        setTypeChanging(false)
        incrementDataVersion()
      })
    } else {
      incrementDataVersion()
    }

    setOptionsEditor(null, false)
    const { toast } = await import('sonner')
    toast.success('Select options configured successfully!')
  }

  return (
    <Dialog open={optionsEditorOpen} onOpenChange={(open) => setOptionsEditor(optionsEditorColumn, open, optionsEditorTargetType)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-primary animate-pulse" />
            {optionsEditorTargetType ? `Configure Options` : `Edit Options`}
          </DialogTitle>
          <DialogDescription>
            Define selection options for <strong>"{optionsEditorColumn}"</strong>. Any existing cell values in this field have been pre-converted to options for you.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Input to add */}
          <div className="flex gap-2">
            <Input
              value={newOptionVal}
              onChange={e => setNewOptionVal(e.target.value)}
              placeholder="Type option and press enter..."
              className="flex-1 h-9 text-sm focus-visible:ring-1"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddOption()
                }
              }}
            />
            <Button onClick={handleAddOption} className="h-9 shrink-0 flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          {/* List */}
          <div className="border border-border/60 rounded-lg max-h-60 overflow-y-auto bg-muted/5 divide-y divide-border/40 shadow-inner">
            {optionsList.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground/80 italic">
                No options configured yet. Add some options above!
              </div>
            ) : (
              optionsList.map((opt, index) => (
                <div key={opt} className="flex items-center justify-between p-2 group transition-colors hover:bg-muted/20">
                  {editingIndex === index ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <Input
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                        className="h-8 text-xs flex-1"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveInlineEdit(index)
                          if (e.key === 'Escape') setEditingIndex(null)
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md shrink-0"
                        onClick={() => handleSaveInlineEdit(index)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md shrink-0"
                        onClick={() => setEditingIndex(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-semibold border select-none max-w-[180px] truncate shadow-sm shrink-0", getPillColor(opt))}>
                        {opt}
                      </span>

                      <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary rounded-md disabled:opacity-30 shrink-0"
                          disabled={index === 0}
                          onClick={() => handleMoveOption(index, 'up')}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary rounded-md disabled:opacity-30 shrink-0"
                          disabled={index === optionsList.length - 1}
                          onClick={() => handleMoveOption(index, 'down')}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-amber-500 rounded-md shrink-0"
                          onClick={() => {
                            setEditingIndex(index)
                            setEditingValue(opt)
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md shrink-0"
                          onClick={() => handleDeleteOption(index)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setOptionsEditor(null, false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveOptions} disabled={isPending || typeChanging}>
            {(isPending || typeChanging) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save {optionsEditorTargetType ? '& Change Type' : 'Options'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
