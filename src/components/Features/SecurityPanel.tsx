import { useCallback, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { scanForSensitiveData, getSensitiveTypeLabel, getSensitiveTypeColor } from '@/utils/security'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Copy,
  RefreshCw,
  AlertTriangle,
  Lock,
  Unlock,
} from 'lucide-react'
import type { SecurityScanResult } from '@/types'

export function SecurityPanel() {
  const {
    leftEditor,
    securityScanResult,
    setSecurityScanResult,
    privacyMode,
    setPrivacyMode,
  } = useAppStore()

  const [isScanning, setIsScanning] = useState(false)
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)

  const runScan = useCallback(() => {
    if (!leftEditor.content) {
      toast.error('No content to scan')
      return
    }

    setIsScanning(true)
    setTimeout(() => {
      const result = scanForSensitiveData(leftEditor.content, leftEditor.format)
      setSecurityScanResult(result)
      setIsScanning(false)

      if (result.summary.total === 0) {
        toast.success('No sensitive data found!')
      } else {
        toast.error(`Found ${result.summary.total} sensitive item(s)`)
      }
    }, 100)
  }, [leftEditor.content, leftEditor.format, setSecurityScanResult])

  const copyPath = useCallback(async (path: string) => {
    try {
      await navigator.clipboard.writeText(path)
      toast.success('Path copied!')
    } catch {
      toast.error('Failed to copy')
    }
  }, [])

  const togglePrivacyMode = useCallback(() => {
    setPrivacyMode(!privacyMode)
    if (!privacyMode) {
      toast.success('Privacy mode enabled')
    } else {
      toast.success('Privacy mode disabled')
    }
  }, [privacyMode, setPrivacyMode])

  const renderSummaryItem = (type: keyof SecurityScanResult['summary'], icon: React.ReactNode, label: string) => {
    if (!securityScanResult) return null
    const count = securityScanResult.summary[type]
    if (count === 0) return null

    return (
      <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <Badge variant="destructive" className="text-xs">
          {count}
        </Badge>
      </div>
    )
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Security</span>
        </div>
      </div>

      {/* Privacy Mode Toggle */}
      <div className="p-3 border-b">
        <button
          onClick={togglePrivacyMode}
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
            privacyMode ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-2">
            {privacyMode ? (
              <Lock className="h-4 w-4 text-primary" />
            ) : (
              <Unlock className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="text-left">
              <div className="text-sm font-medium">Privacy Mode</div>
              <div className="text-xs text-muted-foreground">
                {privacyMode ? 'History & sharing disabled' : 'Enable to protect data'}
              </div>
            </div>
          </div>
          <div
            className={cn(
              'w-10 h-6 rounded-full transition-colors flex items-center',
              privacyMode ? 'bg-primary justify-end' : 'bg-muted justify-start'
            )}
          >
            <div className="w-4 h-4 rounded-full bg-white m-1 shadow" />
          </div>
        </button>

        {privacyMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 p-2 bg-primary/5 rounded text-xs text-primary"
          >
            <ul className="space-y-1">
              <li>• History saving disabled</li>
              <li>• Share links disabled</li>
              <li>• LocalStorage not used</li>
            </ul>
          </motion.div>
        )}
      </div>

      {/* Scan Button */}
      <div className="p-3 border-b">
        <Button
          onClick={runScan}
          disabled={!leftEditor.content || isScanning}
          className="w-full"
          variant="outline"
        >
          {isScanning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <ShieldAlert className="h-4 w-4 mr-2" />
              Scan for Sensitive Data
            </>
          )}
        </Button>
      </div>

      {/* Scan Results */}
      <div className="flex-1 overflow-y-auto">
        {securityScanResult ? (
          <>
            {/* Summary */}
            <div className="p-3 border-b space-y-2">
              {securityScanResult.summary.total === 0 ? (
                <div className="flex items-center gap-2 text-success p-3 bg-success/10 rounded-lg">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-medium">No sensitive data detected</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-destructive p-3 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {securityScanResult.summary.total} sensitive item(s) found
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    {renderSummaryItem('jwt', <Badge className="h-2 w-2 rounded-full bg-purple-500" />, 'JWT Tokens')}
                    {renderSummaryItem('api_key', <Badge className="h-2 w-2 rounded-full bg-red-500" />, 'API Keys')}
                    {renderSummaryItem('email', <Badge className="h-2 w-2 rounded-full bg-blue-500" />, 'Emails')}
                    {renderSummaryItem('phone', <Badge className="h-2 w-2 rounded-full bg-green-500" />, 'Phone Numbers')}
                    {renderSummaryItem('secret', <Badge className="h-2 w-2 rounded-full bg-orange-500" />, 'Secrets')}
                    {renderSummaryItem('credit_card', <Badge className="h-2 w-2 rounded-full bg-pink-500" />, 'Credit Cards')}
                  </div>
                </>
              )}
            </div>

            {/* Detailed Matches */}
            {securityScanResult.matches.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-muted-foreground px-2 py-1 mb-2">Detailed Findings</div>
                <AnimatePresence>
                  {securityScanResult.matches.map((match, index) => {
                    const isExpanded = expandedMatch === `${match.path}-${index}`
                    return (
                      <motion.div
                        key={`${match.path}-${index}`}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="mb-2"
                      >
                        <button
                          onClick={() => setExpandedMatch(isExpanded ? null : `${match.path}-${index}`)}
                          className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted text-left transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={cn(
                                'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border',
                                getSensitiveTypeColor(match.type)
                              )}
                            >
                              {getSensitiveTypeLabel(match.type)}
                            </span>
                            {match.line && (
                              <span className="text-xs text-muted-foreground">Line {match.line}</span>
                            )}
                          </div>
                          <code className="text-xs font-mono text-foreground truncate block">
                            {match.path || '$'}
                          </code>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 bg-muted/30 rounded-b-lg border-t space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Value preview:</span>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyPath(match.path)
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <code className="text-xs font-mono bg-background/50 p-2 rounded block break-all">
                                  {match.preview}
                                </code>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4">
            <Shield className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-center">Click "Scan" to detect sensitive data in your content</p>
          </div>
        )}
      </div>
    </div>
  )
}
