import * as yaml from 'js-yaml'
import type {
  TransformerResult,
  TransformerOptions,
  CaseType,
  FormatType,
} from '@/types'

// ============ HELPERS ============

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

function stringifyContent(data: unknown, format: FormatType, indent = 2): string {
  if (format === 'yaml') {
    return yaml.dump(data, { indent, lineWidth: -1, noRefs: true })
  }
  return JSON.stringify(data, null, indent)
}

// ============ CASE CONVERSION ============

// Detect case from string (unused but kept for potential future use)
// function detectCase(str: string): CaseType {
//   if (str.includes('-')) return 'kebab-case'
//   if (str.includes('_')) return 'snake_case'
//   if (str[0] === str[0].toUpperCase() && str.length > 1) return 'PascalCase'
//   return 'camelCase'
// }

function toWords(str: string): string[] {
  // Handle kebab and snake case
  if (str.includes('-')) return str.split('-')
  if (str.includes('_')) return str.split('_')

  // Handle camelCase and PascalCase
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(' ')
}

function toCamelCase(words: string[]): string {
  return words
    .map((word, i) => (i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join('')
}

function toSnakeCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join('_')
}

function toKebabCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join('-')
}

function toPascalCase(words: string[]): string {
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')
}

function convertCase(str: string, to: CaseType): string {
  const words = toWords(str)
  switch (to) {
    case 'camelCase':
      return toCamelCase(words)
    case 'snake_case':
      return toSnakeCase(words)
    case 'kebab-case':
      return toKebabCase(words)
    case 'PascalCase':
      return toPascalCase(words)
    default:
      return str
  }
}

function convertKeysDeep(obj: unknown, to: CaseType): { result: unknown; count: number } {
  let count = 0

  function convert(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(convert)
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const newKey = convertCase(key, to)
        if (newKey !== key) count++
        result[newKey] = convert(val)
      }
      return result
    }
    return value
  }

  return { result: convert(obj), count }
}

// ============ REDACTION ============

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g

function redactValue(value: string, options: TransformerOptions['redact']): string {
  let result = value

  if (options.redactEmails) {
    result = result.replace(EMAIL_REGEX, options.replacement)
  }
  if (options.redactPhones) {
    result = result.replace(PHONE_REGEX, options.replacement)
  }
  if (options.redactCreditCards) {
    result = result.replace(CREDIT_CARD_REGEX, options.replacement)
  }

  return result
}

function redactDeep(
  obj: unknown,
  options: TransformerOptions['redact']
): { result: unknown; count: number } {
  let count = 0
  const fieldsLower = options.fields.map((f) => f.toLowerCase())

  function redact(value: unknown, key?: string): unknown {
    // Check if key matches sensitive field
    if (key && fieldsLower.includes(key.toLowerCase())) {
      count++
      return options.replacement
    }

    if (Array.isArray(value)) {
      return value.map((v) => redact(v))
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        result[k] = redact(v, k)
      }
      return result
    }

    if (typeof value === 'string') {
      const redacted = redactValue(value, options)
      if (redacted !== value) count++
      return redacted
    }

    return value
  }

  return { result: redact(obj), count }
}

// ============ FLATTEN / UNFLATTEN ============

function flattenObject(
  obj: unknown,
  delimiter: string,
  maxDepth: number,
  prefix = '',
  depth = 0
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (depth >= maxDepth || obj === null || typeof obj !== 'object') {
    if (prefix) {
      result[prefix] = obj
    }
    return result
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const key = prefix ? `${prefix}${delimiter}${index}` : `${index}`
      Object.assign(result, flattenObject(item, delimiter, maxDepth, key, depth + 1))
    })
  } else {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const newKey = prefix ? `${prefix}${delimiter}${key}` : key
      if (value !== null && typeof value === 'object') {
        Object.assign(result, flattenObject(value, delimiter, maxDepth, newKey, depth + 1))
      } else {
        result[newKey] = value
      }
    }
  }

  return result
}

function unflattenObject(obj: Record<string, unknown>, delimiter: string): unknown {
  const result: Record<string, unknown> = {}

  for (const [flatKey, value] of Object.entries(obj)) {
    const keys = flatKey.split(delimiter)
    let current: Record<string, unknown> = result

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      const nextKey = keys[i + 1]
      const isArrayIndex = /^\d+$/.test(nextKey)

      if (!(key in current)) {
        current[key] = isArrayIndex ? [] : {}
      }
      current = current[key] as Record<string, unknown>
    }

    const lastKey = keys[keys.length - 1]
    current[lastKey] = value
  }

  return result
}

// ============ REMOVE EMPTY ============

