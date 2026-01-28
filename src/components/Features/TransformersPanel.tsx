import { useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  transformRedact,
  transformCaseConvert,
  transformFlatten,
  transformUnflatten,
  transformRemoveEmpty,
  transformTypeGenerator,
} from '@/utils/transformers'
import {
  EyeOff,
  CaseSensitive,
  Layers,
  Trash2,
  Code,
  Play,
  Copy,
  Download,
  Wand2,
  ArrowRight,
} from 'lucide-react'
import type { TransformerType, CaseType } from '@/types'

interface TransformerConfig {
  id: TransformerType
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const TRANSFORMERS: TransformerConfig[] = [
  {
    id: 'redact',
    name: 'Redact Sensitive',
    description: 'Mask passwords, tokens, emails, phones, and credit cards',
    icon: EyeOff,
  },
  {
    id: 'case-convert',
    name: 'Convert Case',
    description: 'Transform key names between camelCase, snake_case, etc',
    icon: CaseSensitive,
  },
  {
    id: 'flatten',
    name: 'Flatten',
    description: 'Convert nested objects to flat dot-notation paths',
    icon: Layers,
  },
  {
    id: 'unflatten',
    name: 'Unflatten',
    description: 'Convert flat objects back to nested structure',
    icon: Layers,
  },
  {
    id: 'remove-empty',
    name: 'Remove Empty',
    description: 'Remove null values, empty strings, arrays, or objects',
    icon: Trash2,
  },
  {
    id: 'type-generator',
    name: 'Generate Types',
    description: 'Export TypeScript interfaces or Zod schemas',
    icon: Code,
  },
]

export function TransformersPanel() {
  const {
    leftEditor,
    setLeftContent,
    activeTransformer,
    setActiveTransformer,
    transformerOptions,
    setTransformerOptions,
    addToHistory,
  } = useAppStore()

  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)

