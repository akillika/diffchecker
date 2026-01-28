import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  children: React.ReactNode
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const Tooltip = ({ children, content, side = 'top', className }: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [coords, setCoords] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        x: rect.left + rect.width / 2,
        y: side === 'top' ? rect.top : rect.bottom,
      })
    }
    setIsVisible(true)
  }

  const hideTooltip = () => setIsVisible(false)

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            'fixed z-50 px-2 py-1 text-xs font-medium text-popover-foreground bg-popover border rounded-md shadow-md animate-fade-in pointer-events-none',
            side === 'top' ? '-translate-y-full -mt-2' : 'mt-2',
            '-translate-x-1/2',
            className
          )}
          style={{
            left: coords.x,
            top: coords.y,
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

export { Tooltip }
