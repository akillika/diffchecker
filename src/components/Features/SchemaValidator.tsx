import { useState, useMemo, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ShieldCheck,
  ShieldAlert,
  FileCode,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Simple JSON Schema validator (basic implementation)
function validateAgainstSchema(data: unknown, schema: unknown): string[] {
  const errors: string[] = []

  function validate(value: unknown, schemaNode: Record<string, unknown>, path: string) {
    if (!schemaNode) return

    const type = schemaNode.type as string

    // Type validation
    if (type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (type !== actualType && !(type === 'integer' && typeof value === 'number' && Number.isInteger(value))) {
        if (value !== null || !schemaNode.nullable) {
          errors.push(`${path}: Expected ${type}, got ${actualType}`)
        }
      }
    }

    // Required fields
    if (schemaNode.required && typeof value === 'object' && value !== null) {
      const required = schemaNode.required as string[]
      for (const field of required) {
        if (!((value as Record<string, unknown>)[field] !== undefined)) {
          errors.push(`${path}: Missing required field "${field}"`)
        }
      }
    }

    // Properties
    if (schemaNode.properties && typeof value === 'object' && value !== null) {
      const props = schemaNode.properties as Record<string, Record<string, unknown>>
      for (const [key, propSchema] of Object.entries(props)) {
        if ((value as Record<string, unknown>)[key] !== undefined) {
          validate((value as Record<string, unknown>)[key], propSchema, `${path}.${key}`)
        }
      }
    }

    // Items (array)
    if (schemaNode.items && Array.isArray(value)) {
      const itemSchema = schemaNode.items as Record<string, unknown>
      value.forEach((item, index) => {
        validate(item, itemSchema, `${path}[${index}]`)
      })
    }

    // Enum
    if (schemaNode.enum && !((schemaNode.enum as unknown[]).includes(value))) {
      errors.push(`${path}: Value must be one of: ${(schemaNode.enum as unknown[]).join(', ')}`)
    }

    // Min/Max
    if (typeof value === 'number') {
      if (schemaNode.minimum !== undefined && value < (schemaNode.minimum as number)) {
        errors.push(`${path}: Value must be >= ${schemaNode.minimum}`)
      }
      if (schemaNode.maximum !== undefined && value > (schemaNode.maximum as number)) {
        errors.push(`${path}: Value must be <= ${schemaNode.maximum}`)
      }
    }

    // MinLength/MaxLength
    if (typeof value === 'string') {
      if (schemaNode.minLength !== undefined && value.length < (schemaNode.minLength as number)) {
        errors.push(`${path}: String length must be >= ${schemaNode.minLength}`)
      }
      if (schemaNode.maxLength !== undefined && value.length > (schemaNode.maxLength as number)) {
        errors.push(`${path}: String length must be <= ${schemaNode.maxLength}`)
      }
    }
  }

  try {
    validate(data, schema as Record<string, unknown>, '$')
  } catch (e) {
    errors.push(`Schema validation error: ${(e as Error).message}`)
  }

  return errors
}

export function SchemaValidator() {
  const { leftEditor, jsonSchema, setJsonSchema } = useAppStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [schemaInput, setSchemaInput] = useState(jsonSchema || '')

  const validationResult = useMemo(() => {
    if (!jsonSchema || !leftEditor.content.trim()) return null

    try {
      const data = JSON.parse(leftEditor.content)
      const schema = JSON.parse(jsonSchema)
      const errors = validateAgainstSchema(data, schema)
      return { valid: errors.length === 0, errors }
    } catch (e) {
      return { valid: false, errors: [(e as Error).message] }
    }
  }, [leftEditor.content, jsonSchema])

  const handleSetSchema = useCallback(() => {
    try {
      JSON.parse(schemaInput)
      setJsonSchema(schemaInput)
      toast.success('Schema applied')
    } catch {
      toast.error('Invalid JSON schema')
    }
  }, [schemaInput, setJsonSchema])

  const handleClearSchema = useCallback(() => {
    setJsonSchema(null)
    setSchemaInput('')
    toast.success('Schema cleared')
  }, [setJsonSchema])

  const sampleSchema = JSON.stringify(
    {
      type: 'object',
      required: ['name', 'version'],
      properties: {
        name: { type: 'string', minLength: 1 },
        version: { type: 'string' },
        description: { type: 'string' },
        dependencies: {
          type: 'object',
        },
      },
    },
    null,
    2
  )

  return (
    <div className="border-t bg-muted/30">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">JSON Schema Validation</span>
          {jsonSchema && (
            <Badge variant={validationResult?.valid ? 'success' : 'destructive'} className="text-xs">
              {validationResult?.valid ? 'Valid' : 'Invalid'}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-3">
              <div className="relative">
                <textarea
                  value={schemaInput}
                  onChange={(e) => setSchemaInput(e.target.value)}
                  placeholder="Paste your JSON Schema here..."
                  className="w-full h-32 p-3 text-xs font-mono rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {schemaInput && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-2 right-2"
                    onClick={() => setSchemaInput('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSetSchema} disabled={!schemaInput}>
                  Apply Schema
                </Button>
                {jsonSchema && (
                  <Button variant="outline" size="sm" onClick={handleClearSchema}>
                    Clear Schema
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSchemaInput(sampleSchema)}
                >
                  Load Sample
                </Button>
              </div>

              {validationResult && (
                <div
                  className={cn(
                    'p-3 rounded-lg border',
                    validationResult.valid
                      ? 'bg-success/10 border-success/20'
                      : 'bg-destructive/10 border-destructive/20'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {validationResult.valid ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium text-success">
                          Valid according to schema
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">
                          Schema validation failed
                        </span>
                      </>
                    )}
                  </div>
                  {!validationResult.valid && (
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {validationResult.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
