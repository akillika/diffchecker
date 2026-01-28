import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { History, Trash2, Clock, FileJson, FileCode2, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

interface HistoryPanelProps {
  onSelect: (content: string) => void
}

export function HistoryPanel({ onSelect }: HistoryPanelProps) {
  const { history, clearHistory } = useAppStore()

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const handleSelect = (content: string) => {
    onSelect(content)
    toast.success('Restored from history')
  }

  const handleClearHistory = () => {
    clearHistory()
    toast.success('History cleared')
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <History className="h-12 w-12 mb-3 opacity-50" />
        <p className="font-medium">No history yet</p>
        <p className="text-sm mt-1 text-center">
          Your formatted data will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4" />
          <span>History ({history.length})</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClearHistory}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence>
          {history.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group'
              )}
              onClick={() => handleSelect(item.content)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.format === 'json' ? (
                    <FileJson className="h-4 w-4 text-amber-500" />
                  ) : (
                    <FileCode2 className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="font-medium text-xs uppercase">{item.format}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(item.content)
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-2">
                <pre className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap break-all">
                  {item.content.slice(0, 150)}
                  {item.content.length > 150 && '...'}
                </pre>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(item.timestamp)}
                </span>
                <span>{formatBytes(new Blob([item.content]).size)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
