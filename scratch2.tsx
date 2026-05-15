import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { createRoot } from 'react-dom/client'

function App() {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: 10,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
  })
  console.log(Object.keys(virtualizer))
  return <div />
}

const container = document.createElement('div')
const root = createRoot(container)
root.render(<App />)
