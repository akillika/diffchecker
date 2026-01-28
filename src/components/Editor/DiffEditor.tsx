import { useRef, useCallback } from 'react'
import { DiffEditor as MonacoDiffEditor, OnMount, loader } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useAppStore } from '@/store/useAppStore'
import { useTheme } from '@/hooks/useTheme'
import { detectFormat } from '@/utils/formatters'
import { cn } from '@/lib/utils'

// Configure Monaco loader
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
  },
})

interface DiffEditorProps {
  className?: string
}

export function DiffEditor({ className }: DiffEditorProps) {
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)

  const { isDark } = useTheme()

  const {
    leftEditor,
    rightEditor,
    monacoTheme,
    diffOptions,
  } = useAppStore()

  // Handle editor mount
  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor as unknown as editor.IStandaloneDiffEditor
      monacoRef.current = monaco

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
          'diffEditor.insertedTextBackground': '#23863633',
          'diffEditor.removedTextBackground': '#f8514933',
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
          'diffEditor.insertedTextBackground': '#a6e22e33',
          'diffEditor.removedTextBackground': '#f9267233',
        },
      })
    },
    []
  )

  // Get Monaco theme
  const getMonacoTheme = () => {
    if (monacoTheme === 'vs-dark' || monacoTheme === 'vs' || monacoTheme === 'hc-black') {
      return isDark ? 'vs-dark' : 'vs'
    }
    return monacoTheme
  }

  // Get language for editor
  const getLanguage = () => {
    const leftFormat = leftEditor.format === 'auto' ? detectFormat(leftEditor.content) : leftEditor.format
    return leftFormat === 'json' ? 'json' : 'yaml'
  }

  return (
    <div
      className={cn(
        'relative h-full w-full rounded-lg border border-border overflow-hidden',
        className
      )}
    >
      <MonacoDiffEditor
        height="100%"
        language={getLanguage()}
        original={leftEditor.content}
        modified={rightEditor.content}
        theme={getMonacoTheme()}
        onMount={handleMount}
        options={{
          readOnly: false,
          renderSideBySide: true,
          enableSplitViewResizing: true,
          ignoreTrimWhitespace: diffOptions.ignoreWhitespace,
          renderIndicators: true,
          originalEditable: true,
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
        }}
        loading={
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      />
    </div>
  )
}
