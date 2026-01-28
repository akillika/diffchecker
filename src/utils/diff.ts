import * as diff from 'diff'
import * as yaml from 'js-yaml'
import type { DiffOptions, FormatType } from '@/types'

export interface DiffResult {
  left: DiffLine[]
  right: DiffLine[]
  hasDifferences: boolean
  addedCount: number
  removedCount: number
  modifiedCount: number
}

export interface DiffLine {
  lineNumber: number
  content: string
  type: 'unchanged' | 'added' | 'removed' | 'modified'
  wordDiff?: WordDiff[]
}

export interface WordDiff {
  value: string
  type: 'unchanged' | 'added' | 'removed'
}

function normalizeContent(content: string, format: FormatType, options: DiffOptions): string {
  try {
    let parsed: unknown

    // Parse content based on format
    if (format === 'json' || (format === 'auto' && (content.trim().startsWith('{') || content.trim().startsWith('[')))) {
      parsed = JSON.parse(content)
    } else {
      parsed = yaml.load(content)
    }

    // Apply diff options
    if (options.ignoreKeyOrder && typeof parsed === 'object' && parsed !== null) {
      parsed = sortObjectDeep(parsed)
    }

    if (options.ignoreArrayOrder && typeof parsed === 'object' && parsed !== null) {
      parsed = sortArraysDeep(parsed)
    }

    // Convert back to string for comparison
    let normalized = JSON.stringify(parsed, null, 2)

    if (options.ignoreWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ')
    }

    if (options.ignoreCase) {
      normalized = normalized.toLowerCase()
    }

    return normalized
  } catch {
    // If parsing fails, return original content
    let result = content
    if (options.ignoreWhitespace) {
      result = result.replace(/\s+/g, ' ')
    }
    if (options.ignoreCase) {
      result = result.toLowerCase()
    }
    return result
  }
}

function sortObjectDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectDeep)
  } else if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {}
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        sorted[key] = sortObjectDeep((obj as Record<string, unknown>)[key])
      })
    return sorted
  }
  return obj
}

function sortArraysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return [...obj].map(sortArraysDeep).sort((a, b) => {
      const aStr = JSON.stringify(a)
      const bStr = JSON.stringify(b)
      return aStr.localeCompare(bStr)
    })
  } else if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
      result[key] = sortArraysDeep(value)
    })
    return result
  }
  return obj
}

export function computeDiff(
  leftContent: string,
  rightContent: string,
  leftFormat: FormatType,
  rightFormat: FormatType,
  options: DiffOptions
): DiffResult {
  const normalizedLeft = normalizeContent(leftContent, leftFormat, options)
  const normalizedRight = normalizeContent(rightContent, rightFormat, options)

  const changes = diff.diffLines(normalizedLeft, normalizedRight)

  const leftLines: DiffLine[] = []
  const rightLines: DiffLine[] = []

  let leftLineNum = 0
  let rightLineNum = 0
  let addedCount = 0
  let removedCount = 0
  let modifiedCount = 0

  changes.forEach((change) => {
    const lines = change.value.split('\n').filter((_, i, arr) => i < arr.length - 1 || change.value.endsWith('\n') === false)

    if (change.added) {
      lines.forEach((line) => {
        rightLineNum++
        rightLines.push({
          lineNumber: rightLineNum,
          content: line,
          type: 'added',
        })
        addedCount++
      })
    } else if (change.removed) {
      lines.forEach((line) => {
        leftLineNum++
        leftLines.push({
          lineNumber: leftLineNum,
          content: line,
          type: 'removed',
        })
        removedCount++
      })
    } else {
      lines.forEach((line) => {
        leftLineNum++
        rightLineNum++
        leftLines.push({
          lineNumber: leftLineNum,
          content: line,
          type: 'unchanged',
        })
        rightLines.push({
          lineNumber: rightLineNum,
          content: line,
          type: 'unchanged',
        })
      })
    }
  })

  // Compute word diff if enabled
  if (options.showWordDiff) {
    computeWordDiff(leftLines, rightLines)
  }

  return {
    left: leftLines,
    right: rightLines,
    hasDifferences: addedCount > 0 || removedCount > 0 || modifiedCount > 0,
    addedCount,
    removedCount,
    modifiedCount,
  }
}

