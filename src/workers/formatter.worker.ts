/// <reference lib="webworker" />

import * as yaml from 'js-yaml'

interface FormatMessage {
  type: 'format' | 'minify' | 'validate' | 'convert'
  content: string
  format: 'json' | 'yaml'
  options?: {
    indentSize?: number
    sortKeys?: boolean
    removeNulls?: boolean
  }
  targetFormat?: 'json' | 'yaml'
}

interface FormatResult {
  type: 'success' | 'error'
  result?: string
  errors?: Array<{
    message: string
    line: number
    column: number
    severity: 'error' | 'warning'
    suggestion?: string
  }>
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
    return obj.filter((item) => item !== null).map(removeNullValues)
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

function formatJson(content: string, options: FormatMessage['options'] = {}): string {
  let parsed = JSON.parse(content)

  if (options.sortKeys) {
    parsed = sortObjectKeys(parsed)
  }

  if (options.removeNulls) {
    parsed = removeNullValues(parsed)
  }

  return JSON.stringify(parsed, null, options.indentSize ?? 2)
}

function formatYaml(content: string, options: FormatMessage['options'] = {}): string {
  let parsed = yaml.load(content)

  if (options.sortKeys) {
    parsed = sortObjectKeys(parsed)
  }

  if (options.removeNulls) {
    parsed = removeNullValues(parsed)
  }

  return yaml.dump(parsed, {
    indent: options.indentSize ?? 2,
    lineWidth: -1,
    noRefs: true,
  })
}

function minifyJson(content: string): string {
  const parsed = JSON.parse(content)
  return JSON.stringify(parsed)
}

function validateJson(content: string): FormatResult['errors'] {
  const errors: NonNullable<FormatResult['errors']> = []

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

    errors.push({
      message: error.message,
      line,
      column,
      severity: 'error',
    })
  }

  return errors
}

function validateYaml(content: string): FormatResult['errors'] {
  const errors: NonNullable<FormatResult['errors']> = []

  try {
    yaml.load(content)
  } catch (e) {
    const error = e as yaml.YAMLException
    errors.push({
      message: error.reason || error.message,
      line: error.mark?.line ? error.mark.line + 1 : 1,
      column: error.mark?.column ? error.mark.column + 1 : 1,
      severity: 'error',
    })
  }

  return errors
}

function jsonToYaml(content: string, options: FormatMessage['options'] = {}): string {
  let parsed = JSON.parse(content)

  if (options.sortKeys) {
    parsed = sortObjectKeys(parsed)
  }

  if (options.removeNulls) {
    parsed = removeNullValues(parsed)
  }

  return yaml.dump(parsed, {
    indent: options.indentSize ?? 2,
    lineWidth: -1,
    noRefs: true,
  })
}

function yamlToJson(content: string, options: FormatMessage['options'] = {}): string {
  let parsed = yaml.load(content)

  if (options.sortKeys) {
    parsed = sortObjectKeys(parsed)
  }

  if (options.removeNulls) {
    parsed = removeNullValues(parsed)
  }

  return JSON.stringify(parsed, null, options.indentSize ?? 2)
}

self.onmessage = (event: MessageEvent<FormatMessage>) => {
  const { type, content, format, options, targetFormat } = event.data
  let result: FormatResult

  try {
    switch (type) {
      case 'format':
        result = {
          type: 'success',
          result: format === 'json' ? formatJson(content, options) : formatYaml(content, options),
        }
        break

      case 'minify':
        result = {
          type: 'success',
          result: minifyJson(content),
        }
        break

      case 'validate': {
        const validationErrors = format === 'json' ? validateJson(content) : validateYaml(content)
        result = {
          type: validationErrors && validationErrors.length === 0 ? 'success' : 'error',
          errors: validationErrors,
        }
        break
      }

      case 'convert':
        if (targetFormat === 'yaml') {
          result = {
            type: 'success',
            result: jsonToYaml(content, options),
          }
        } else {
          result = {
            type: 'success',
            result: yamlToJson(content, options),
          }
        }
        break

      default:
        result = {
          type: 'error',
          errors: [{ message: 'Unknown operation', line: 1, column: 1, severity: 'error' }],
        }
    }
  } catch (e) {
    result = {
      type: 'error',
      errors: [{ message: (e as Error).message, line: 1, column: 1, severity: 'error' }],
    }
  }

  self.postMessage(result)
}

export {}
