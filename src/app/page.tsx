import { Toolbar } from '@/components/Toolbar'
import { MainView } from '@/components/MainView'

export default function Home() {
  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Header / Top Navigation (optional, if we want an app bar above the toolbar) */}
      
      {/* The main toolbar for the database view */}
      <Toolbar />
      
      {/* The main data grid */}
      <MainView />
    </main>
  )
}
