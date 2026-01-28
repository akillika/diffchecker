import { useRef, useCallback, useEffect, useMemo } from 'react'
import Editor, { OnMount, OnChange, loader } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useAppStore } from '@/store/useAppStore'
import { useTheme } from '@/hooks/useTheme'
import { useFileUpload } from '@/hooks/useFileUpload'
import { detectFormat, validate } from '@/utils/formatters'
import { cn } from '@/lib/utils'
import debounce from 'lodash.debounce'
import type { FormatType, ValidationError } from '@/types'

// Configure Monaco loader
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
  },
})

interface MonacoEditorProps {
  side: 'left' | 'right'
  className?: string
}

export function MonacoEditor({ side, className }: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const decorationsRef = useRef<string[]>([])

  const { isDark } = useTheme()

  const {
    leftEditor,
    rightEditor,
    setLeftContent,
    setRightContent,
    setLeftFormat,
    setRightFormat,
    setLeftValidation,
    setRightValidation,
    monacoTheme,
    realTimeValidation,
  } = useAppStore()

  const editorState = side === 'left' ? leftEditor : rightEditor
  const setContent = side === 'left' ? setLeftContent : setRightContent
  const setFormat = side === 'left' ? setLeftFormat : setRightFormat
  const setValidation = side === 'left' ? setLeftValidation : setRightValidation

  // File upload handler
  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } = useFileUpload({
    onUpload: (content) => {
      setContent(content)
      const format = detectFormat(content)
      setFormat(format)
    },
  })

  // Debounced validation
  const debouncedValidate = useMemo(
    () =>
      debounce((content: string, format: FormatType) => {
        if (!realTimeValidation) return
        const errors = validate(content, format)
        setValidation(errors.length === 0, errors)
        updateDecorations(errors)
      }, 300),
    [realTimeValidation, setValidation]
  )

  // Update editor decorations for errors
  const updateDecorations = useCallback(
    (errors: ValidationError[]) => {
      if (!editorRef.current || !monacoRef.current) return

      const monaco = monacoRef.current
      const model = editorRef.current.getModel()
      if (!model) return

      const newDecorations = errors.map((error) => ({
        range: new monaco.Range(error.line, 1, error.line, model.getLineMaxColumn(error.line)),
        options: {
          isWholeLine: true,
          className: error.severity === 'error' ? 'error-line' : 'warning-line',
          glyphMarginClassName: error.severity === 'error' ? 'error-glyph' : 'warning-glyph',
          hoverMessage: {
            value: `**${error.severity.toUpperCase()}**: ${error.message}${error.suggestion ? `\n\n*Suggestion*: ${error.suggestion}` : ''}`,
          },
        },
      }))

      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations)
    },
    []
  )

  // Handle content change
  const handleChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) {
        setContent(value)

        // Auto-detect format
        if (editorState.format === 'auto') {
          const detected = detectFormat(value)
          if (detected !== editorState.format) {
            // Update language
            const model = editorRef.current?.getModel()
            if (model && monacoRef.current) {
              monacoRef.current.editor.setModelLanguage(model, detected === 'json' ? 'json' : 'yaml')
            }
          }
        }

        debouncedValidate(value, editorState.format)
      }
    },
    [setContent, editorState.format, debouncedValidate]
  )

  // Handle editor mount
  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco

      // Configure editor options
      editor.updateOptions({
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        padding: { top: 16, bottom: 16 },
        wordWrap: 'on',
        bracketPairColorization: { enabled: true },
        automaticLayout: true,
      })

      // Register custom themes
      monaco.editor.defineTheme('github-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
          { token: 'string', foreground: '9ecbff' },
          { token: 'number', foreground: '79b8ff' },
          { token: 'keyword', foreground: 'f97583' },
        ],
        colors: {
          'editor.background': '#0d1117',
          'editor.foreground': '#c9d1d9',
          'editorLineNumber.foreground': '#6e7681',
          'editorLineNumber.activeForeground': '#c9d1d9',
          'editor.selectionBackground': '#264f78',
          'editor.lineHighlightBackground': '#161b22',
        },
      })

      monaco.editor.defineTheme('monokai', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '88846f', fontStyle: 'italic' },
          { token: 'string', foreground: 'e6db74' },
          { token: 'number', foreground: 'ae81ff' },
          { token: 'keyword', foreground: 'f92672' },
        ],
        colors: {
          'editor.background': '#272822',
          'editor.foreground': '#f8f8f2',
          'editorLineNumber.foreground': '#90908a',
          'editor.selectionBackground': '#49483e',
          'editor.lineHighlightBackground': '#3e3d32',
        },
      })

      // Initial validation
      if (editorState.content && realTimeValidation) {
        const errors = validate(editorState.content, editorState.format)
        setValidation(errors.length === 0, errors)
        updateDecorations(errors)
      }
    },
    [editorState.content, editorState.format, realTimeValidation, setValidation, updateDecorations]
  )

  // Update decorations when errors change
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      updateDecorations(editorState.errors)
    }
  }, [editorState.errors, updateDecorations])

  // Get Monaco theme
  const getMonacoTheme = () => {
    if (monacoTheme === 'vs-dark' || monacoTheme === 'vs' || monacoTheme === 'hc-black') {
      return isDark ? 'vs-dark' : 'vs'
    }
    return monacoTheme
  }

  // Get language for editor
  const getLanguage = () => {
    const format = editorState.format === 'auto' ? detectFormat(editorState.content) : editorState.format
    return format === 'json' ? 'json' : 'yaml'
  }

  return (
    <div
      className={cn(
        'relative h-full w-full rounded-lg border border-border overflow-hidden transition-all duration-200',
        isDragging && 'border-primary border-2 bg-primary/5',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="font-medium">Drop file here</span>
          </div>
        </div>
      )}
      <Editor
        height="100%"
        language={getLanguage()}
        value={editorState.content}
        theme={getMonacoTheme()}
        onChange={handleChange}
        onMount={handleMount}
        loading={
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
        options={{
          readOnly: false,
        }}
      />
    </div>
  )
}
