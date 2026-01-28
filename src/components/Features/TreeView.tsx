import { useState, useMemo, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { detectFormat } from '@/utils/formatters'
import * as yaml from 'js-yaml'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  ChevronDown,
  Braces,
  Brackets,
  Hash,
  ToggleLeft,
  Type,
  CircleDashed,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TreeNodeProps {
  name: string
  value: unknown
  depth: number
  isLast?: boolean
  path: string
}

function getValueType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'object':
      return <Braces className="h-3.5 w-3.5 text-purple-500" />
    case 'array':
      return <Brackets className="h-3.5 w-3.5 text-blue-500" />
    case 'number':
      return <Hash className="h-3.5 w-3.5 text-green-500" />
    case 'boolean':
      return <ToggleLeft className="h-3.5 w-3.5 text-amber-500" />
    case 'string':
      return <Type className="h-3.5 w-3.5 text-rose-500" />
    case 'null':
      return <CircleDashed className="h-3.5 w-3.5 text-gray-500" />
    default:
      return null
  }
}

function TreeNode({ name, value, depth, path }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)
  const type = getValueType(value)
  const isExpandable = type === 'object' || type === 'array'

  const childEntries = useMemo(() => {
    if (type === 'object' && value !== null) {
      return Object.entries(value as Record<string, unknown>)
    }
    if (type === 'array') {
      return (value as unknown[]).map((v, i) => [i.toString(), v] as [string, unknown])
    }
    return []
  }, [value, type])

  const toggleExpand = useCallback(() => {
    if (isExpandable) {
      setIsExpanded(!isExpanded)
    }
  }, [isExpandable, isExpanded])

  const renderValue = () => {
    if (type === 'string') {
      const strValue = value as string
      const truncated = strValue.length > 50 ? `${strValue.slice(0, 50)}...` : strValue
      return <span className="text-rose-500">"{truncated}"</span>
    }
    if (type === 'number') {
      return <span className="text-green-500">{value as number}</span>
    }
    if (type === 'boolean') {
      return <span className="text-amber-500">{(value as boolean).toString()}</span>
    }
    if (type === 'null') {
      return <span className="text-gray-500">null</span>
    }
    if (type === 'object') {
      return <span className="text-muted-foreground">{`{${childEntries.length}}`}</span>
    }
    if (type === 'array') {
      return <span className="text-muted-foreground">{`[${childEntries.length}]`}</span>
    }
    return null
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer',
          depth === 0 && 'font-medium'
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={toggleExpand}
      >
        {isExpandable ? (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}
        {getTypeIcon(type)}
        <span className="text-sm font-mono">
          <span className="text-foreground">{name}</span>
          <span className="text-muted-foreground">: </span>
          {renderValue()}
        </span>
      </div>
      <AnimatePresence>
        {isExpanded && isExpandable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {childEntries.map(([key, val], index) => (
              <TreeNode
                key={`${path}.${key}`}
                name={key}
                value={val}
                depth={depth + 1}
                isLast={index === childEntries.length - 1}
                path={`${path}.${key}`}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TreeView() {
  const { leftEditor } = useAppStore()

  const parsedData = useMemo(() => {
    if (!leftEditor.content.trim()) return null
    try {
      const format = leftEditor.format === 'auto' ? detectFormat(leftEditor.content) : leftEditor.format
      if (format === 'json') {
        return JSON.parse(leftEditor.content)
      } else {
        return yaml.load(leftEditor.content)
      }
    } catch {
      return null
    }
  }, [leftEditor.content, leftEditor.format])

  if (!parsedData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Braces className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No valid data</p>
          <p className="text-sm mt-1">Enter valid JSON or YAML to see the tree view</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 font-mono text-sm">
      <TreeNode
        name="root"
        value={parsedData}
        depth={0}
        isLast={true}
        path="root"
      />
    </div>
  )
}
