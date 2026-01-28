import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Command,
  Code2,
  GitCompare,
  ArrowLeftRight,
  TreeDeciduous,
  Wrench,
  Sun,
  Moon,
  Download,
  Copy,
  Shield,
  Camera,
  History,
  FileJson,
  FileCode2,
  Minimize2,
  Search,
  X,
  Keyboard,
} from 'lucide-react'
import type { ViewMode, FormatType, TransformerType } from '@/types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onAction?: (action: string) => void
}

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  category: string
  keywords: string[]
  action: () => void
  shortcut?: string
}

export function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
  const {
    setViewMode,
    setLeftFormat,
    setPrivacyMode,
    privacyMode,
    createSnapshot,
    leftEditor,
    setActiveTransformer,
  } = useAppStore()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<CommandItem[]>(() => [
    // View Modes
    {
      id: 'view-format',
      label: 'Format Mode',
      description: 'Format and validate JSON/YAML',
      icon: <Code2 className="h-4 w-4" />,
      category: 'View',
      keywords: ['format', 'view', 'mode', 'edit'],
      action: () => setViewMode('format'),
      shortcut: '⌘1',
    },
    {
      id: 'view-diff',
      label: 'Diff Mode',
      description: 'Compare two documents',
      icon: <GitCompare className="h-4 w-4" />,
      category: 'View',
      keywords: ['diff', 'compare', 'view', 'mode'],
      action: () => setViewMode('diff'),
      shortcut: '⌘2',
    },
    {
      id: 'view-convert',
      label: 'Convert Mode',
      description: 'Convert between JSON and YAML',
      icon: <ArrowLeftRight className="h-4 w-4" />,
      category: 'View',
      keywords: ['convert', 'json', 'yaml', 'view', 'mode'],
      action: () => setViewMode('convert'),
      shortcut: '⌘3',
    },
    {
      id: 'view-tree',
      label: 'Tree Mode',
      description: 'Visual tree representation',
      icon: <TreeDeciduous className="h-4 w-4" />,
      category: 'View',
      keywords: ['tree', 'view', 'mode', 'visual'],
      action: () => setViewMode('tree'),
      shortcut: '⌘4',
    },
    {
      id: 'view-tools',
      label: 'Tools Mode',
      description: 'Transformers, security, snapshots',
      icon: <Wrench className="h-4 w-4" />,
      category: 'View',
      keywords: ['tools', 'view', 'mode', 'transform'],
      action: () => setViewMode('tools'),
      shortcut: '⌘5',
    },
    // Format Actions
    {
      id: 'set-json',
      label: 'Set Format: JSON',
      description: 'Parse as JSON',
      icon: <FileJson className="h-4 w-4" />,
      category: 'Format',
      keywords: ['json', 'format', 'set'],
      action: () => setLeftFormat('json'),
    },
    {
      id: 'set-yaml',
      label: 'Set Format: YAML',
      description: 'Parse as YAML',
      icon: <FileCode2 className="h-4 w-4" />,
      category: 'Format',
      keywords: ['yaml', 'format', 'set'],
      action: () => setLeftFormat('yaml'),
    },
    // Transformers
    {
      id: 'transform-redact',
      label: 'Redact Sensitive Data',
      description: 'Remove emails, phones, API keys',
      icon: <Shield className="h-4 w-4" />,
      category: 'Transform',
      keywords: ['redact', 'sensitive', 'privacy', 'mask'],
      action: () => {
        setViewMode('tools')
        setActiveTransformer('redact')
      },
    },
    {
      id: 'transform-flatten',
      label: 'Flatten JSON',
      description: 'Convert nested to flat structure',
      icon: <Minimize2 className="h-4 w-4" />,
      category: 'Transform',
      keywords: ['flatten', 'transform', 'nested'],
      action: () => {
        setViewMode('tools')
        setActiveTransformer('flatten')
      },
    },
    {
      id: 'transform-types',
      label: 'Generate Types',
      description: 'TypeScript interfaces or Zod schemas',
      icon: <FileCode2 className="h-4 w-4" />,
      category: 'Transform',
      keywords: ['typescript', 'zod', 'types', 'generate'],
      action: () => {
        setViewMode('tools')
        setActiveTransformer('type-generator')
      },
    },
    // Privacy & Snapshots
    {
      id: 'privacy-toggle',
      label: privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode',
      description: privacyMode ? 'Re-enable history and sharing' : 'Disable history, sharing, persistence',
      icon: <Shield className="h-4 w-4" />,
      category: 'Privacy',
      keywords: ['privacy', 'mode', 'secure', 'private'],
      action: () => setPrivacyMode(!privacyMode),
    },
    {
      id: 'snapshot-create',
      label: 'Create Snapshot',
      description: 'Save current content state',
      icon: <Camera className="h-4 w-4" />,
      category: 'Snapshots',
      keywords: ['snapshot', 'save', 'version'],
      action: () => {
        if (leftEditor.content && !privacyMode) {
          createSnapshot(`Snapshot ${Date.now()}`)
          onAction?.('Snapshot created')
        }
      },
    },
    // Theme
    {
      id: 'theme-light',
      label: 'Light Theme',
      description: 'Switch to light mode',
      icon: <Sun className="h-4 w-4" />,
      category: 'Theme',
      keywords: ['light', 'theme', 'mode'],
      action: () => {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      },
    },
    {
      id: 'theme-dark',
      label: 'Dark Theme',
      description: 'Switch to dark mode',
      icon: <Moon className="h-4 w-4" />,
      category: 'Theme',
      keywords: ['dark', 'theme', 'mode'],
      action: () => {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      },
    },
  ], [privacyMode, setViewMode, setLeftFormat, setPrivacyMode, createSnapshot, leftEditor.content, setActiveTransformer, onAction])

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands

    const lowerQuery = query.toLowerCase()
    return commands.filter((cmd) => {
      return (
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some((k) => k.includes(lowerQuery)) ||
        cmd.category.toLowerCase().includes(lowerQuery)
      )
    })
  }, [commands, query])

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    })
    return groups
  }, [filteredCommands])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const executeCommand = useCallback((cmd: CommandItem) => {
    cmd.action()
    onClose()
  }, [onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [filteredCommands, selectedIndex, executeCommand, onClose])

  // Scroll selected item into view
  useEffect(() => {
    const selected = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!isOpen) return null

  let flatIndex = -1

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
          >
            <div className="bg-background border rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <Command className="h-5 w-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Commands List */}
              <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No commands found</p>
                  </div>
                ) : (
                  Object.entries(groupedCommands).map(([category, cmds]) => (
                    <div key={category} className="mb-2">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {category}
                      </div>
                      {cmds.map((cmd) => {
                        flatIndex++
                        const isSelected = flatIndex === selectedIndex

                        return (
                          <button
                            key={cmd.id}
                            data-index={flatIndex}
                            onClick={() => executeCommand(cmd)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                              isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                            )}
                          >
                            <div className={cn(
                              'flex items-center justify-center w-8 h-8 rounded-md',
                              isSelected ? 'bg-primary/20' : 'bg-muted'
                            )}>
                              {cmd.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{cmd.label}</div>
                              {cmd.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {cmd.description}
                                </div>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono bg-muted rounded">
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">↓</kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
                    to select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">esc</kbd>
                  to close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
