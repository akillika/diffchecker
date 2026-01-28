import { useAppStore } from '@/store/useAppStore'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Github,
  Keyboard,
  Code2,
  GitCompare,
  ArrowLeftRight,
  TreeDeciduous,
  Wrench,
  Command,
  Shield,
} from 'lucide-react'
import type { MonacoTheme, ViewMode } from '@/types'

interface HeaderProps {
  onShowShortcuts: () => void
  onShowCommandPalette?: () => void
}

export function Header({ onShowShortcuts, onShowCommandPalette }: HeaderProps) {
  const { viewMode, setViewMode, monacoTheme, setMonacoTheme, privacyMode, setPrivacyMode } = useAppStore()
  const { theme, setTheme } = useTheme()

  const monacoThemes: { value: MonacoTheme; label: string }[] = [
    { value: 'vs-dark', label: 'VS Dark' },
    { value: 'vs', label: 'VS Light' },
    { value: 'github-dark', label: 'GitHub Dark' },
    { value: 'monokai', label: 'Monokai' },
    { value: 'hc-black', label: 'High Contrast' },
  ]

  const viewModes: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'format', label: 'Format', icon: <Code2 className="h-4 w-4" /> },
    { value: 'diff', label: 'Diff', icon: <GitCompare className="h-4 w-4" /> },
    { value: 'convert', label: 'Convert', icon: <ArrowLeftRight className="h-4 w-4" /> },
    { value: 'tree', label: 'Tree', icon: <TreeDeciduous className="h-4 w-4" /> },
    { value: 'tools', label: 'Tools', icon: <Wrench className="h-4 w-4" /> },
  ]

  const themeIcon = theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <span className="hidden text-xl font-semibold tracking-tight sm:inline-block">
              Format<span className="text-primary">Diff</span>
            </span>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex-1 flex justify-center">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid grid-cols-5 w-auto">
              {viewModes.map((mode) => (
                <TabsTrigger key={mode.value} value={mode.value} className="flex items-center gap-1.5 px-3">
                  {mode.icon}
                  <span className="hidden sm:inline">{mode.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Privacy Mode Indicator */}
          {privacyMode && (
            <Tooltip content="Privacy Mode Active - Click to disable">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPrivacyMode(false)}
                className="text-warning bg-warning/10"
              >
                <Shield className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}

          {/* Command Palette */}
          {onShowCommandPalette && (
            <Tooltip content="Command Palette (⌘P)">
              <Button variant="ghost" size="icon-sm" onClick={onShowCommandPalette}>
                <Command className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}

          {/* Theme Toggle */}
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="icon-sm">
                {themeIcon}
              </Button>
            }
          >
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenu>

          {/* Editor Theme */}
          <DropdownMenu
            trigger={
              <Tooltip content="Editor Theme">
                <Button variant="ghost" size="icon-sm">
                  <Palette className="h-4 w-4" />
                </Button>
              </Tooltip>
            }
          >
            {monacoThemes.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => setMonacoTheme(t.value)}
                className={monacoTheme === t.value ? 'bg-accent' : ''}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>

          {/* Keyboard Shortcuts */}
          <Tooltip content="Keyboard Shortcuts">
            <Button variant="ghost" size="icon-sm" onClick={onShowShortcuts}>
              <Keyboard className="h-4 w-4" />
            </Button>
          </Tooltip>

          {/* GitHub */}
          <Tooltip content="View on GitHub">
            <Button variant="ghost" size="icon-sm" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
              </a>
            </Button>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
