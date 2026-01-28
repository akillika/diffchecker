import { useMemo, useCallback, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { computeSemanticDiff, formatValue, getChangeBadgeColor } from '@/utils/semanticDiff'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitCompare,
  Plus,
  Minus,
  RefreshCw,
  Type,
  ChevronRight,
  ChevronDown,
  Copy,
  X,
  Filter,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { SemanticChangeType } from '@/types'

export function DiffSummaryPanel() {
  const {
    leftEditor,
    rightEditor,
    diffOptions,
    semanticDiffResult,
    setSemanticDiffResult,
    showDiffSummary,
    setShowDiffSummary,
  } = useAppStore()

  const [filterType, setFilterType] = useState<SemanticChangeType | 'all'>('all')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  // Compute semantic diff when content changes
  const diffResult = useMemo(() => {
    if (!leftEditor.content || !rightEditor.content) {
      return null
    }
    const result = computeSemanticDiff(
      leftEditor.content,
      rightEditor.content,
      leftEditor.format,
      rightEditor.format,
      diffOptions
    )
    setSemanticDiffResult(result)
    return result
  }, [leftEditor.content, rightEditor.content, leftEditor.format, rightEditor.format, diffOptions, setSemanticDiffResult])

  const filteredChanges = useMemo(() => {
    if (!diffResult) return []
    if (filterType === 'all') return diffResult.changes
    return diffResult.changes.filter((c) => c.type === filterType)
  }, [diffResult, filterType])

  const togglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const copyPath = useCallback(async (path: string) => {
    try {
      await navigator.clipboard.writeText(path)
      toast.success('Path copied!')
    } catch {
      toast.error('Failed to copy')
    }
  }, [])

  if (!showDiffSummary) {
    return null
  }

  if (!diffResult) {
    return (
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Diff Summary</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setShowDiffSummary(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Enter content in both editors to see diff
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="border-l bg-card flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Diff Summary</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setShowDiffSummary(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="p-3 border-b bg-muted/30">
        {diffResult.isIdentical ? (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">No differences found</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setFilterType(filterType === 'added' ? 'all' : 'added')}
              className={cn(
                'flex flex-col items-center p-2 rounded-md transition-colors',
                filterType === 'added' ? 'bg-green-500/20' : 'hover:bg-muted'
              )}
            >
              <Plus className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium mt-1">{diffResult.summary.added}</span>
            </button>
            <button
              onClick={() => setFilterType(filterType === 'removed' ? 'all' : 'removed')}
              className={cn(
                'flex flex-col items-center p-2 rounded-md transition-colors',
                filterType === 'removed' ? 'bg-red-500/20' : 'hover:bg-muted'
              )}
            >
              <Minus className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium mt-1">{diffResult.summary.removed}</span>
            </button>
            <button
              onClick={() => setFilterType(filterType === 'modified' ? 'all' : 'modified')}
              className={cn(
                'flex flex-col items-center p-2 rounded-md transition-colors',
                filterType === 'modified' ? 'bg-yellow-500/20' : 'hover:bg-muted'
              )}
            >
              <RefreshCw className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-medium mt-1">{diffResult.summary.modified}</span>
            </button>
            <button
              onClick={() => setFilterType(filterType === 'type_changed' ? 'all' : 'type_changed')}
              className={cn(
                'flex flex-col items-center p-2 rounded-md transition-colors',
                filterType === 'type_changed' ? 'bg-purple-500/20' : 'hover:bg-muted'
              )}
            >
              <Type className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium mt-1">{diffResult.summary.typeChanged}</span>
            </button>
          </div>
        )}

        {filterType !== 'all' && (
          <div className="flex items-center gap-2 mt-2">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Showing {filteredChanges.length} {filterType.replace('_', ' ')} changes
            </span>
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => setFilterType('all')}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Changes List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredChanges.map((change, index) => {
            const isExpanded = expandedPaths.has(change.path)
            return (
              <motion.div
                key={`${change.path}-${index}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.02 }}
                className="border-b"
              >
                <div
                  className="flex items-start gap-2 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => togglePath(change.path)}
                >
                  <button className="mt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border',
                          getChangeBadgeColor(change.type)
                        )}
                      >
                        {change.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <code className="text-xs font-mono text-foreground truncate">
                        {change.path || '$'}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyPath(change.path || '$')
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pl-9 space-y-2">
                        {change.type !== 'added' && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-red-500 font-medium w-12 flex-shrink-0">Before:</span>
                            <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded break-all">
                              {formatValue(change.oldValue, 100)}
                            </code>
                          </div>
                        )}
                        {change.type !== 'removed' && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-green-500 font-medium w-12 flex-shrink-0">After:</span>
                            <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded break-all">
                              {formatValue(change.newValue, 100)}
                            </code>
                          </div>
                        )}
                        {change.type === 'type_changed' && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="text-purple-500">{change.oldType}</span>
                            <span>→</span>
                            <span className="text-purple-500">{change.newType}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filteredChanges.length === 0 && !diffResult.isIdentical && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No {filterType !== 'all' ? filterType.replace('_', ' ') : ''} changes found
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
        {diffResult.summary.total} total change{diffResult.summary.total !== 1 ? 's' : ''}
      </div>
    </motion.div>
  )
}
