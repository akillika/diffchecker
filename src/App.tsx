import { useState, useCallback, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { useAppStore } from '@/store/useAppStore'
import { useTheme } from '@/hooks/useTheme'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Header } from '@/components/Layout/Header'
import { Toolbar } from '@/components/Layout/Toolbar'
import { StatusBar } from '@/components/Layout/StatusBar'
import { ErrorPanel } from '@/components/Layout/ErrorPanel'
import { DiffToolbar } from '@/components/Layout/DiffToolbar'
import { MonacoEditor, DiffEditor } from '@/components/Editor'
import {
  TreeView,
  HistoryPanel,
  ShortcutsModal,
  SchemaValidator,
  DiffSummaryPanel,
  TransformersPanel,
  SecurityPanel,
  SnapshotsPanel,
  CommandPalette,
} from '@/components/Features'
import { formatJson, formatYaml, minifyJson, detectFormat } from '@/utils/formatters'
import { escapeJson, unescapeJson } from '@/utils/escape'
import { downloadFile } from '@/lib/utils'
import { parseShareUrl, clearShareUrl } from '@/utils/sharing'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { History, Camera, Shield, LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function App() {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showDiffSummary, setShowDiffSummary] = useState(true)
  const [toolsTab, setToolsTab] = useState<'transformers' | 'security' | 'snapshots'>('transformers')
  const {
    viewMode,
    setViewMode,
    leftEditor,
    setLeftContent,
    setLeftFormat,
    setRightContent,
    setRightFormat,
    formatOptions,
    addToHistory,
  } = useAppStore()

  // Initialize theme
  useTheme()

  // Handle shared URL on load
  useEffect(() => {
    const sharedState = parseShareUrl()
    if (sharedState) {
      setLeftContent(sharedState.content)
      if (sharedState.format !== 'auto') {
        setLeftFormat(sharedState.format)
      }
      if (sharedState.rightContent) {
        setRightContent(sharedState.rightContent)
        if (sharedState.rightFormat && sharedState.rightFormat !== 'auto') {
          setRightFormat(sharedState.rightFormat)
        }
      }
      if (sharedState.viewMode) {
        setViewMode(sharedState.viewMode)
      }
      clearShareUrl()
      toast.success('Loaded shared content!')
    }
  }, [])

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'Enter',
      meta: true,
      action: () => {
        if (!leftEditor.content) return
        try {
          const format = leftEditor.format === 'auto' ? detectFormat(leftEditor.content) : leftEditor.format
          const formatted = format === 'json'
            ? formatJson(leftEditor.content, formatOptions)
            : formatYaml(leftEditor.content, formatOptions)
          setLeftContent(formatted)
          addToHistory(formatted, format)
          toast.success('Formatted!')
        } catch (e) {
          toast.error((e as Error).message)
        }
      },
      description: 'Format content',
    },
    {
      key: 'f',
      meta: true,
      shift: true,
      action: () => {
        if (!leftEditor.content) return
        try {
          const minified = minifyJson(leftEditor.content)
          setLeftContent(minified)
          toast.success('Minified!')
        } catch (e) {
          toast.error((e as Error).message)
        }
      },
      description: 'Minify JSON',
    },
    {
      key: 's',
      meta: true,
      action: () => {
        if (!leftEditor.content) return
        const format = leftEditor.format === 'auto' ? detectFormat(leftEditor.content) : leftEditor.format
        const extension = format === 'json' ? 'json' : 'yaml'
        const mimeType = format === 'json' ? 'application/json' : 'text/yaml'
        downloadFile(leftEditor.content, `data.${extension}`, mimeType)
        toast.success(`Downloaded as data.${extension}`)
      },
      description: 'Download file',
    },
    {
      key: 'd',
      meta: true,
      action: () => {
        setViewMode(viewMode === 'diff' ? 'format' : 'diff')
      },
      description: 'Toggle Diff mode',
    },
    {
      key: '1',
      meta: true,
      action: () => setViewMode('format'),
      description: 'Format mode',
    },
    {
      key: '2',
      meta: true,
      action: () => setViewMode('diff'),
      description: 'Diff mode',
    },
    {
      key: '3',
      meta: true,
      action: () => setViewMode('convert'),
      description: 'Convert mode',
    },
    {
      key: '4',
      meta: true,
      action: () => setViewMode('tree'),
      description: 'Tree mode',
    },
    {
      key: 'k',
      meta: true,
      action: () => setShowShortcuts(true),
      description: 'Show shortcuts',
    },
    {
      key: 'p',
      meta: true,
      action: () => setShowCommandPalette(true),
      description: 'Command palette',
    },
    {
      key: '5',
      meta: true,
      action: () => setViewMode('tools'),
      description: 'Tools mode',
    },
    {
      key: 'e',
      meta: true,
      action: () => {
        if (!leftEditor.content) return
        try {
          const escaped = escapeJson(leftEditor.content)
          setLeftContent(escaped)
          addToHistory(escaped, leftEditor.format)
          toast.success('Escaped!')
        } catch (e) {
          toast.error((e as Error).message)
        }
      },
      description: 'Escape JSON',
    },
    {
      key: 'e',
      meta: true,
      shift: true,
      action: () => {
        if (!leftEditor.content) return
        try {
          const unescaped = unescapeJson(leftEditor.content)
          setLeftContent(unescaped)
          addToHistory(unescaped, leftEditor.format)
          toast.success('Unescaped!')
        } catch (e) {
          toast.error((e as Error).message)
        }
      },
      description: 'Unescape JSON',
    },
  ])

  const handleHistorySelect = useCallback((content: string) => {
    setLeftContent(content)
    setShowHistory(false)
  }, [setLeftContent])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground transition-theme">
      <Header
        onShowShortcuts={() => setShowShortcuts(true)}
        onShowCommandPalette={() => setShowCommandPalette(true)}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="border-r bg-card overflow-hidden"
            >
              <HistoryPanel onSelect={handleHistorySelect} />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === 'diff' && <DiffToolbar />}

          <div className="flex-1 flex overflow-hidden">
            {/* Diff Mode - Side by Side Monaco Diff Editor */}
            {viewMode === 'diff' && (
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden p-4">
                  <DiffEditor className="flex-1" />
                </div>
                {/* Diff Summary Panel */}
                <AnimatePresence>
                  {showDiffSummary && (
                    <motion.aside
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 320, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="border-l bg-card overflow-hidden"
                    >
                      <DiffSummaryPanel />
                    </motion.aside>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Format / Convert Mode */}
            {(viewMode === 'format' || viewMode === 'convert') && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <Toolbar side="left" />
                <div className="flex-1 overflow-hidden p-4">
                  <MonacoEditor side="left" className="h-full" />
                </div>
                <ErrorPanel side="left" />
                <SchemaValidator />
                <StatusBar side="left" />
              </div>
            )}

            {/* Tree View Mode */}
            {viewMode === 'tree' && (
              <div className="flex-1 flex overflow-hidden">
                {/* Editor Panel */}
                <div className="w-1/2 flex flex-col border-r">
                  <Toolbar side="left" />
                  <div className="flex-1 overflow-hidden p-4">
                    <MonacoEditor side="left" className="h-full" />
                  </div>
                  <ErrorPanel side="left" />
                  <StatusBar side="left" />
                </div>

                {/* Tree View Panel */}
                <div className="w-1/2 flex flex-col bg-card">
                  <div className="flex items-center gap-2 p-3 border-b">
                    <span className="text-sm font-medium">Tree View</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <TreeView />
                  </div>
                </div>
              </div>
            )}

            {/* Tools Mode */}
            {viewMode === 'tools' && (
              <div className="flex-1 flex overflow-hidden">
                {/* Editor Panel */}
                <div className="w-1/2 flex flex-col border-r">
                  <Toolbar side="left" />
                  <div className="flex-1 overflow-hidden p-4">
                    <MonacoEditor side="left" className="h-full" />
                  </div>
                  <ErrorPanel side="left" />
                  <StatusBar side="left" />
                </div>

                {/* Tools Panel */}
                <div className="w-1/2 flex flex-col bg-card">
                  {/* Tools Tabs */}
                  <div className="border-b p-2">
                    <Tabs value={toolsTab} onValueChange={(v) => setToolsTab(v as typeof toolsTab)}>
                      <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="transformers" className="text-xs">
                          <LayoutList className="h-3.5 w-3.5 mr-1" />
                          Transformers
                        </TabsTrigger>
                        <TabsTrigger value="security" className="text-xs">
                          <Shield className="h-3.5 w-3.5 mr-1" />
                          Security
                        </TabsTrigger>
                        <TabsTrigger value="snapshots" className="text-xs">
                          <Camera className="h-3.5 w-3.5 mr-1" />
                          Snapshots
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Tools Content */}
                  <div className="flex-1 overflow-hidden">
                    {toolsTab === 'transformers' && <TransformersPanel />}
                    {toolsTab === 'security' && <SecurityPanel />}
                    {toolsTab === 'snapshots' && <SnapshotsPanel />}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
          <Tooltip content={showHistory ? 'Hide History' : 'Show History'}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className="rounded-full shadow-lg bg-background"
            >
              <History className="h-4 w-4" />
            </Button>
          </Tooltip>

          {viewMode === 'diff' && (
            <Tooltip content={showDiffSummary ? 'Hide Diff Summary' : 'Show Diff Summary'}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowDiffSummary(!showDiffSummary)}
                className={cn(
                  'rounded-full shadow-lg bg-background',
                  showDiffSummary && 'bg-primary/10 text-primary border-primary'
                )}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
        </div>
      </main>

      {/* Shortcuts Modal */}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onAction={(msg) => toast.success(msg)}
      />

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'toast-custom',
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: {
              primary: 'hsl(var(--success))',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'hsl(var(--destructive))',
              secondary: 'white',
            },
          },
        }}
      />
    </div>
  )
}
