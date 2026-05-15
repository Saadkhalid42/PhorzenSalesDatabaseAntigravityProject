import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export function Scratch() {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: 10,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
  })
  console.log(Object.keys(virtualizer))
  return <div />
}
