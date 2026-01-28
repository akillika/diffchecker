import { useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Camera,
  RotateCcw,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  GitCompare,
  FileJson,
  FileCode2,
  Plus,
  FolderOpen,
} from 'lucide-react'
import type { Snapshot } from '@/types'

export function SnapshotsPanel() {
  const {
    snapshots,
    createSnapshot,
    deleteSnapshot,
    restoreSnapshot,
    renameSnapshot,
    clearSnapshots,
    leftEditor,
    privacyMode,
    setViewMode,
    setLeftContent,
    setRightContent,
  } = useAppStore()

  const [newSnapshotName, setNewSnapshotName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])

  const handleCreateSnapshot = useCallback(() => {
    if (!leftEditor.content) {
      toast.error('No content to snapshot')
      return
    }
    if (privacyMode) {
      toast.error('Snapshots disabled in privacy mode')
      return
    }
    const name = newSnapshotName.trim() || `Snapshot ${snapshots.length + 1}`
    createSnapshot(name)
    setNewSnapshotName('')
    toast.success('Snapshot created!')
  }, [leftEditor.content, privacyMode, newSnapshotName, snapshots.length, createSnapshot])

  const handleRestore = useCallback((id: string) => {
    restoreSnapshot(id)
    toast.success('Snapshot restored!')
  }, [restoreSnapshot])

  const handleDelete = useCallback((id: string) => {
    deleteSnapshot(id)
    toast.success('Snapshot deleted')
  }, [deleteSnapshot])

  const handleStartEdit = useCallback((snapshot: Snapshot) => {
    setEditingId(snapshot.id)
    setEditName(snapshot.name)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingId && editName.trim()) {
      renameSnapshot(editingId, editName.trim())
      setEditingId(null)
      toast.success('Renamed')
    }
  }, [editingId, editName, renameSnapshot])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditName('')
  }, [])

  const toggleCompareSelection = useCallback((id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id)
      }
      if (prev.length >= 2) {
        return [prev[1], id]
      }
      return [...prev, id]
    })
  }, [])

  const handleCompare = useCallback(() => {
    if (selectedForCompare.length !== 2) {
      toast.error('Select exactly 2 snapshots')
      return
    }
    const a = snapshots.find((s) => s.id === selectedForCompare[0])
    const b = snapshots.find((s) => s.id === selectedForCompare[1])
    if (a && b) {
      setLeftContent(a.leftContent)
      setRightContent(b.leftContent)
      setViewMode('diff')
      setCompareMode(false)
      setSelectedForCompare([])
      toast.success('Comparing snapshots in diff mode')
    }
  }, [selectedForCompare, snapshots, setLeftContent, setRightContent, setViewMode])

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Snapshots ({snapshots.length}/30)</span>
        </div>
        {snapshots.length > 0 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode)
                setSelectedForCompare([])
              }}
              className={cn(compareMode && 'bg-primary/10 text-primary')}
            >
              <GitCompare className="h-3.5 w-3.5 mr-1" />
              Compare
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSnapshots}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Create Snapshot */}
      <div className="p-3 border-b">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSnapshotName}
            onChange={(e) => setNewSnapshotName(e.target.value)}
            placeholder="Snapshot name (optional)"
            className="flex-1 px-3 py-1.5 text-sm rounded border bg-background"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
          />
          <Button onClick={handleCreateSnapshot} disabled={!leftEditor.content || privacyMode}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {privacyMode && (
          <p className="text-xs text-muted-foreground mt-2">Snapshots disabled in privacy mode</p>
        )}
      </div>

      {/* Compare Mode Banner */}
      {compareMode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="p-3 bg-primary/10 border-b"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm">
              Select 2 snapshots ({selectedForCompare.length}/2 selected)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCompare}
                disabled={selectedForCompare.length !== 2}
              >
                Compare
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCompareMode(false)
                  setSelectedForCompare([])
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Snapshots List */}
      <div className="flex-1 overflow-y-auto p-2">
        {snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No snapshots yet</p>
            <p className="text-sm text-center mt-1">
              Create a snapshot to save your current content
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {snapshots.map((snapshot, index) => {
              const isEditing = editingId === snapshot.id
              const isSelected = selectedForCompare.includes(snapshot.id)
              const FormatIcon = snapshot.leftFormat === 'json' ? FileJson : FileCode2

              return (
                <motion.div
                  key={snapshot.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'p-3 rounded-lg border mb-2 transition-colors',
                    compareMode && isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card hover:bg-muted/50',
                    compareMode && 'cursor-pointer'
                  )}
                  onClick={() => compareMode && toggleCompareSelection(snapshot.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {compareMode && (
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      )}
                      <FormatIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-0.5 text-sm rounded border bg-background"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="font-medium text-sm truncate">{snapshot.name}</span>
                      )}
                    </div>
                    {!compareMode && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="icon-sm" onClick={handleSaveEdit}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={handleCancelEdit}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRestore(snapshot.id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleStartEdit(snapshot)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(snapshot.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(snapshot.timestamp)}
                    </span>
                    <span>{formatBytes(new Blob([snapshot.leftContent]).size)}</span>
                    <span className="uppercase">{snapshot.leftFormat}</span>
                  </div>

                  <div className="mt-2">
                    <pre className="text-xs text-muted-foreground line-clamp-2 font-mono bg-muted/30 p-2 rounded">
                      {snapshot.leftContent.slice(0, 100)}
                      {snapshot.leftContent.length > 100 && '...'}
                    </pre>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
