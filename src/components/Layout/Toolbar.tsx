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
import { escapeJson, unescapeJson, isEscaped, countEscapeSequences, countSpecialCharacters } from '@/utils/escape'
import { copyToClipboard, downloadFile, cn } from '@/lib/utils'
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
  Lock,
  Unlock,
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

  // Escape handler
  const handleEscape = useCallback(() => {
    try {
      const stats = countSpecialCharacters(editorState.content)
      if (stats.total === 0) {
        toast('No special characters to escape', { icon: 'ℹ️' })
        return
      }

      const escaped = escapeJson(editorState.content)
      setContent(escaped)
      addToHistory(escaped, editorState.format)
      
      const parts: string[] = []
      if (stats.newlines > 0) parts.push(`${stats.newlines} newline${stats.newlines > 1 ? 's' : ''}`)
      if (stats.tabs > 0) parts.push(`${stats.tabs} tab${stats.tabs > 1 ? 's' : ''}`)
      if (stats.quotes > 0) parts.push(`${stats.quotes} quote${stats.quotes > 1 ? 's' : ''}`)
      if (stats.backslashes > 0) parts.push(`${stats.backslashes} backslash${stats.backslashes > 1 ? 'es' : ''}`)
      if (stats.controlChars > 0) parts.push(`${stats.controlChars} control char${stats.controlChars > 1 ? 's' : ''}`)
      
      const message = parts.length > 0 
        ? `Escaped ${parts.slice(0, 3).join(', ')}${parts.length > 3 ? ` and ${parts.length - 3} more` : ''}`
        : `Escaped ${stats.total} character${stats.total > 1 ? 's' : ''}`
      
      toast.success(message)
    } catch (error) {
      toast.error(`Escape error: ${(error as Error).message}`)
    }
  }, [editorState.content, editorState.format, setContent, addToHistory])

  // Unescape handler
  const handleUnescape = useCallback(() => {
    try {
      const stats = countEscapeSequences(editorState.content)
      if (stats.total === 0) {
        toast('No escape sequences found to unescape', { icon: 'ℹ️' })
        return
      }

      // Use recursive unescape to handle double-escaped content
      let unescaped = unescapeJson(editorState.content, true)
      let unescapeCount = 1
      
      // Check if we need multiple passes
      while (isEscaped(unescaped) && unescapeCount < 10) {
        const prevUnescaped = unescaped
        unescaped = unescapeJson(unescaped, true)
        if (prevUnescaped === unescaped) break // No change, stop
        unescapeCount++
      }
      
      setContent(unescaped)
      addToHistory(unescaped, editorState.format)
      
      const parts: string[] = []
      if (stats.newlines > 0) parts.push(`${stats.newlines} newline${stats.newlines > 1 ? 's' : ''}`)
      if (stats.tabs > 0) parts.push(`${stats.tabs} tab${stats.tabs > 1 ? 's' : ''}`)
      if (stats.quotes > 0) parts.push(`${stats.quotes} quote${stats.quotes > 1 ? 's' : ''}`)
      if (stats.backslashes > 0) parts.push(`${stats.backslashes} backslash${stats.backslashes > 1 ? 'es' : ''}`)
      if (stats.unicode > 0) parts.push(`${stats.unicode} Unicode${stats.unicode > 1 ? 's' : ''}`)
      if (stats.others > 0) parts.push(`${stats.others} other${stats.others > 1 ? 's' : ''}`)
      
      let message = parts.length > 0 
        ? `Unescaped ${parts.slice(0, 3).join(', ')}${parts.length > 3 ? ` and ${parts.length - 3} more` : ''}`
        : `Unescaped ${stats.total} sequence${stats.total > 1 ? 's' : ''}`
      
      if (unescapeCount > 1) {
        message += ` (${unescapeCount} passes)`
      }
      
      toast.success(message)
    } catch (error) {
      toast.error(`Unescape error: ${(error as Error).message}`)
    }
  }, [editorState.content, editorState.format, setContent, addToHistory])

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

  const isContentEscaped = useMemo(() => {
    return editorState.content ? isEscaped(editorState.content) : false
  }, [editorState.content])

  // Get escape statistics for tooltip
  const escapeStats = useMemo(() => {
    if (!editorState.content) return null
    return isContentEscaped 
      ? countEscapeSequences(editorState.content)
      : countSpecialCharacters(editorState.content)
  }, [editorState.content, isContentEscaped])

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

      {/* Escape/Unescape Actions */}
      <Tooltip
        content={
          !editorState.content
            ? 'Enter content to escape/unescape (Cmd+E / Cmd+Shift+E)'
            : isContentEscaped
              ? escapeStats && escapeStats.total > 0
                ? `Unescape JSON - ${escapeStats.total} sequence${escapeStats.total > 1 ? 's' : ''} found (Cmd+Shift+E)`
                : 'Unescape JSON (Cmd+Shift+E)'
              : escapeStats && escapeStats.total > 0
                ? `Escape JSON - ${escapeStats.total} special character${escapeStats.total > 1 ? 's' : ''} found (Cmd+E)`
                : 'Escape JSON (Cmd+E)'
        }
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={isContentEscaped ? handleUnescape : handleEscape}
          disabled={!editorState.content}
          className={cn(
            isContentEscaped && 'text-primary',
            escapeStats && escapeStats.total > 0 && 'ring-1 ring-primary/20'
          )}
        >
          {isContentEscaped ? (
            <>
              <Unlock className="h-4 w-4 mr-1" />
              Unescape
              {escapeStats && escapeStats.total > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({escapeStats.total})</span>
              )}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-1" />
              Escape
              {escapeStats && escapeStats.total > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({escapeStats.total})</span>
              )}
            </>
          )}
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
