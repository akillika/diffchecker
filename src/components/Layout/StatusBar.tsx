import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { detectFormat } from '@/utils/formatters'
import { formatBytes } from '@/lib/utils'
import { CheckCircle2, XCircle, FileJson, FileCode2 } from 'lucide-react'

interface StatusBarProps {
  side: 'left' | 'right'
}

export function StatusBar({ side }: StatusBarProps) {
  const { leftEditor, rightEditor } = useAppStore()
  const editorState = side === 'left' ? leftEditor : rightEditor

  const actualFormat = useMemo(() => {
    return editorState.format === 'auto' ? detectFormat(editorState.content) : editorState.format
  }, [editorState.content, editorState.format])

  const FormatIcon = actualFormat === 'json' ? FileJson : FileCode2

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        {/* Format Type */}
        <div className="flex items-center gap-1.5">
          <FormatIcon className="h-3.5 w-3.5" />
          <span className="font-medium uppercase">{actualFormat}</span>
        </div>

        {/* Validation Status */}
        <div className="flex items-center gap-1.5">
          {editorState.errors.length === 0 ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span className="text-success">Valid</span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-destructive">
                {editorState.errors.length} error{editorState.errors.length > 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Line Count */}
        <span>
          {editorState.lineCount} line{editorState.lineCount !== 1 ? 's' : ''}
        </span>

        {/* File Size */}
        <span>{formatBytes(editorState.size)}</span>
      </div>
    </div>
  )
}
