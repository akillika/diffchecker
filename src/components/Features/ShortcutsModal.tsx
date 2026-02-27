import { useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X, Keyboard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  description: string
}

const shortcuts: { category: string; items: Shortcut[] }[] = [
  {
    category: 'Formatting',
    items: [
      { keys: ['⌘', 'Enter'], description: 'Format content' },
      { keys: ['⌘', '⇧', 'F'], description: 'Minify JSON' },
      { keys: ['⌘', 'E'], description: 'Escape JSON' },
      { keys: ['⌘', '⇧', 'E'], description: 'Unescape JSON' },
      { keys: ['⌘', 'S'], description: 'Download file' },
    ],
  },
  {
    category: 'View',
    items: [
      { keys: ['⌘', 'D'], description: 'Toggle Diff mode' },
      { keys: ['⌘', '1'], description: 'Format mode' },
      { keys: ['⌘', '2'], description: 'Diff mode' },
      { keys: ['⌘', '3'], description: 'Convert mode' },
      { keys: ['⌘', '4'], description: 'Tree mode' },
    ],
  },
  {
    category: 'Editor',
    items: [
      { keys: ['⌘', 'A'], description: 'Select all' },
      { keys: ['⌘', 'C'], description: 'Copy' },
      { keys: ['⌘', 'V'], description: 'Paste' },
      { keys: ['⌘', 'Z'], description: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'], description: 'Redo' },
    ],
  },
  {
    category: 'General',
    items: [
      { keys: ['⌘', 'K'], description: 'Show shortcuts' },
      { keys: ['Esc'], description: 'Close modal' },
    ],
  },
]

// Convert Mac shortcuts to Windows/Linux
const convertShortcut = (keys: string[]): string[] => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  if (isMac) return keys

  return keys.map((key) => {
    if (key === '⌘') return 'Ctrl'
    if (key === '⇧') return 'Shift'
    if (key === '⌥') return 'Alt'
    return key
  })
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Keyboard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                  <p className="text-sm text-muted-foreground">
                    Quick access to common actions
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {shortcuts.map((category) => (
                <div key={category.category}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {category.category}
                  </h3>
                  <div className="space-y-2">
                    {category.items.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {convertShortcut(shortcut.keys).map((key, keyIndex) => (
                            <kbd
                              key={keyIndex}
                              className={cn(
                                'inline-flex h-6 min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs',
                                key.length === 1 && 'w-6'
                              )}
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
