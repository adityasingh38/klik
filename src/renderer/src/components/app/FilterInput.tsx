import React from 'react'
import { ListFilter } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface FilterInputProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
}

/**
 * The filter box, with its glyph actually visible.
 *
 * Input renders a wrapper span around the real input and forwards className to that
 * wrapper, so the usual `pl-9` padded the wrapper rather than the field, and the
 * icon — a sibling painting before an opaque, positioned wrapper — sat underneath it.
 * The box read as an empty field with a strangely indented placeholder.
 *
 * The padding is aimed at the input itself and the glyph is lifted above the wrapper.
 * Both filter boxes share this so the two can't drift apart again.
 */
export function FilterInput({ placeholder, value, onChange }: FilterInputProps): React.ReactElement {
  return (
    <div className="relative">
      <ListFilter className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className="h-10 [&_[data-slot=input]]:h-10 [&_[data-slot=input]]:ps-9 [&_[data-slot=input]]:leading-10 sm:[&_[data-slot=input]]:h-10 sm:[&_[data-slot=input]]:leading-10"
      />
    </div>
  )
}
