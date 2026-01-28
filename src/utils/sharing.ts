import LZString from 'lz-string'

import type { ViewMode, FormatType } from '@/types'

export interface SharedState {
  content: string
  format: FormatType
  rightContent?: string
  rightFormat?: FormatType
  viewMode?: ViewMode
}

/**
 * Compress and encode the state for URL sharing
 */
export function encodeSharedState(state: SharedState): string {
  const json = JSON.stringify(state)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return compressed
}

/**
 * Decode and decompress the state from URL
 */
export function decodeSharedState(encoded: string): SharedState | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded)
    if (!decompressed) return null
    return JSON.parse(decompressed) as SharedState
  } catch {
    return null
  }
}

/**
 * Generate a shareable URL
 */
export function generateShareUrl(state: SharedState): string {
  const encoded = encodeSharedState(state)
  const url = new URL(window.location.href)
  url.searchParams.set('share', encoded)
  return url.toString()
}

/**
 * Parse shared state from current URL
 */
export function parseShareUrl(): SharedState | null {
  const url = new URL(window.location.href)
  const encoded = url.searchParams.get('share')
  if (!encoded) return null
  return decodeSharedState(encoded)
}

/**
 * Clear share parameter from URL without page reload
 */
export function clearShareUrl(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('share')
  window.history.replaceState({}, '', url.toString())
}
