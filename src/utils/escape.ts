/**
 * Escape and unescape utilities for JSON strings
 */

/**
 * Escapes special characters in a string to their JSON escape sequences
 * This function escapes raw text, so if the text already contains escape sequences,
 * they will be double-escaped (which is the expected behavior for raw text escaping)
 * @param text - The text to escape
 * @returns The escaped text
 */
export function escapeJson(text: string): string {
  // Use a more robust approach that handles all JSON escape sequences
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    switch (char) {
      case '\\':
        result += '\\\\'
        break
      case '"':
        result += '\\"'
        break
      case '\n':
        result += '\\n'
        break
      case '\r':
        result += '\\r'
        break
      case '\t':
        result += '\\t'
        break
      case '\f':
        result += '\\f'
        break
      case '\b':
        result += '\\b'
        break
      default:
        // Handle control characters (0x00-0x1F) as Unicode escapes
        if (char.charCodeAt(0) < 0x20) {
          const code = char.charCodeAt(0)
          const hex = code.toString(16)
          // Pad to 4 digits manually for compatibility
          const paddedHex = '0'.repeat(4 - hex.length) + hex
          result += `\\u${paddedHex}`
        } else {
          result += char
        }
    }
  }
  return result
}

/**
 * Unescapes JSON escape sequences back to their actual characters
 * Handles standard escape sequences and Unicode escapes
 * @param text - The text to unescape
 * @param recursive - If true, unescape until no more escape sequences are found (default: false)
 * @returns The unescaped text
 */
export function unescapeJson(text: string, recursive = false): string {
  let result = ''
  let i = 0
  while (i < text.length) {
    if (text[i] === '\\' && i + 1 < text.length) {
      const next = text[i + 1]
      switch (next) {
        case '\\':
          result += '\\'
          i += 2
          break
        case '"':
          result += '"'
          i += 2
          break
        case 'n':
          result += '\n'
          i += 2
          break
        case 'r':
          result += '\r'
          i += 2
          break
        case 't':
          result += '\t'
          i += 2
          break
        case 'f':
          result += '\f'
          i += 2
          break
        case 'b':
          result += '\b'
          i += 2
          break
        case 'u':
          // Handle Unicode escape sequences \uXXXX
          if (i + 5 < text.length) {
            const hex = text.substring(i + 2, i + 6)
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              result += String.fromCharCode(parseInt(hex, 16))
              i += 6
            } else {
              // Invalid Unicode escape, keep as is
              result += text[i] + next
              i += 2
            }
          } else {
            // Incomplete Unicode escape, keep as is
            result += text[i] + next
            i += 2
          }
          break
        default:
          // Unknown escape sequence, keep backslash and next char
          result += text[i] + next
          i += 2
      }
    } else {
      result += text[i]
      i++
    }
  }
  
  // If recursive mode and there are still escape sequences, unescape again
  if (recursive && isEscaped(result)) {
    return unescapeJson(result, true)
  }
  
  return result
}

/**
 * Detects if text appears to be escaped JSON
 * Checks for common escape sequences that indicate the text is already escaped
 * Uses a heuristic: if there are escape sequences but few actual special characters,
 * the content is likely already escaped
 * @param text - The text to check
 * @returns True if the text appears to be escaped
 */
export function isEscaped(text: string): boolean {
  if (!text) return false
  
  // Count escape sequences
  const escapeCount = countEscapeSequences(text)
  
  // Count actual special characters (newlines, tabs, quotes, backslashes)
  let actualSpecialChars = 0
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '\n' || char === '\t' || char === '"' || char === '\\' || char.charCodeAt(0) < 0x20) {
      actualSpecialChars++
    }
  }
  
  // If we have escape sequences but few actual special characters, it's likely escaped
  // Also check for common escape patterns
  const escapePattern = /\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/
  const hasEscapePattern = escapePattern.test(text)
  
  // Heuristic: if escape sequences exist and actual special chars are much fewer, it's escaped
  return hasEscapePattern && (escapeCount.total > actualSpecialChars * 0.5 || escapeCount.total > 2)
}

/**
 * Counts escape sequences in text
 * @param text - The text to analyze
 * @returns Object with counts of different escape sequences
 */
export function countEscapeSequences(text: string): {
  total: number
  newlines: number
  tabs: number
  quotes: number
  backslashes: number
  unicode: number
  others: number
} {
  const counts = {
    total: 0,
    newlines: 0,
    tabs: 0,
    quotes: 0,
    backslashes: 0,
    unicode: 0,
    others: 0,
  }

  if (!text) return counts

  let i = 0
  while (i < text.length) {
    if (text[i] === '\\' && i + 1 < text.length) {
      const next = text[i + 1]
      counts.total++
      
      switch (next) {
        case 'n':
          counts.newlines++
          i += 2
          break
        case 't':
          counts.tabs++
          i += 2
          break
        case '"':
          counts.quotes++
          i += 2
          break
        case '\\':
          counts.backslashes++
          i += 2
          break
        case 'u':
          if (i + 5 < text.length && /^[0-9a-fA-F]{4}$/.test(text.substring(i + 2, i + 6))) {
            counts.unicode++
            i += 6
          } else {
            counts.others++
            i += 2
          }
          break
        case 'r':
        case 'f':
        case 'b':
          counts.others++
          i += 2
          break
        default:
          counts.others++
          i += 2
      }
    } else {
      i++
    }
  }

  return counts
}

/**
 * Counts special characters that would be escaped
 * @param text - The text to analyze
 * @returns Object with counts of special characters
 */
export function countSpecialCharacters(text: string): {
  total: number
  newlines: number
  tabs: number
  quotes: number
  backslashes: number
  controlChars: number
} {
  const counts = {
    total: 0,
    newlines: 0,
    tabs: 0,
    quotes: 0,
    backslashes: 0,
    controlChars: 0,
  }

  if (!text) return counts

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)
    
    switch (char) {
      case '\n':
        counts.newlines++
        counts.total++
        break
      case '\t':
        counts.tabs++
        counts.total++
        break
      case '"':
        counts.quotes++
        counts.total++
        break
      case '\\':
        counts.backslashes++
        counts.total++
        break
      default:
        if (code < 0x20) {
          counts.controlChars++
          counts.total++
        }
    }
  }

  return counts
}
