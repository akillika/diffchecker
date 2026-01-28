import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppState,
  FormatType,
  ValidationError,
  ViewMode,
  MonacoTheme,
  FormatOptions,
  DiffOptions,
  TransformerOptions,
  Snapshot,
} from '@/types'
import { generateId } from '@/lib/utils'

const initialEditorState = {
  content: '',
  format: 'auto' as FormatType,
  isValid: true,
  errors: [] as ValidationError[],
  lineCount: 0,
  size: 0,
}

const defaultTransformerOptions: TransformerOptions = {
  redact: {
    fields: ['password', 'token', 'secret', 'authorization', 'apiKey', 'api_key', 'apikey'],
    redactEmails: true,
    redactPhones: true,
    redactCreditCards: true,
    replacement: '[REDACTED]',
  },
  caseConvert: {
    from: 'auto',
    to: 'camelCase',
  },
  flatten: {
    delimiter: '.',
    maxDepth: 10,
  },
  unflatten: {
    delimiter: '.',
  },
  removeEmpty: {
    nulls: true,
    emptyStrings: false,
    emptyArrays: false,
    emptyObjects: false,
  },
  typeGenerator: {
    language: 'typescript',
    preferType: false,
    optionalProperties: true,
    rootName: 'Root',
  },
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // View
      viewMode: 'format' as ViewMode,
      theme: 'system' as const,
      monacoTheme: 'vs-dark' as MonacoTheme,

      // Editors
      leftEditor: { ...initialEditorState },
      rightEditor: { ...initialEditorState },

      // Options
      formatOptions: {
        indentSize: 2,
        sortKeys: false,
        removeNulls: false,
      } as FormatOptions,
      diffOptions: {
        ignoreKeyOrder: false,
        ignoreWhitespace: false,
        ignoreCase: false,
        ignoreArrayOrder: false,
        syncScroll: true,
        showWordDiff: false,
      } as DiffOptions,

      // Features
      realTimeValidation: true,

      // History
      history: [],

      // Schema
      jsonSchema: null,

      // Privacy Mode
      privacyMode: false,

      // Snapshots
      snapshots: [],

      // Semantic Diff
      semanticDiffResult: null,
      showDiffSummary: true,

      // Transformer
      activeTransformer: null,
      transformerOptions: defaultTransformerOptions,

      // Security
      securityScanResult: null,

      // Command Palette
      commandPaletteOpen: false,

      // Actions
      setViewMode: (mode) => set({ viewMode: mode }),
      setTheme: (theme) => set({ theme }),
      setMonacoTheme: (monacoTheme) => set({ monacoTheme }),

      setLeftContent: (content) =>
        set((state) => ({
          leftEditor: {
            ...state.leftEditor,
            content,
            lineCount: content.split('\n').length,
            size: new Blob([content]).size,
          },
        })),

      setRightContent: (content) =>
        set((state) => ({
          rightEditor: {
            ...state.rightEditor,
            content,
            lineCount: content.split('\n').length,
            size: new Blob([content]).size,
          },
        })),

      setLeftFormat: (format) =>
        set((state) => ({
          leftEditor: { ...state.leftEditor, format },
        })),

      setRightFormat: (format) =>
        set((state) => ({
          rightEditor: { ...state.rightEditor, format },
        })),

      setLeftValidation: (isValid, errors) =>
        set((state) => ({
          leftEditor: { ...state.leftEditor, isValid, errors },
        })),

      setRightValidation: (isValid, errors) =>
        set((state) => ({
          rightEditor: { ...state.rightEditor, isValid, errors },
        })),

      setFormatOptions: (options) =>
        set((state) => ({
          formatOptions: { ...state.formatOptions, ...options },
        })),

      setDiffOptions: (options) =>
        set((state) => ({
          diffOptions: { ...state.diffOptions, ...options },
        })),

      setRealTimeValidation: (enabled) => set({ realTimeValidation: enabled }),

      addToHistory: (content, format) => {
        const { history, privacyMode } = get()
        // Don't save history in privacy mode
        if (privacyMode) return

        const newItem = {
          id: generateId(),
          content,
          format,
          timestamp: Date.now(),
        }
        const newHistory = [newItem, ...history].slice(0, 10)
        set({ history: newHistory })
      },

      clearHistory: () => set({ history: [] }),

      setJsonSchema: (schema) => set({ jsonSchema: schema }),

      swapEditors: () =>
        set((state) => ({
          leftEditor: state.rightEditor,
          rightEditor: state.leftEditor,
        })),

      clearEditors: () =>
        set({
          leftEditor: { ...initialEditorState },
          rightEditor: { ...initialEditorState },
        }),

      // Privacy Mode
      setPrivacyMode: (enabled) => {
        if (enabled) {
          // Clear sensitive data when enabling privacy mode
          set({
            privacyMode: true,
            history: [],
          })
        } else {
          set({ privacyMode: false })
        }
      },

      // Snapshots
      createSnapshot: (name) => {
        const { snapshots, leftEditor, rightEditor, viewMode, privacyMode } = get()
        // Don't save snapshots in privacy mode
        if (privacyMode) return

        const newSnapshot: Snapshot = {
          id: generateId(),
          name,
          timestamp: Date.now(),
          leftContent: leftEditor.content,
          leftFormat: leftEditor.format,
          rightContent: rightEditor.content || undefined,
          rightFormat: rightEditor.format || undefined,
          viewMode,
        }
        const newSnapshots = [newSnapshot, ...snapshots].slice(0, 30)
        set({ snapshots: newSnapshots })
      },

      deleteSnapshot: (id) =>
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.id !== id),
        })),

      restoreSnapshot: (id) => {
        const { snapshots } = get()
        const snapshot = snapshots.find((s) => s.id === id)
        if (!snapshot) return

        set((state) => ({
          leftEditor: {
            ...state.leftEditor,
            content: snapshot.leftContent,
            format: snapshot.leftFormat,
            lineCount: snapshot.leftContent.split('\n').length,
            size: new Blob([snapshot.leftContent]).size,
          },
          rightEditor: snapshot.rightContent
            ? {
                ...state.rightEditor,
                content: snapshot.rightContent,
                format: snapshot.rightFormat || 'auto',
                lineCount: snapshot.rightContent.split('\n').length,
                size: new Blob([snapshot.rightContent]).size,
              }
            : state.rightEditor,
          viewMode: snapshot.viewMode,
        }))
      },

      renameSnapshot: (id, name) =>
        set((state) => ({
          snapshots: state.snapshots.map((s) =>
            s.id === id ? { ...s, name } : s
          ),
        })),

      clearSnapshots: () => set({ snapshots: [] }),

      // Semantic Diff
      setSemanticDiffResult: (result) => set({ semanticDiffResult: result }),
      setShowDiffSummary: (show) => set({ showDiffSummary: show }),

      // Transformer
      setActiveTransformer: (transformer) => set({ activeTransformer: transformer }),
      setTransformerOptions: (key, options) =>
        set((state) => ({
          transformerOptions: {
            ...state.transformerOptions,
            [key]: { ...state.transformerOptions[key], ...options },
          },
        })),

      // Security
      setSecurityScanResult: (result) => set({ securityScanResult: result }),

      // Command Palette
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'formatdiff-storage',
      partialize: (state) => {
        // Don't persist anything in privacy mode
        if (state.privacyMode) {
          return {
            theme: state.theme,
            monacoTheme: state.monacoTheme,
            formatOptions: state.formatOptions,
            diffOptions: state.diffOptions,
            realTimeValidation: state.realTimeValidation,
            transformerOptions: state.transformerOptions,
            privacyMode: true,
            history: [],
            snapshots: [],
          }
        }
        return {
          theme: state.theme,
          monacoTheme: state.monacoTheme,
          formatOptions: state.formatOptions,
          diffOptions: state.diffOptions,
          realTimeValidation: state.realTimeValidation,
          history: state.history,
          snapshots: state.snapshots,
          transformerOptions: state.transformerOptions,
          privacyMode: state.privacyMode,
        }
      },
    }
  )
)
