import * as React from 'react'
import { useState, useEffect } from 'react'
import { EditableCell } from '@/components/grid/EditableCell'
import { supabase } from '@/lib/supabase/client'
import { Clock } from 'lucide-react'

interface ExpandedRowPanelProps {
  rowData: any
  headers: string[]
  onUpdate?: () => void
}

export function ExpandedRowPanel({ rowData, headers, onUpdate }: ExpandedRowPanelProps) {
  const rowId = rowData.id || rowData['Lead ID'] || rowData.lead_id
  const [logs, setLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('change_logs')
        .select('*')
        .eq('row_id', String(rowId))
        .order('changed_at', { ascending: false })
      
      if (!error && data) {
        setLogs(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    
    // Subscribe to realtime changes on change_logs for this row
    const channel = supabase.channel('logs_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'change_logs',
        filter: `row_id=eq.${rowId}`
      }, (payload) => {
        setLogs(current => [payload.new, ...current])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [rowId])

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-background md:rounded-b-2xl">
      {/* Left Side: Fields (70%) */}
      <div className="flex-1 lg:w-[70%] p-4 md:p-8 border-r border-border/40 overflow-y-auto">
        <h3 className="text-lg font-medium mb-4 md:mb-6 text-foreground">Fields</h3>
        <div className="grid grid-cols-1 gap-y-4 max-w-4xl">
          {headers.map(header => {
            const val = rowData[header]
            return (
              <div key={header} className="flex flex-col space-y-1.5 group">
                <label className="text-[13px] font-semibold text-muted-foreground/80 uppercase tracking-[0.08em] group-focus-within:text-primary transition-colors select-none">
                  {header}
                </label>
                <div className="relative flex items-center w-full h-11 bg-muted/10 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:bg-background overflow-hidden">
                  <EditableCell 
                    initialValue={val} 
                    rowId={rowId} 
                    columnId={header} 
                    onUpdate={onUpdate}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Side: Change Logs (30%) */}
      <div className="w-full lg:w-[30%] lg:min-w-[350px] lg:max-w-[450px] p-4 md:p-6 bg-muted/10 flex flex-col h-full border-t lg:border-t-0 border-border/40 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground">Change Logs</h3>
        </div>

        <div className="flex-1">
          {isLoadingLogs ? (
            <p className="text-sm text-muted-foreground">Loading history...</p>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 bg-muted/20 rounded-xl border border-border/50 border-dashed">
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[7px] before:-translate-x-px before:h-full before:w-[2px] before:bg-gradient-to-b before:from-primary/20 before:via-border/50 before:to-transparent">
              {logs.map(log => (
                <div key={log.id} className="relative flex items-start gap-4">
                  <div className="absolute left-0 w-[16px] h-[16px] rounded-full bg-background border-2 border-primary/50 mt-1.5 z-10 shadow-sm" />
                  <div className="ml-8 bg-background border border-border/50 p-3.5 rounded-xl shadow-sm w-full hover:border-primary/30 transition-colors">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{log.field_name}</span> updated
                    </p>
                    <div className="flex flex-col gap-1 mt-2.5 bg-muted/30 p-2.5 rounded-lg text-xs font-mono border border-border/40">
                      <div className="text-muted-foreground/70 line-through truncate" title={log.old_value || 'empty'}>
                        {log.old_value || 'empty'}
                      </div>
                      <div className="text-foreground truncate" title={log.new_value || 'empty'}>
                        {log.new_value || 'empty'}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 pt-2 font-medium">
                      {new Date(log.changed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