function removeEmptyDeep(
  obj: unknown,
  options: TransformerOptions['removeEmpty']
): { result: unknown; count: number } {
  let count = 0

  function isEmpty(value: unknown): boolean {
    if (value === null && options.nulls) return true
    if (value === '' && options.emptyStrings) return true
    if (Array.isArray(value) && value.length === 0 && options.emptyArrays) return true
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0 &&
      options.emptyObjects
    )
      return true
    return false
  }

  function clean(value: unknown): unknown {
    if (Array.isArray(value)) {
      const cleaned = value
        .map(clean)
        .filter((v) => {
          if (isEmpty(v)) {
            count++
            return false
          }
          return true
        })
      return cleaned
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const cleaned = clean(v)
        if (!isEmpty(cleaned)) {
          result[k] = cleaned
        } else {
          count++
        }
      }
      return result
    }

    return value
  }

  return { result: clean(obj), count }
}

// ============ TYPE GENERATOR ============

function inferType(value: unknown, seen = new Set<unknown>()): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'
    // Get unique types in array
    const types = new Set(value.map((v) => inferType(v, seen)))
    if (types.size === 1) {
      return `${Array.from(types)[0]}[]`
    }
    return `(${Array.from(types).join(' | ')})[]`
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return 'unknown' // Circular reference
    seen.add(value)
    return 'object'
  }

  return 'unknown'
}

function generateTypeScript(
  data: unknown,
  options: TransformerOptions['typeGenerator'],
  name = options.rootName,
  indent = 0
): string {
  const spaces = '  '.repeat(indent)
  const keyword = options.preferType ? 'type' : 'interface'
  const optional = options.optionalProperties ? '?' : ''

  if (data === null || data === undefined) {
    return `${spaces}${keyword} ${name} = null;`
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `${spaces}${keyword} ${name} = unknown[];`
    }

    const first = data[0]
    if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
      const itemType = generateTypeScript(first, options, `${name}Item`, indent)
      return `${itemType}\n\n${spaces}${keyword} ${name} = ${name}Item[];`
    }

    return `${spaces}${keyword} ${name} = ${inferType(data)}[];`
  }

  if (typeof data !== 'object') {
    return `${spaces}${keyword} ${name} = ${typeof data};`
  }

  const entries = Object.entries(data as Record<string, unknown>)
  const nestedTypes: string[] = []
  const props: string[] = []

  for (const [key, value] of entries) {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nestedName = `${name}${key.charAt(0).toUpperCase() + key.slice(1)}`
      nestedTypes.push(generateTypeScript(value, options, nestedName, indent))
      props.push(`${spaces}  ${safeKey}${optional}: ${nestedName};`)
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      const itemName = `${name}${key.charAt(0).toUpperCase() + key.slice(1)}Item`
      nestedTypes.push(generateTypeScript(value[0], options, itemName, indent))
      props.push(`${spaces}  ${safeKey}${optional}: ${itemName}[];`)
    } else {
      props.push(`${spaces}  ${safeKey}${optional}: ${inferType(value)};`)
    }
  }

  const mainType = options.preferType
    ? `${spaces}type ${name} = {\n${props.join('\n')}\n${spaces}};`
    : `${spaces}interface ${name} {\n${props.join('\n')}\n${spaces}}`

  if (nestedTypes.length > 0) {
    return nestedTypes.join('\n\n') + '\n\n' + mainType
  }

  return mainType
}

