import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { AlertTriangle, XCircle, Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

interface ErrorPanelProps {
  side: 'left' | 'right'
}

export function ErrorPanel({ side }: ErrorPanelProps) {
  const { leftEditor, rightEditor, setLeftValidation, setRightValidation } = useAppStore()
  const editorState = side === 'left' ? leftEditor : rightEditor
  const setValidation = side === 'left' ? setLeftValidation : setRightValidation

  if (editorState.errors.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="border-t bg-destructive/5"
      >
        <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <XCircle className="h-4 w-4" />
              <span>
                {editorState.errors.length} Error{editorState.errors.length > 1 ? 's' : ''} Found
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setValidation(true, [])}
              className="h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {editorState.errors.map((error, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'p-3 rounded-md border',
                error.severity === 'error'
                  ? 'bg-destructive/10 border-destructive/20'
                  : 'bg-warning/10 border-warning/20'
              )}
            >
              <div className="flex items-start gap-2">
                {error.severity === 'error' ? (
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm">{error.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Line {error.line}, Column {error.column}
                  </p>
                  {error.suggestion && (
                    <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
                      <span>{error.suggestion}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
