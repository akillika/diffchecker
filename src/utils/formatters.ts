import * as yaml from 'js-yaml'
import type { FormatType, ValidationError, FormatOptions } from '@/types'

export function detectFormat(content: string): FormatType {
  const trimmed = content.trim()
  if (!trimmed) return 'json'

  // Check for JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // Not valid JSON, might be YAML
    }
  }

  // Check for YAML indicators
  if (
    trimmed.includes(': ') ||
    trimmed.startsWith('---') ||
    /^[\w-]+:\s*$/m.test(trimmed) ||
    /^[\s]*-\s+/m.test(trimmed)
  ) {
    try {
      yaml.load(trimmed)
      return 'yaml'
    } catch {
      // Not valid YAML either
    }
  }

  // Default to JSON
  return 'json'
}

export function parseContent(content: string, format: FormatType): unknown {
  const actualFormat = format === 'auto' ? detectFormat(content) : format

  if (actualFormat === 'json') {
    return JSON.parse(content)
  } else {
    return yaml.load(content)
  }
}

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  } else if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {}
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
      })
    return sorted
  }
  return obj
}

function removeNullValues(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== null)
      .map(removeNullValues)
  } else if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
      if (value !== null) {
        result[key] = removeNullValues(value)
      }
    })
    return result
  }
  return obj
}

export function formatJson(content: string, options: FormatOptions): string {
  let parsed = JSON.parse(content)

  if (options.sortKeys) {
    parsed = sortObjectKeys(parsed)
  }

  if (options.removeNulls) {
    parsed = removeNullValues(parsed)
  }

  return JSON.stringify(parsed, null, options.indentSize)
}

export function minifyJson(content: string): string {
  const parsed = JSON.parse(content)
  return JSON.stringify(parsed)
}

export function formatYaml(content: string, options: FormatOptions): string {
  let parsed = yaml.load(content)

  if (options.sortKeys) {
    parsed = sortObjectKeys(parsed)
  }

  if (options.removeNulls) {
    parsed = removeNullValues(parsed)
  }

  return yaml.dump(parsed, {
    indent: options.indentSize,
    lineWidth: -1,
    noRefs: true,
  })
}

export function jsonToYaml(content: string, options: FormatOptions): string {
  let parsed = JSON.parse(content)

  if (options.sortKeys) {
    parsed = sortObjectKeys(parsed)
  }

  if (options.removeNulls) {
    parsed = removeNullValues(parsed)
  }

  return yaml.dump(parsed, {
    indent: options.indentSize,
    lineWidth: -1,
    noRefs: true,
  })
}

export function yamlToJson(content: string, options: FormatOptions): string {
  let parsed = yaml.load(content)

  if (options.sortKeys) {
    parsed = sortObjectKeys(parsed)
  }

  if (options.removeNulls) {
    parsed = removeNullValues(parsed)
  }

  return JSON.stringify(parsed, null, options.indentSize)
}

export function validateJson(content: string): ValidationError[] {
  const errors: ValidationError[] = []

  if (!content.trim()) {
    return errors
  }

  try {
    JSON.parse(content)
  } catch (e) {
    const error = e as SyntaxError
    const match = error.message.match(/at position (\d+)/)
    let line = 1
    let column = 1

    if (match) {
      const position = parseInt(match[1], 10)
      const lines = content.substring(0, position).split('\n')
      line = lines.length
      column = lines[lines.length - 1].length + 1
    }

    // Try to extract more specific error info
    const message = error.message
      .replace(/^JSON\.parse: /, '')
      .replace(/at position \d+.*$/, '')
      .trim()

    let suggestion: string | undefined

    if (message.includes('Unexpected token')) {
      suggestion = 'Check for missing quotes, commas, or brackets'
    } else if (message.includes('Unexpected end')) {
      suggestion = 'The JSON appears to be incomplete. Check for missing closing brackets or braces'
    } else if (message.includes('Unexpected string')) {
      suggestion = 'Check for missing commas between elements'
    }

    errors.push({
      message: message || error.message,
      line,
      column,
      severity: 'error',
      suggestion,
    })
  }

  return errors
}

export function validateYaml(content: string): ValidationError[] {
  const errors: ValidationError[] = []

  if (!content.trim()) {
    return errors
  }

  try {
    yaml.load(content)
  } catch (e) {
    const error = e as yaml.YAMLException
    const mark = error.mark

    let suggestion: string | undefined

    if (error.message.includes('bad indentation')) {
      suggestion = 'YAML requires consistent indentation. Use spaces, not tabs.'
    } else if (error.message.includes('unexpected end')) {
      suggestion = 'Check for incomplete key-value pairs or missing values'
    } else if (error.message.includes('duplicated mapping key')) {
      suggestion = 'Remove or rename the duplicate key'
    }

    errors.push({
      message: error.reason || error.message,
      line: mark?.line ? mark.line + 1 : 1,
      column: mark?.column ? mark.column + 1 : 1,
      severity: 'error',
      suggestion,
    })
  }

  return errors
}

export function validate(content: string, format: FormatType): ValidationError[] {
  const actualFormat = format === 'auto' ? detectFormat(content) : format

  if (actualFormat === 'json') {
    return validateJson(content)
  } else {
    return validateYaml(content)
  }
}

export function isValidFormat(content: string, format: FormatType): boolean {
  return validate(content, format).length === 0
}