function generateZodSchema(
  data: unknown,
  options: TransformerOptions['typeGenerator'],
  name = options.rootName,
  indent = 0
): string {
  const spaces = '  '.repeat(indent)

  if (data === null) return `${spaces}const ${name} = z.null();`
  if (data === undefined) return `${spaces}const ${name} = z.undefined();`

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `${spaces}const ${name} = z.array(z.unknown());`
    }

    const first = data[0]
    if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
      const itemSchema = generateZodSchema(first, options, `${name}Item`, indent)
      return `${itemSchema}\n\n${spaces}const ${name} = z.array(${name}Item);`
    }

    const itemType = typeof first === 'string' ? 'z.string()' :
                     typeof first === 'number' ? 'z.number()' :
                     typeof first === 'boolean' ? 'z.boolean()' : 'z.unknown()'
    return `${spaces}const ${name} = z.array(${itemType});`
  }

  if (typeof data !== 'object') {
    const zodType = typeof data === 'string' ? 'z.string()' :
                    typeof data === 'number' ? 'z.number()' :
                    typeof data === 'boolean' ? 'z.boolean()' : 'z.unknown()'
    return `${spaces}const ${name} = ${zodType};`
  }

  const entries = Object.entries(data as Record<string, unknown>)
  const nestedSchemas: string[] = []
  const props: string[] = []

  for (const [key, value] of entries) {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
    const optional = options.optionalProperties ? '.optional()' : ''

    if (value === null) {
      props.push(`${spaces}    ${safeKey}: z.null()${optional},`)
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nestedName = `${name}${key.charAt(0).toUpperCase() + key.slice(1)}Schema`
      nestedSchemas.push(generateZodSchema(value, options, nestedName, indent))
      props.push(`${spaces}    ${safeKey}: ${nestedName}${optional},`)
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        const itemName = `${name}${key.charAt(0).toUpperCase() + key.slice(1)}ItemSchema`
        nestedSchemas.push(generateZodSchema(value[0], options, itemName, indent))
        props.push(`${spaces}    ${safeKey}: z.array(${itemName})${optional},`)
      } else {
        const itemType = value.length > 0
          ? (typeof value[0] === 'string' ? 'z.string()' :
             typeof value[0] === 'number' ? 'z.number()' :
             typeof value[0] === 'boolean' ? 'z.boolean()' : 'z.unknown()')
          : 'z.unknown()'
        props.push(`${spaces}    ${safeKey}: z.array(${itemType})${optional},`)
      }
    } else {
      const zodType = typeof value === 'string' ? 'z.string()' :
                      typeof value === 'number' ? 'z.number()' :
                      typeof value === 'boolean' ? 'z.boolean()' : 'z.unknown()'
      props.push(`${spaces}    ${safeKey}: ${zodType}${optional},`)
    }
  }

  const mainSchema = `${spaces}const ${name} = z.object({\n${props.join('\n')}\n${spaces}  });`

  if (nestedSchemas.length > 0) {
    return nestedSchemas.join('\n\n') + '\n\n' + mainSchema
  }

  return `${spaces}import { z } from 'zod';\n\n` + mainSchema
}

// ============ MAIN TRANSFORMER FUNCTIONS ============

export function transformRedact(
  content: string,
  format: FormatType,
  options: TransformerOptions['redact']
): TransformerResult {
  try {
    const data = parseContent(content, format)
    if (data === undefined) {
      return { success: false, error: 'Invalid content' }
    }

    const { result, count } = redactDeep(data, options)
    const output = stringifyContent(result, format === 'auto' ? 'json' : format)

    return {
      success: true,
      output,
      stats: { fieldsRedacted: count },
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export function transformCaseConvert(
  content: string,
  format: FormatType,
  options: TransformerOptions['caseConvert']
): TransformerResult {
  try {
    const data = parseContent(content, format)
    if (data === undefined) {
      return { success: false, error: 'Invalid content' }
    }

    const { result, count } = convertKeysDeep(data, options.to)
    const output = stringifyContent(result, format === 'auto' ? 'json' : format)

    return {
      success: true,
      output,
      stats: { keysChanged: count },
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export function transformFlatten(
  content: string,
  format: FormatType,
  options: TransformerOptions['flatten']
): TransformerResult {
  try {
    const data = parseContent(content, format)
    if (data === undefined) {
      return { success: false, error: 'Invalid content' }
    }

    const result = flattenObject(data, options.delimiter, options.maxDepth)
    const output = stringifyContent(result, format === 'auto' ? 'json' : format)

    return {
      success: true,
      output,
      stats: { keysChanged: Object.keys(result).length },
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export function transformUnflatten(
  content: string,
  format: FormatType,
  options: TransformerOptions['unflatten']
): TransformerResult {
  try {
    const data = parseContent(content, format)
    if (data === undefined || typeof data !== 'object' || Array.isArray(data)) {
      return { success: false, error: 'Content must be a flat object' }
    }

    const result = unflattenObject(data as Record<string, unknown>, options.delimiter)
    const output = stringifyContent(result, format === 'auto' ? 'json' : format)

    return { success: true, output }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export function transformRemoveEmpty(
  content: string,
  format: FormatType,
  options: TransformerOptions['removeEmpty']
): TransformerResult {
  try {
    const data = parseContent(content, format)
    if (data === undefined) {
      return { success: false, error: 'Invalid content' }
    }

    const { result, count } = removeEmptyDeep(data, options)
    const output = stringifyContent(result, format === 'auto' ? 'json' : format)

    return {
      success: true,
      output,
      stats: { itemsRemoved: count },
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export function transformTypeGenerator(
  content: string,
  format: FormatType,
  options: TransformerOptions['typeGenerator']
): TransformerResult {
  try {
    const data = parseContent(content, format)
    if (data === undefined) {
      return { success: false, error: 'Invalid content' }
    }

    const output = options.language === 'zod'
      ? generateZodSchema(data, options)
      : generateTypeScript(data, options)

    return { success: true, output }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
