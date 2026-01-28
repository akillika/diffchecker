import * as yaml from 'js-yaml'
import type { SensitiveMatch, SecurityScanResult, FormatType } from '@/types'

// Regex patterns for sensitive data detection
const PATTERNS = {
  // JWT: header.payload.signature (base64url encoded)
  jwt: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Phone numbers (various formats)
  phone: /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,

  // Credit card numbers (with or without separators)
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // API keys and tokens (common patterns)
  api_key: /(?:api[_-]?key|apikey|token|auth[_-]?token|access[_-]?token|bearer)['":\s]*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,

  // Generic secrets (long random-looking strings)
  secret: /['"][a-zA-Z0-9+/]{32,}['"]/g,
}

// Sensitive field names to check
const SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'api-key',
  'authorization',
  'auth',
  'bearer',
  'credential',
  'credentials',
  'private_key',
  'privatekey',
  'private-key',
  'access_token',
  'refresh_token',
  'session',
  'session_id',
  'sessionid',
  'cookie',
  'jwt',
  'key',
  'encryption_key',
  'aws_access_key',
  'aws_secret_key',
]

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

function truncateValue(value: string, maxLength = 30): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength / 2) + '...' + value.slice(-maxLength / 2)
}

function getLineNumber(content: string, substring: string): number | undefined {
  const index = content.indexOf(substring)
  if (index === -1) return undefined

  const lines = content.substring(0, index).split('\n')
  return lines.length
}

function scanValue(
  value: string,
  path: string,
  content: string,
  matches: SensitiveMatch[]
): void {
  // Check for JWT
  const jwtMatches = value.match(PATTERNS.jwt)
  if (jwtMatches) {
    jwtMatches.forEach((match) => {
      matches.push({
        path,
        type: 'jwt',
        value: match,
        line: getLineNumber(content, match),
        preview: truncateValue(match),
      })
    })
  }

  // Check for emails
  const emailMatches = value.match(PATTERNS.email)
  if (emailMatches) {
    emailMatches.forEach((match) => {
      matches.push({
        path,
        type: 'email',
        value: match,
        line: getLineNumber(content, match),
        preview: match,
      })
    })
  }

  // Check for phone numbers
  const phoneMatches = value.match(PATTERNS.phone)
  if (phoneMatches) {
    phoneMatches.forEach((match) => {
      // Filter out short numbers that might be false positives
      if (match.replace(/\D/g, '').length >= 10) {
        matches.push({
          path,
          type: 'phone',
          value: match,
          line: getLineNumber(content, match),
          preview: match,
        })
      }
    })
  }

  // Check for credit cards
  const ccMatches = value.match(PATTERNS.credit_card)
  if (ccMatches) {
    ccMatches.forEach((match) => {
      matches.push({
        path,
        type: 'credit_card',
        value: match,
        line: getLineNumber(content, match),
        preview: truncateValue(match),
      })
    })
  }

  // Check for long random strings that might be secrets
  if (value.length >= 32 && /^[a-zA-Z0-9+/=_-]+$/.test(value)) {
    // Check entropy - high entropy suggests a secret
    const entropy = calculateEntropy(value)
    if (entropy > 4.0) {
      matches.push({
        path,
        type: 'secret',
        value,
        line: getLineNumber(content, value),
        preview: truncateValue(value),
      })
    }
  }
}

function calculateEntropy(str: string): number {
  const freq: Record<string, number> = {}
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1
  }

  let entropy = 0
  const len = str.length
  for (const char in freq) {
    const p = freq[char] / len
    entropy -= p * Math.log2(p)
  }

  return entropy
}

function scanObjectDeep(
  obj: unknown,
  path: string,
  content: string,
  matches: SensitiveMatch[]
): void {
  if (obj === null || obj === undefined) return

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      scanObjectDeep(item, `${path}[${index}]`, content, matches)
    })
    return
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const keyPath = path ? `${path}.${key}` : key

      // Check if the key name suggests sensitive data
      const keyLower = key.toLowerCase()
      if (SENSITIVE_FIELDS.some((field) => keyLower.includes(field))) {
        if (typeof value === 'string' && value.length > 0) {
          matches.push({
            path: keyPath,
            type: 'api_key',
            value: value,
            line: getLineNumber(content, value),
            preview: truncateValue(value),
          })
        }
      }

      scanObjectDeep(value, keyPath, content, matches)
    }
    return
  }

  if (typeof obj === 'string') {
    scanValue(obj, path, content, matches)
  }
}

export function scanForSensitiveData(
  content: string,
  format: FormatType
): SecurityScanResult {
  const matches: SensitiveMatch[] = []

  try {
    const data = parseContent(content, format)
    if (data !== undefined) {
      scanObjectDeep(data, '', content, matches)
    }

    // Also scan raw content for patterns that might be in comments or strings
    const apiKeyMatches = content.matchAll(PATTERNS.api_key)
    for (const match of apiKeyMatches) {
      const value = match[1] || match[0]
      // Avoid duplicates
      if (!matches.some((m) => m.value === value)) {
        matches.push({
          path: '$raw',
          type: 'api_key',
          value,
          line: getLineNumber(content, value),
          preview: truncateValue(value),
        })
      }
    }
  } catch {
    // If parsing fails, scan raw content only
    const jwtMatches = content.match(PATTERNS.jwt)
    if (jwtMatches) {
      jwtMatches.forEach((match) => {
        matches.push({
          path: '$raw',
          type: 'jwt',
          value: match,
          line: getLineNumber(content, match),
          preview: truncateValue(match),
        })
      })
    }
  }

  // Deduplicate matches based on value
  const uniqueMatches = matches.filter(
    (match, index, self) =>
      index === self.findIndex((m) => m.value === match.value && m.path === match.path)
  )

  const summary = {
    jwt: uniqueMatches.filter((m) => m.type === 'jwt').length,
    api_key: uniqueMatches.filter((m) => m.type === 'api_key').length,
    email: uniqueMatches.filter((m) => m.type === 'email').length,
    phone: uniqueMatches.filter((m) => m.type === 'phone').length,
    secret: uniqueMatches.filter((m) => m.type === 'secret').length,
    credit_card: uniqueMatches.filter((m) => m.type === 'credit_card').length,
    total: uniqueMatches.length,
  }

  return { matches: uniqueMatches, summary }
}

export function getSensitiveTypeLabel(type: SensitiveMatch['type']): string {
  switch (type) {
    case 'jwt':
      return 'JWT Token'
    case 'api_key':
      return 'API Key'
    case 'email':
      return 'Email'
    case 'phone':
      return 'Phone'
    case 'secret':
      return 'Secret'
    case 'credit_card':
      return 'Credit Card'
    default:
      return 'Unknown'
  }
}

export function getSensitiveTypeColor(type: SensitiveMatch['type']): string {
  switch (type) {
    case 'jwt':
      return 'bg-purple-500/20 text-purple-500 border-purple-500/30'
    case 'api_key':
      return 'bg-red-500/20 text-red-500 border-red-500/30'
    case 'email':
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
    case 'phone':
      return 'bg-green-500/20 text-green-500 border-green-500/30'
    case 'secret':
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
    case 'credit_card':
      return 'bg-pink-500/20 text-pink-500 border-pink-500/30'
    default:
      return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
  }
}
