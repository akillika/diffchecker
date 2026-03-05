# FormatDiff

A production-grade **JSON & YAML Formatter, Validator, Linter, and Diff Comparison Tool** built with React, TypeScript, and Monaco Editor.

![FormatDiff](https://via.placeholder.com/800x400/6366F1/FFFFFF?text=FormatDiff)

## Features

### Core Features

- **JSON/YAML Formatting**: Pretty print with customizable indent size
- **Minification**: Compress JSON to single line
- **Validation**: Real-time validation with detailed error messages
- **Linting**: Highlight issues directly in the editor with suggestions
- **Diff Comparison**: Side-by-side comparison with line and word diff
- **Format Conversion**: Convert between JSON and YAML seamlessly
- **Escape/Unescape**: Convert special characters to/from JSON escape sequences with smart detection

### Editor Features

- **Monaco Editor**: VS Code-like editing experience
- **Auto-detection**: Automatically detect JSON or YAML format
- **Syntax Highlighting**: Language-aware syntax highlighting
- **Line Numbers**: With error/warning indicators
- **Drag & Drop**: Upload files by dragging into the editor

### Diff Options

- Ignore key ordering
- Ignore whitespace
- Ignore case
- Ignore array order
- Word-level diff highlighting
- Synchronized scrolling

### Additional Features

- **Tree View**: Visual tree representation of JSON/YAML structure
- **History**: Last 10 formatted items stored locally
- **JSON Schema Validation**: Validate against custom JSON schemas
- **Shareable URLs**: Compress and share via URL
- **Dark/Light Mode**: With multiple editor themes
- **Keyboard Shortcuts**: Quick access to common actions
- **Escape/Unescape Tool**: 
  - Automatically detects if content is already escaped
  - Shows count of special characters/sequences in button badge
  - Handles double-escaped content automatically (recursive unescaping)
  - Detailed toast notifications showing what was processed
  - Visual indicators (ring highlight, color changes)

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Editor**: Monaco Editor (VS Code engine)
- **State Management**: Zustand
- **Animation**: Framer Motion
- **YAML Parser**: js-yaml
- **Diff Library**: diff
- **URL Compression**: lz-string

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
cd formatdiff

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at http://localhost:5173 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Format content |
| `Cmd/Ctrl + Shift + F` | Minify JSON |
| `Cmd/Ctrl + E` | Escape JSON (convert special chars to escape sequences) |
| `Cmd/Ctrl + Shift + E` | Unescape JSON (convert escape sequences to actual chars) |
| `Cmd/Ctrl + S` | Download file |
| `Cmd/Ctrl + D` | Toggle Diff mode |
| `Cmd/Ctrl + 1` | Format mode |
| `Cmd/Ctrl + 2` | Diff mode |
| `Cmd/Ctrl + 3` | Convert mode |
| `Cmd/Ctrl + 4` | Tree mode |
| `Cmd/Ctrl + K` | Show shortcuts |

## Project Structure

```
src/
├── components/
│   ├── Editor/
│   │   ├── MonacoEditor.tsx    # Main editor component
│   │   └── DiffEditor.tsx      # Diff comparison editor
│   ├── Features/
│   │   ├── TreeView.tsx        # JSON/YAML tree visualization
│   │   ├── HistoryPanel.tsx    # Format history
│   │   ├── ShortcutsModal.tsx  # Keyboard shortcuts modal
│   │   └── SchemaValidator.tsx # JSON Schema validation
│   ├── Layout/
│   │   ├── Header.tsx          # App header with mode tabs
│   │   ├── Toolbar.tsx         # Editor toolbar
│   │   ├── StatusBar.tsx       # Editor status bar
│   │   ├── ErrorPanel.tsx      # Validation errors panel
│   │   └── DiffToolbar.tsx     # Diff options toolbar
│   └── ui/                     # Reusable UI components
├── hooks/
│   ├── useTheme.ts             # Theme management
│   ├── useKeyboardShortcuts.ts # Keyboard shortcuts
│   ├── useFileUpload.ts        # File upload handling
│   └── useFormatWorker.ts      # Web Worker for formatting
├── store/
│   └── useAppStore.ts          # Zustand state store
├── utils/
│   ├── formatters.ts           # JSON/YAML formatting logic
│   ├── diff.ts                 # Diff comparison logic
│   ├── escape.ts                # Escape/unescape utilities
│   └── sharing.ts              # URL sharing utilities
├── workers/
│   └── formatter.worker.ts     # Web Worker for large files
├── types/
│   └── index.ts                # TypeScript type definitions
└── lib/
    └── utils.ts                # Utility functions
```

## Libraries Used

| Library | Purpose |
|---------|---------|
| `@monaco-editor/react` | Monaco Editor React wrapper |
| `monaco-editor` | VS Code editor engine |
| `js-yaml` | YAML parsing and stringification |
| `diff` | Text diff comparison |
| `zustand` | State management |
| `framer-motion` | Animations |
| `lz-string` | URL compression |
| `react-hot-toast` | Toast notifications |
| `lucide-react` | Icons |
| `class-variance-authority` | Component variants |
| `tailwind-merge` | Tailwind class merging |
| `clsx` | Conditional class names |

## Escape/Unescape Feature

The escape/unescape tool helps you convert special characters to/from JSON escape sequences.

### Features

- **Smart Detection**: Automatically detects if content is already escaped
- **Visual Indicators**: 
  - Button badge shows count of special characters/sequences
  - Ring highlight when content is ready to process
  - Button color changes based on state
- **Recursive Unescaping**: Automatically handles double-escaped (or triple-escaped) content in a single click
- **Detailed Feedback**: Toast notifications show exactly what was processed (e.g., "Escaped 3 newlines, 2 tabs, 1 quote")
- **Keyboard Shortcuts**: Quick access with `Cmd/Ctrl + E` (escape) and `Cmd/Ctrl + Shift + E` (unescape)

### What Gets Escaped/Unescaped

**Escape converts:**
- `"` → `\"`
- `\n` → `\\n` (actual newline to escape sequence)
- `\t` → `\\t` (actual tab to escape sequence)
- `\` → `\\`
- Control characters → Unicode escapes (`\uXXXX`)

**Unescape converts:**
- `\"` → `"`
- `\n` → actual newline character
- `\t` → actual tab character
- `\\` → `\`
- `\uXXXX` → Unicode character

### Example

**Input:**
```
Hello "World"
Line with tab	
And newline
```

**After Escape:**
```
Hello \"World\"\nLine with tab\t\nAnd newline
```

**After Unescape (from escaped version):**
```
Hello "World"
Line with tab	
And newline
```

## Editor Themes

- **VS Dark** (default)
- **VS Light**
- **GitHub Dark**
- **Monokai**
- **High Contrast**

## Performance

- Debounced validation to prevent lag
- Web Worker for formatting large documents (1MB+)
- Memoized components and calculations
- Virtualized rendering for large diffs

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

---

Built with ❤️ using React, TypeScript, and Monaco Editor
