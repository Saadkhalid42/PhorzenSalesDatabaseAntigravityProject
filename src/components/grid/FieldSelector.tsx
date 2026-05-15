import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface FieldSelectorProps {
  fields: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function FieldSelector({ fields, value, onChange, placeholder = "Select field...", className }: FieldSelectorProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger 
        className={cn(buttonVariants({ variant: "outline" }), "w-[200px] justify-between h-8 text-xs font-normal border-border bg-background", className)}
        role="combobox"
        aria-expanded={open}
      >
        {value || placeholder}
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search fields..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs py-2 text-center text-muted-foreground">No field found.</CommandEmpty>
            <CommandGroup>
              {fields.map((field) => (
                <CommandItem
                  key={field}
                  value={field}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : field)
                    setOpen(false)
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === field ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {field}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
