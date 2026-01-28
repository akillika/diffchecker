import * as yaml from 'js-yaml'
import type { SemanticChange, SemanticDiffResult, DiffOptions, FormatType } from '@/types'

function getType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function parseContent(content: string, format: FormatType): unknown {
  if (!content.trim()) return undefined

  const actualFormat = format === 'auto'
    ? (content.trim().startsWith('{') || content.trim().startsWith('[') ? 'json' : 'yaml')
    : format

  if (actualFormat === 'json') {
    return JSON.parse(content)
  }
  return yaml.load(content)
}

function sortObject(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObject)
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {}
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        sorted[key] = sortObject((obj as Record<string, unknown>)[key])
      })
    return sorted
  }
  return obj
}

function sortArray(arr: unknown[]): unknown[] {
  return [...arr].map(sortObject).sort((a, b) => {
    const aStr = JSON.stringify(a)
    const bStr = JSON.stringify(b)
    return aStr.localeCompare(bStr)
  })
}

function normalizeValue(value: unknown, options: DiffOptions): unknown {
  if (typeof value === 'string') {
    let normalized = value
    if (options.ignoreWhitespace) {
      normalized = normalized.trim().replace(/\s+/g, ' ')
    }
    if (options.ignoreCase) {
      normalized = normalized.toLowerCase()
    }
    return normalized
  }
  return value
}

function compareDeep(
  left: unknown,
  right: unknown,
  path: string,
  changes: SemanticChange[],
  options: DiffOptions
): void {
  const leftType = getType(left)
  const rightType = getType(right)

  // Type changed
  if (leftType !== rightType) {
    changes.push({
      path: path || '$',
      type: 'type_changed',
      oldValue: left,
      newValue: right,
      oldType: leftType,
      newType: rightType,
    })
    return
  }

  // Both null or undefined
  if (left === null || left === undefined) {
    if (left !== right) {
      changes.push({
        path: path || '$',
        type: 'modified',
        oldValue: left,
        newValue: right,
      })
    }
    return
  }

  // Arrays
  if (Array.isArray(left) && Array.isArray(right)) {
    let leftArr = left
    let rightArr = right

    if (options.ignoreArrayOrder) {
      leftArr = sortArray(left) as unknown[]
      rightArr = sortArray(right) as unknown[]
    }

    const maxLength = Math.max(leftArr.length, rightArr.length)
    for (let i = 0; i < maxLength; i++) {
      const itemPath = `${path}[${i}]`
      if (i >= leftArr.length) {
        changes.push({
          path: itemPath,
          type: 'added',
          newValue: rightArr[i],
        })
      } else if (i >= rightArr.length) {
        changes.push({
          path: itemPath,
          type: 'removed',
          oldValue: leftArr[i],
        })
      } else {
        compareDeep(leftArr[i], rightArr[i], itemPath, changes, options)
      }
    }
    return
  }

  // Objects
  if (typeof left === 'object' && typeof right === 'object') {
    const leftObj = (options.ignoreKeyOrder ? sortObject(left) : left) as Record<string, unknown>
    const rightObj = (options.ignoreKeyOrder ? sortObject(right) : right) as Record<string, unknown>

    const allKeys = new Set([...Object.keys(leftObj), ...Object.keys(rightObj)])

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key
      const hasLeft = key in leftObj
      const hasRight = key in rightObj

      if (!hasLeft && hasRight) {
        changes.push({
          path: keyPath,
          type: 'added',
          newValue: rightObj[key],
        })
      } else if (hasLeft && !hasRight) {
        changes.push({
          path: keyPath,
          type: 'removed',
          oldValue: leftObj[key],
        })
      } else {
        compareDeep(leftObj[key], rightObj[key], keyPath, changes, options)
      }
    }
    return
  }

  // Primitives
  const normalizedLeft = normalizeValue(left, options)
  const normalizedRight = normalizeValue(right, options)

  if (normalizedLeft !== normalizedRight) {
    changes.push({
      path: path || '$',
      type: 'modified',
      oldValue: left,
      newValue: right,
    })
  }
}

export function computeSemanticDiff(
  leftContent: string,
  rightContent: string,
  leftFormat: FormatType,
  rightFormat: FormatType,
  options: DiffOptions
): SemanticDiffResult {
  const changes: SemanticChange[] = []

  try {
    const left = parseContent(leftContent, leftFormat)
    const right = parseContent(rightContent, rightFormat)

    if (left === undefined && right === undefined) {
      return {
        changes: [],
        summary: { added: 0, removed: 0, modified: 0, typeChanged: 0, total: 0 },
        isIdentical: true,
      }
    }

    if (left === undefined) {
      changes.push({
        path: '$',
        type: 'added',
        newValue: right,
      })
    } else if (right === undefined) {
      changes.push({
        path: '$',
        type: 'removed',
        oldValue: left,
      })
    } else {
      compareDeep(left, right, '', changes, options)
    }
  } catch (error) {
    // If parsing fails, return error state
    return {
      changes: [{
        path: '$',
        type: 'modified',
        oldValue: `Parse error: ${(error as Error).message}`,
        newValue: undefined,
      }],
      summary: { added: 0, removed: 0, modified: 1, typeChanged: 0, total: 1 },
      isIdentical: false,
    }
  }

  const summary = {
    added: changes.filter((c) => c.type === 'added').length,
    removed: changes.filter((c) => c.type === 'removed').length,
    modified: changes.filter((c) => c.type === 'modified').length,
    typeChanged: changes.filter((c) => c.type === 'type_changed').length,
    total: changes.length,
  }

  return {
    changes,
    summary,
    isIdentical: changes.length === 0,
  }
}

export function formatValue(value: unknown, maxLength = 50): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'

  const str = typeof value === 'string' ? value : JSON.stringify(value)

  if (str.length > maxLength) {
    return str.slice(0, maxLength) + '...'
  }
  return str
}

export function getChangeBadgeColor(type: SemanticChange['type']): string {
  switch (type) {
    case 'added':
      return 'bg-green-500/20 text-green-500 border-green-500/30'
    case 'removed':
      return 'bg-red-500/20 text-red-500 border-red-500/30'
    case 'modified':
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
    case 'type_changed':
      return 'bg-purple-500/20 text-purple-500 border-purple-500/30'
    default:
      return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
  }
}