  const runTransformer = useCallback(async () => {
    if (!activeTransformer || !leftEditor.content) {
      toast.error('Select a transformer and enter content')
      return
    }

    setIsRunning(true)
    setOutput('')

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      let result

      switch (activeTransformer) {
        case 'redact':
          result = transformRedact(leftEditor.content, leftEditor.format, transformerOptions.redact)
          break
        case 'case-convert':
          result = transformCaseConvert(leftEditor.content, leftEditor.format, transformerOptions.caseConvert)
          break
        case 'flatten':
          result = transformFlatten(leftEditor.content, leftEditor.format, transformerOptions.flatten)
          break
        case 'unflatten':
          result = transformUnflatten(leftEditor.content, leftEditor.format, transformerOptions.unflatten)
          break
        case 'remove-empty':
          result = transformRemoveEmpty(leftEditor.content, leftEditor.format, transformerOptions.removeEmpty)
          break
        case 'type-generator':
          result = transformTypeGenerator(leftEditor.content, leftEditor.format, transformerOptions.typeGenerator)
          break
        default:
          result = { success: false, error: 'Unknown transformer' }
      }

      setIsRunning(false)

      if (result.success && result.output) {
        setOutput(result.output)
        if (result.stats) {
          const statsMsg = Object.entries(result.stats)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
          toast.success(`Done! ${statsMsg}`)
        } else {
          toast.success('Transformation complete!')
        }
      } else {
        toast.error(result.error || 'Transformation failed')
      }
    }, 50)
  }, [activeTransformer, leftEditor.content, leftEditor.format, transformerOptions])

  const applyToEditor = useCallback(() => {
    if (!output) return
    setLeftContent(output)
    addToHistory(output, leftEditor.format)
    toast.success('Applied to editor')
  }, [output, setLeftContent, addToHistory, leftEditor.format])

  const copyOutput = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      toast.success('Copied!')
    } catch {
      toast.error('Failed to copy')
    }
  }, [output])

  const downloadOutput = useCallback(() => {
    if (!output) return
    const ext = activeTransformer === 'type-generator' ? 'ts' : 'json'
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transformed.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded!')
  }, [output, activeTransformer])

  const renderOptions = () => {
    if (!activeTransformer) return null

    switch (activeTransformer) {
      case 'redact':
        return (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Sensitive fields: {transformerOptions.redact.fields.join(', ')}
            </div>
            <label className="flex items-center justify-between">
              <span className="text-sm">Redact emails</span>
              <Switch
                checked={transformerOptions.redact.redactEmails}
                onCheckedChange={(v) => setTransformerOptions('redact', { redactEmails: v })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Redact phone numbers</span>
              <Switch
                checked={transformerOptions.redact.redactPhones}
                onCheckedChange={(v) => setTransformerOptions('redact', { redactPhones: v })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Redact credit cards</span>
              <Switch
                checked={transformerOptions.redact.redactCreditCards}
                onCheckedChange={(v) => setTransformerOptions('redact', { redactCreditCards: v })}
              />
            </label>
            <div>
              <label className="text-sm block mb-1">Replacement text</label>
              <input
                type="text"
                value={transformerOptions.redact.replacement}
                onChange={(e) => setTransformerOptions('redact', { replacement: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded border bg-background"
              />
            </div>
          </div>
        )

      case 'case-convert':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm block mb-1">Convert to</label>
              <Select
                value={transformerOptions.caseConvert.to}
                onChange={(e) => setTransformerOptions('caseConvert', { to: e.target.value as CaseType })}
                options={[
                  { value: 'camelCase', label: 'camelCase' },
                  { value: 'snake_case', label: 'snake_case' },
                  { value: 'kebab-case', label: 'kebab-case' },
                  { value: 'PascalCase', label: 'PascalCase' },
                ]}
              />
            </div>
          </div>
        )

      case 'flatten':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm block mb-1">Delimiter</label>
              <input
                type="text"
                value={transformerOptions.flatten.delimiter}
                onChange={(e) => setTransformerOptions('flatten', { delimiter: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded border bg-background"
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Max depth</label>
              <input
                type="number"
                min={1}
                max={20}
                value={transformerOptions.flatten.maxDepth}
                onChange={(e) => setTransformerOptions('flatten', { maxDepth: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-1.5 text-sm rounded border bg-background"
              />
            </div>
          </div>
        )

      case 'unflatten':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm block mb-1">Delimiter</label>
              <input
                type="text"
                value={transformerOptions.unflatten.delimiter}
                onChange={(e) => setTransformerOptions('unflatten', { delimiter: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded border bg-background"
              />
            </div>
          </div>
        )

      case 'remove-empty':
        return (
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">Remove nulls</span>
              <Switch
                checked={transformerOptions.removeEmpty.nulls}
                onCheckedChange={(v) => setTransformerOptions('removeEmpty', { nulls: v })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Remove empty strings</span>
              <Switch
                checked={transformerOptions.removeEmpty.emptyStrings}
                onCheckedChange={(v) => setTransformerOptions('removeEmpty', { emptyStrings: v })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Remove empty arrays</span>
              <Switch
                checked={transformerOptions.removeEmpty.emptyArrays}
                onCheckedChange={(v) => setTransformerOptions('removeEmpty', { emptyArrays: v })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Remove empty objects</span>
              <Switch
                checked={transformerOptions.removeEmpty.emptyObjects}
                onCheckedChange={(v) => setTransformerOptions('removeEmpty', { emptyObjects: v })}
              />
            </label>
          </div>
        )

      case 'type-generator':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm block mb-1">Language</label>
              <Select
                value={transformerOptions.typeGenerator.language}
                onChange={(e) =>
                  setTransformerOptions('typeGenerator', { language: e.target.value as 'typescript' | 'zod' })
                }
                options={[
                  { value: 'typescript', label: 'TypeScript' },
                  { value: 'zod', label: 'Zod Schema' },
                ]}
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Root type name</label>
              <input
                type="text"
                value={transformerOptions.typeGenerator.rootName}
                onChange={(e) => setTransformerOptions('typeGenerator', { rootName: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded border bg-background"
              />
            </div>
            {transformerOptions.typeGenerator.language === 'typescript' && (
              <label className="flex items-center justify-between">
                <span className="text-sm">Prefer type over interface</span>
                <Switch
                  checked={transformerOptions.typeGenerator.preferType}
                  onCheckedChange={(v) => setTransformerOptions('typeGenerator', { preferType: v })}
                />
              </label>
            )}
            <label className="flex items-center justify-between">
              <span className="text-sm">Optional properties</span>
              <Switch
                checked={transformerOptions.typeGenerator.optionalProperties}
                onCheckedChange={(v) => setTransformerOptions('typeGenerator', { optionalProperties: v })}
              />
            </label>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Transformer List */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Transformers</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {TRANSFORMERS.map((t) => {
            const Icon = t.icon
            const isActive = activeTransformer === t.id
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTransformer(t.id)
                  setOutput('')
                }}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-colors mb-1',
                  isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', isActive && 'text-primary')}>{t.name}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Options Panel */}
      <div className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <span className="text-sm font-medium">Options</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {activeTransformer ? (
            renderOptions()
          ) : (
            <div className="text-sm text-muted-foreground text-center mt-8">Select a transformer</div>
          )}
        </div>
        {activeTransformer && (
          <div className="p-3 border-t">
            <Button
              onClick={runTransformer}
              disabled={!leftEditor.content || isRunning}
              className="w-full"
              variant="gradient"
            >
              {isRunning ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Transformer
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Output Panel */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm font-medium">Output</span>
          {output && (
            <div className="flex items-center gap-1">
              {activeTransformer !== 'type-generator' && (
                <Button variant="ghost" size="sm" onClick={applyToEditor}>
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Apply
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" onClick={copyOutput}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={downloadOutput}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4">
          {output ? (
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">{output}</pre>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {activeTransformer ? 'Click "Run Transformer" to see output' : 'Select a transformer to begin'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
