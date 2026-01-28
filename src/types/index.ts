export type FormatType = 'json' | 'yaml' | 'auto'

export type ViewMode = 'format' | 'diff' | 'convert' | 'tree' | 'tools'

export type MonacoTheme = 'vs-dark' | 'vs' | 'hc-black' | 'github-dark' | 'monokai'

export interface ValidationError {
  message: string
  line: number
  column: number
  severity: 'error' | 'warning'
  suggestion?: string
}

export interface FormatOptions {
  indentSize: number
  sortKeys: boolean
  removeNulls: boolean
}

export interface DiffOptions {
  ignoreKeyOrder: boolean
  ignoreWhitespace: boolean
  ignoreCase: boolean
  ignoreArrayOrder: boolean
  syncScroll: boolean
  showWordDiff: boolean
}

export interface EditorState {
  content: string
  format: FormatType
  isValid: boolean
  errors: ValidationError[]
  lineCount: number
  size: number
}

export interface HistoryItem {
  id: string
  content: string
  format: FormatType
  timestamp: number
  label?: string
}

// Semantic Diff Types
export type SemanticChangeType = 'added' | 'removed' | 'modified' | 'type_changed'

export interface SemanticChange {
  path: string
  type: SemanticChangeType
  oldValue?: unknown
  newValue?: unknown
  oldType?: string
  newType?: string
}

export interface SemanticDiffResult {
  changes: SemanticChange[]
  summary: {
    added: number
    removed: number
    modified: number
    typeChanged: number
    total: number
  }
  isIdentical: boolean
}

// Transformer Types
export type TransformerType =
  | 'redact'
  | 'case-convert'
  | 'flatten'
  | 'unflatten'
  | 'remove-empty'
  | 'type-generator'

export type CaseType = 'camelCase' | 'snake_case' | 'kebab-case' | 'PascalCase'

export interface TransformerOptions {
  redact: {
    fields: string[]
    redactEmails: boolean
    redactPhones: boolean
    redactCreditCards: boolean
    replacement: string
  }
  caseConvert: {
    from: CaseType | 'auto'
    to: CaseType
  }
  flatten: {
    delimiter: string
    maxDepth: number
  }
  unflatten: {
    delimiter: string
  }
  removeEmpty: {
    nulls: boolean
    emptyStrings: boolean
    emptyArrays: boolean
    emptyObjects: boolean
  }
  typeGenerator: {
    language: 'typescript' | 'zod'
    preferType: boolean
    optionalProperties: boolean
    rootName: string
  }
}

export interface TransformerResult {
  success: boolean
  output?: string
  error?: string
  stats?: {
    keysChanged?: number
    fieldsRedacted?: number
    itemsRemoved?: number
  }
}

// Security Inspector Types
export interface SensitiveMatch {
  path: string
  type: 'jwt' | 'api_key' | 'email' | 'phone' | 'secret' | 'credit_card'
  value: string
  line?: number
  preview: string
}

export interface SecurityScanResult {
  matches: SensitiveMatch[]
  summary: {
    jwt: number
    api_key: number
    email: number
    phone: number
    secret: number
    credit_card: number
    total: number
  }
}

// Snapshot Types
export interface Snapshot {
  id: string
  name: string
  timestamp: number
  leftContent: string
  leftFormat: FormatType
  rightContent?: string
  rightFormat?: FormatType
  viewMode: ViewMode
}

// Command Palette Types
export interface Command {
  id: string
  name: string
  shortcut?: string
  category: string
  action: () => void
  icon?: React.ComponentType<{ className?: string }>
}

// Extended App State
export interface AppState {
  // View
  viewMode: ViewMode
  theme: 'light' | 'dark' | 'system'
  monacoTheme: MonacoTheme

  // Left Editor (main)
  leftEditor: EditorState

  // Right Editor (for diff)
  rightEditor: EditorState

  // Options
  formatOptions: FormatOptions
  diffOptions: DiffOptions

  // Features
  realTimeValidation: boolean

  // History
  history: HistoryItem[]

  // Schema validation
  jsonSchema: string | null

  // Privacy Mode
  privacyMode: boolean

  // Snapshots
  snapshots: Snapshot[]

  // Semantic Diff
  semanticDiffResult: SemanticDiffResult | null
  showDiffSummary: boolean

  // Transformer
  activeTransformer: TransformerType | null
  transformerOptions: TransformerOptions

  // Security
  securityScanResult: SecurityScanResult | null

  // Command Palette
  commandPaletteOpen: boolean

  // Actions
  setViewMode: (mode: ViewMode) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setMonacoTheme: (theme: MonacoTheme) => void
  setLeftContent: (content: string) => void
  setRightContent: (content: string) => void
  setLeftFormat: (format: FormatType) => void
  setRightFormat: (format: FormatType) => void
  setLeftValidation: (isValid: boolean, errors: ValidationError[]) => void
  setRightValidation: (isValid: boolean, errors: ValidationError[]) => void
  setFormatOptions: (options: Partial<FormatOptions>) => void
  setDiffOptions: (options: Partial<DiffOptions>) => void
  setRealTimeValidation: (enabled: boolean) => void
  addToHistory: (content: string, format: FormatType) => void
  clearHistory: () => void
  setJsonSchema: (schema: string | null) => void
  swapEditors: () => void
  clearEditors: () => void

  // Privacy Mode
  setPrivacyMode: (enabled: boolean) => void

  // Snapshots
  createSnapshot: (name: string) => void
  deleteSnapshot: (id: string) => void
  restoreSnapshot: (id: string) => void
  renameSnapshot: (id: string, name: string) => void
  clearSnapshots: () => void

  // Semantic Diff
  setSemanticDiffResult: (result: SemanticDiffResult | null) => void
  setShowDiffSummary: (show: boolean) => void

  // Transformer
  setActiveTransformer: (transformer: TransformerType | null) => void
  setTransformerOptions: <K extends keyof TransformerOptions>(
    key: K,
    options: Partial<TransformerOptions[K]>
  ) => void

  // Security
  setSecurityScanResult: (result: SecurityScanResult | null) => void

  // Command Palette
  setCommandPaletteOpen: (open: boolean) => void
}
