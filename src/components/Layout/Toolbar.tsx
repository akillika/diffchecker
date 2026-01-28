import { useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown'
import {
  formatJson,
  formatYaml,
  minifyJson,
  jsonToYaml,
  yamlToJson,
  validate,
  detectFormat,
} from '@/utils/formatters'
import { copyToClipboard, downloadFile } from '@/lib/utils'
import { useFileUpload } from '@/hooks/useFileUpload'
import {
  Wand2,
  Minimize2,
  CheckCircle2,
  Copy,
  Download,
  Upload,
  FileText,
  Trash2,
  ArrowRightLeft,
  SortAsc,
  MoreHorizontal,
  Share2,
} from 'lucide-react'
import { generateShareUrl } from '@/utils/sharing'
import type { FormatType } from '@/types'

interface ToolbarProps {
  side: 'left' | 'right'
}

export function Toolbar({ side }: ToolbarProps) {
  const {
    leftEditor,
    rightEditor,
    setLeftContent,
    setRightContent,
    setLeftFormat,
    setRightFormat,
    setLeftValidation,
    setRightValidation,
    formatOptions,
    setFormatOptions,
    addToHistory,
    viewMode,
    swapEditors,
  } = useAppStore()

  const editorState = side === 'left' ? leftEditor : rightEditor
  const setContent = side === 'left' ? setLeftContent : setRightContent
  const setFormat = side === 'left' ? setLeftFormat : setRightFormat
  const setValidation = side === 'left' ? setLeftValidation : setRightValidation

  const { openFileDialog } = useFileUpload({
    onUpload: (content, filename) => {
      setContent(content)
      const format = detectFormat(content)
      setFormat(format)
      toast.success(`Loaded ${filename}`)
    },
  })

  const actualFormat = useMemo(() => {
    return editorState.format === 'auto' ? detectFormat(editorState.content) : editorState.format
  }, [editorState.content, editorState.format])

  // Format handler
  const handleFormat = useCallback(() => {
    try {
      let formatted: string
      if (actualFormat === 'json') {
        formatted = formatJson(editorState.content, formatOptions)
      } else {
        formatted = formatYaml(editorState.content, formatOptions)
      }
      setContent(formatted)
      addToHistory(formatted, actualFormat)
      toast.success('Formatted successfully!')
    } catch (error) {
      toast.error(`Format error: ${(error as Error).message}`)
    }
  }, [editorState.content, actualFormat, formatOptions, setContent, addToHistory])

  // Minify handler
  const handleMinify = useCallback(() => {
    try {
      if (actualFormat === 'json') {
        const minified = minifyJson(editorState.content)
        setContent(minified)
        toast.success('Minified successfully!')
      } else {
        toast.error('Minify is only available for JSON')
      }
    } catch (error) {
      toast.error(`Minify error: ${(error as Error).message}`)
    }
  }, [editorState.content, actualFormat, setContent])

  // Validate handler
  const handleValidate = useCallback(() => {
    const errors = validate(editorState.content, actualFormat)
    setValidation(errors.length === 0, errors)
    if (errors.length === 0) {
      toast.success('Valid!')
    } else {
      toast.error(`Found ${errors.length} error(s)`)
    }
  }, [editorState.content, actualFormat, setValidation])

  // Copy handler
  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(editorState.content)
      toast.success('Copied to clipboard!')
    } catch {
      toast.error('Failed to copy')
    }
  }, [editorState.content])

  // Download handler
  const handleDownload = useCallback(() => {
    const extension = actualFormat === 'json' ? 'json' : 'yaml'
    const mimeType = actualFormat === 'json' ? 'application/json' : 'text/yaml'
    downloadFile(editorState.content, `data.${extension}`, mimeType)
    toast.success(`Downloaded as data.${extension}`)
  }, [editorState.content, actualFormat])

  // Convert handler
  const handleConvert = useCallback(() => {
    try {
      let converted: string
      let newFormat: FormatType
      if (actualFormat === 'json') {
        converted = jsonToYaml(editorState.content, formatOptions)
        newFormat = 'yaml'
      } else {
        converted = yamlToJson(editorState.content, formatOptions)
        newFormat = 'json'
      }
      setContent(converted)
      setFormat(newFormat)
      addToHistory(converted, newFormat)
      toast.success(`Converted to ${newFormat.toUpperCase()}!`)
    } catch (error) {
      toast.error(`Convert error: ${(error as Error).message}`)
    }
  }, [editorState.content, actualFormat, formatOptions, setContent, setFormat, addToHistory])

  // Clear handler
  const handleClear = useCallback(() => {
    setContent('')
    setValidation(true, [])
    toast.success('Cleared!')
  }, [setContent, setValidation])

  // Share handler
  const handleShare = useCallback(async () => {
    try {
      const shareUrl = generateShareUrl({
        content: editorState.content,
        format: editorState.format,
        viewMode,
      })
      await copyToClipboard(shareUrl)
      toast.success('Shareable link copied to clipboard!')
    } catch {
      toast.error('Failed to create shareable link')
    }
  }, [editorState.content, editorState.format, viewMode])

  // Paste sample handler
  const handlePasteSample = useCallback(() => {
    const sample = actualFormat === 'json'
      ? JSON.stringify({
          name: 'FormatDiff',
          version: '1.0.0',
          description: 'JSON & YAML Formatter, Validator, and Diff Tool',
          features: ['Format', 'Validate', 'Diff', 'Convert'],
          author: {
            name: 'Developer',
            email: 'dev@example.com',
          },
          repository: {
            type: 'git',
            url: 'https://github.com/example/formatdiff',
          },
          keywords: ['json', 'yaml', 'formatter', 'validator', 'diff'],
          license: 'MIT',
        }, null, 2)
      : `name: FormatDiff
version: 1.0.0
description: JSON & YAML Formatter, Validator, and Diff Tool
features:
  - Format
  - Validate
  - Diff
  - Convert
author:
  name: Developer
  email: dev@example.com
repository:
  type: git
  url: https://github.com/example/formatdiff
keywords:
  - json
  - yaml
  - formatter
  - validator
  - diff
license: MIT`
    setContent(sample)
    toast.success('Sample pasted!')
  }, [actualFormat, setContent])

  const formatOptions_list = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
  ]

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
      {/* Format Selection */}
      <Select
        value={editorState.format}
        onChange={(e) => setFormat(e.target.value as FormatType)}
        options={formatOptions_list}
        className="w-28"
      />

      <div className="w-px h-6 bg-border mx-1" />

      {/* Primary Actions */}
      <Tooltip content="Format (Cmd+Enter)">
        <Button variant="ghost" size="sm" onClick={handleFormat} disabled={!editorState.content}>
          <Wand2 className="h-4 w-4 mr-1" />
          Format
        </Button>
      </Tooltip>

      <Tooltip content="Minify (Cmd+Shift+F)">
        <Button variant="ghost" size="sm" onClick={handleMinify} disabled={!editorState.content || actualFormat !== 'json'}>
          <Minimize2 className="h-4 w-4 mr-1" />
          Minify
        </Button>
      </Tooltip>

      <Tooltip content="Validate">
        <Button variant="ghost" size="sm" onClick={handleValidate} disabled={!editorState.content}>
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Validate
        </Button>
      </Tooltip>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Secondary Actions */}
      <Tooltip content="Copy">
        <Button variant="ghost" size="icon-sm" onClick={handleCopy} disabled={!editorState.content}>
          <Copy className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Tooltip content="Download (Cmd+S)">
        <Button variant="ghost" size="icon-sm" onClick={handleDownload} disabled={!editorState.content}>
          <Download className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Tooltip content="Upload">
        <Button variant="ghost" size="icon-sm" onClick={openFileDialog}>
          <Upload className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Tooltip content="Share Link">
        <Button variant="ghost" size="icon-sm" onClick={handleShare} disabled={!editorState.content}>
          <Share2 className="h-4 w-4" />
        </Button>
      </Tooltip>

      <div className="flex-1" />

      {/* Additional Actions */}
      {viewMode === 'diff' && side === 'left' && (
        <Tooltip content="Swap Editors">
          <Button variant="ghost" size="icon-sm" onClick={swapEditors}>
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}

      {viewMode === 'convert' && (
        <Tooltip content="Convert">
          <Button variant="outline" size="sm" onClick={handleConvert} disabled={!editorState.content}>
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            To {actualFormat === 'json' ? 'YAML' : 'JSON'}
          </Button>
        </Tooltip>
      )}

      {/* More Options */}
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      >
        <DropdownMenuItem onClick={handlePasteSample}>
          <FileText className="mr-2 h-4 w-4" /> Paste Sample
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleClear} disabled={!editorState.content}>
          <Trash2 className="mr-2 h-4 w-4" /> Clear
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setFormatOptions({ sortKeys: !formatOptions.sortKeys })}>
          <SortAsc className="mr-2 h-4 w-4" />
          Sort Keys {formatOptions.sortKeys && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setFormatOptions({ removeNulls: !formatOptions.removeNulls })}>
          <Trash2 className="mr-2 h-4 w-4" />
          Remove Nulls {formatOptions.removeNulls && '✓'}
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  )
}
