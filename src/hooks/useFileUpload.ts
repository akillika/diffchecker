import { useCallback, useState } from 'react'

interface UseFileUploadOptions {
  onUpload: (content: string, filename: string) => void
  accept?: string
  maxSize?: number
}

export function useFileUpload({ onUpload, accept = '.json,.yaml,.yml', maxSize = 10 * 1024 * 1024 }: UseFileUploadOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)

      if (maxSize && file.size > maxSize) {
        setError(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`)
        return
      }

      const validExtensions = accept.split(',').map((ext) => ext.trim().toLowerCase())
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`

      if (!validExtensions.includes(fileExtension)) {
        setError(`Invalid file type. Accepted types: ${accept}`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        onUpload(content, file.name)
      }
      reader.onerror = () => {
        setError('Failed to read file')
      }
      reader.readAsText(file)
    },
    [accept, maxSize, onUpload]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
      // Reset input value to allow re-uploading same file
      e.target.value = ''
    },
    [handleFile]
  )

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    }
    input.click()
  }, [accept, handleFile])

  return {
    isDragging,
    error,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleInputChange,
    openFileDialog,
  }
}
