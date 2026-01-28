import { useEffect, useCallback } from 'react'

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      for (const shortcut of shortcuts) {
        const ctrlOrMeta = shortcut.ctrl || shortcut.meta
        const isCtrlOrMetaPressed = event.ctrlKey || event.metaKey

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = !ctrlOrMeta || isCtrlOrMetaPressed
        const shiftMatch = !shortcut.shift || event.shiftKey
        const altMatch = !shortcut.alt || event.altKey

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return shortcuts
}

export function getShortcutLabel(config: Partial<ShortcutConfig>): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const parts: string[] = []

  if (config.ctrl || config.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (config.shift) {
    parts.push(isMac ? '⇧' : 'Shift')
  }
  if (config.alt) {
    parts.push(isMac ? '⌥' : 'Alt')
  }
  if (config.key) {
    parts.push(config.key.toUpperCase())
  }

  return parts.join(isMac ? '' : '+')
}
