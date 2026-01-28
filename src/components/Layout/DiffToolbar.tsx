import { useAppStore } from '@/store/useAppStore'
import { Switch } from '@/components/ui/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { computeDiff } from '@/utils/diff'
import { useMemo } from 'react'
import { GitCompare } from 'lucide-react'

export function DiffToolbar() {
  const {
    leftEditor,
    rightEditor,
    diffOptions,
    setDiffOptions,
  } = useAppStore()

  const diffResult = useMemo(() => {
    if (!leftEditor.content || !rightEditor.content) return null
    return computeDiff(
      leftEditor.content,
      rightEditor.content,
      leftEditor.format,
      rightEditor.format,
      diffOptions
    )
  }, [leftEditor.content, rightEditor.content, leftEditor.format, rightEditor.format, diffOptions])

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GitCompare className="h-4 w-4 text-primary" />
          <span>Diff Options</span>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-3">
          <Tooltip content="Ignore key ordering">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={diffOptions.ignoreKeyOrder}
                onCheckedChange={(checked) => setDiffOptions({ ignoreKeyOrder: checked })}
              />
              <span className="text-xs text-muted-foreground">Key Order</span>
            </label>
          </Tooltip>

          <Tooltip content="Ignore whitespace">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={diffOptions.ignoreWhitespace}
                onCheckedChange={(checked) => setDiffOptions({ ignoreWhitespace: checked })}
              />
              <span className="text-xs text-muted-foreground">Whitespace</span>
            </label>
          </Tooltip>

          <Tooltip content="Ignore case">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={diffOptions.ignoreCase}
                onCheckedChange={(checked) => setDiffOptions({ ignoreCase: checked })}
              />
              <span className="text-xs text-muted-foreground">Case</span>
            </label>
          </Tooltip>

          <Tooltip content="Ignore array order">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={diffOptions.ignoreArrayOrder}
                onCheckedChange={(checked) => setDiffOptions({ ignoreArrayOrder: checked })}
              />
              <span className="text-xs text-muted-foreground">Array Order</span>
            </label>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {diffResult && (
          <div className="flex items-center gap-3 text-xs">
            {diffResult.hasDifferences ? (
              <>
                <span className="text-success">+{diffResult.addedCount} added</span>
                <span className="text-destructive">-{diffResult.removedCount} removed</span>
              </>
            ) : (
              <span className="text-muted-foreground">No differences</span>
            )}
          </div>
        )}

        <div className="h-6 w-px bg-border" />

        <Tooltip content="Show word diff">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={diffOptions.showWordDiff}
              onCheckedChange={(checked) => setDiffOptions({ showWordDiff: checked })}
            />
            <span className="text-xs text-muted-foreground">Word Diff</span>
          </label>
        </Tooltip>

        <Tooltip content="Sync scroll">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch
              checked={diffOptions.syncScroll}
              onCheckedChange={(checked) => setDiffOptions({ syncScroll: checked })}
            />
            <span className="text-xs text-muted-foreground">Sync Scroll</span>
          </label>
        </Tooltip>
      </div>
    </div>
  )
}