function computeWordDiff(leftLines: DiffLine[], rightLines: DiffLine[]): void {
  // Find pairs of removed/added lines that are likely modifications
  let leftIndex = 0
  let rightIndex = 0

  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    const leftLine = leftLines[leftIndex]
    const rightLine = rightLines[rightIndex]

    if (leftLine?.type === 'removed' && rightLine?.type === 'added') {
      // These are likely a modification pair
      const wordChanges = diff.diffWords(leftLine.content, rightLine.content)

      leftLine.wordDiff = []
      rightLine.wordDiff = []

      wordChanges.forEach((change) => {
        if (change.removed) {
          leftLine.wordDiff!.push({ value: change.value, type: 'removed' })
        } else if (change.added) {
          rightLine.wordDiff!.push({ value: change.value, type: 'added' })
        } else {
          leftLine.wordDiff!.push({ value: change.value, type: 'unchanged' })
          rightLine.wordDiff!.push({ value: change.value, type: 'unchanged' })
        }
      })

      leftIndex++
      rightIndex++
    } else if (leftLine?.type === 'removed') {
      leftIndex++
    } else if (rightLine?.type === 'added') {
      rightIndex++
    } else {
      leftIndex++
      rightIndex++
    }
  }
}

export function getSemanticDiff(
  leftContent: string,
  rightContent: string,
  leftFormat: FormatType,
  rightFormat: FormatType
): { path: string; leftValue: unknown; rightValue: unknown; type: 'added' | 'removed' | 'modified' }[] {
  const differences: { path: string; leftValue: unknown; rightValue: unknown; type: 'added' | 'removed' | 'modified' }[] = []

  try {
    let leftParsed: unknown
    let rightParsed: unknown

    // Parse left
    if (leftFormat === 'json' || (leftFormat === 'auto' && (leftContent.trim().startsWith('{') || leftContent.trim().startsWith('[')))) {
      leftParsed = JSON.parse(leftContent)
    } else {
      leftParsed = yaml.load(leftContent)
    }

    // Parse right
    if (rightFormat === 'json' || (rightFormat === 'auto' && (rightContent.trim().startsWith('{') || rightContent.trim().startsWith('[')))) {
      rightParsed = JSON.parse(rightContent)
    } else {
      rightParsed = yaml.load(rightContent)
    }

    // Compare recursively
    compareObjects(leftParsed, rightParsed, '', differences)
  } catch {
    // If parsing fails, return empty
  }

  return differences
}

function compareObjects(
  left: unknown,
  right: unknown,
  path: string,
  differences: { path: string; leftValue: unknown; rightValue: unknown; type: 'added' | 'removed' | 'modified' }[]
): void {
  if (left === right) return

  if (typeof left !== typeof right || Array.isArray(left) !== Array.isArray(right)) {
    differences.push({ path: path || '/', leftValue: left, rightValue: right, type: 'modified' })
    return
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLength = Math.max(left.length, right.length)
    for (let i = 0; i < maxLength; i++) {
      const itemPath = `${path}[${i}]`
      if (i >= left.length) {
        differences.push({ path: itemPath, leftValue: undefined, rightValue: right[i], type: 'added' })
      } else if (i >= right.length) {
        differences.push({ path: itemPath, leftValue: left[i], rightValue: undefined, type: 'removed' })
      } else {
        compareObjects(left[i], right[i], itemPath, differences)
      }
    }
  } else if (typeof left === 'object' && left !== null && right !== null) {
    const leftObj = left as Record<string, unknown>
    const rightObj = right as Record<string, unknown>
    const allKeys = new Set([...Object.keys(leftObj), ...Object.keys(rightObj)])

    allKeys.forEach((key) => {
      const keyPath = path ? `${path}.${key}` : key
      if (!(key in leftObj)) {
        differences.push({ path: keyPath, leftValue: undefined, rightValue: rightObj[key], type: 'added' })
      } else if (!(key in rightObj)) {
        differences.push({ path: keyPath, leftValue: leftObj[key], rightValue: undefined, type: 'removed' })
      } else {
        compareObjects(leftObj[key], rightObj[key], keyPath, differences)
      }
    })
  } else if (left !== right) {
    differences.push({ path: path || '/', leftValue: left, rightValue: right, type: 'modified' })
  }
}
