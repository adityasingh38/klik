import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useTheme } from '@/lib/theme'
import { SPRING } from '@/lib/motion'

/**
 * Flips between light and dark, passing the click position so the new theme wipes in
 * as a circle from the cursor rather than snapping. Clicking always commits to an
 * explicit choice — someone reaching for this wants a theme, not a preference to keep
 * tracking the OS.
 */
export function ThemeToggle({ className }: { className?: string }): React.JSX.Element {
  const { resolved, setTheme } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const isDark = resolved === 'dark'
  const Icon = isDark ? Sun : Moon

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              const rect = event.currentTarget.getBoundingClientRect()
              setTheme(isDark ? 'light' : 'dark', {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
              })
            }}
            className={`focus-ring no-drag flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground ${className ?? ''}`}
          >
            <motion.span
              key={isDark ? 'sun' : 'moon'}
              initial={prefersReducedMotion ? false : { rotate: -70, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={SPRING.snappy}
              className="flex"
            >
              <Icon className="size-4" />
            </motion.span>
          </button>
        }
      />
      <TooltipContent>{isDark ? 'Light theme' : 'Dark theme'}</TooltipContent>
    </Tooltip>
  )
}
