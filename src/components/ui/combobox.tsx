'use client'

import React, { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'

export function Combobox({ value, onChange, options, placeholder = 'Select…', className }: {
  value: string; onChange: (v: string) => void
  options: string[]; placeholder?: string; className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn('w-full flex items-center justify-between h-9 px-3 text-sm rounded-md border border-border bg-background hover:bg-muted/50 transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>{value || placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
      </PopoverTrigger>
      <PopoverContent className="p-0 shadow-lg" align="start" style={{ width: 'var(--radix-popover-trigger-width)', minWidth: '180px' }}>
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No results</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o}
                  value={o}
                  onSelect={(v) => { onChange(o); setOpen(false) }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o ? "opacity-100" : "opacity-0")} />
                  {o}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
