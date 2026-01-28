import { useRef, useCallback, useEffect } from 'react'

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

export function useFormatWorker() {
  const workerRef = useRef<Worker | null>(null)
  const callbackRef = useRef<((result: FormatResult) => void) | null>(null)

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL('../workers/formatter.worker.ts', import.meta.url),
      { type: 'module' }
    )

    // Handle messages from worker
    workerRef.current.onmessage = (event: MessageEvent<FormatResult>) => {
      if (callbackRef.current) {
        callbackRef.current(event.data)
        callbackRef.current = null
      }
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const postMessage = useCallback(
    (message: FormatMessage): Promise<FormatResult> => {
      return new Promise((resolve) => {
        callbackRef.current = resolve
        workerRef.current?.postMessage(message)
      })
    },
    []
  )

  const format = useCallback(
    (content: string, format: 'json' | 'yaml', options?: FormatMessage['options']) => {
      return postMessage({ type: 'format', content, format, options })
    },
    [postMessage]
  )

  const minify = useCallback(
    (content: string) => {
      return postMessage({ type: 'minify', content, format: 'json' })
    },
    [postMessage]
  )

  const validate = useCallback(
    (content: string, format: 'json' | 'yaml') => {
      return postMessage({ type: 'validate', content, format })
    },
    [postMessage]
  )

  const convert = useCallback(
    (content: string, sourceFormat: 'json' | 'yaml', targetFormat: 'json' | 'yaml', options?: FormatMessage['options']) => {
      return postMessage({ type: 'convert', content, format: sourceFormat, targetFormat, options })
    },
    [postMessage]
  )

  return { format, minify, validate, convert }
}
