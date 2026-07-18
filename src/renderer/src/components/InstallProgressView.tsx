import React, { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KlikMark } from './KlikLogo'
import { SPRING, staggerDelay } from '@/lib/motion'
import { playKlik } from '@/lib/sound'
import { useTheme } from '@/lib/theme'
import type { InstallStepResult } from '../../../shared/types'

interface InstallProgressViewProps {
  results: InstallStepResult[]
  isInstalling: boolean
  onDone: () => void
}

/**
 * The install moment. The mark works while the write happens and seats when it lands,
 * so the thing that resolves is the product's own logo completing itself — not a
 * progress bar finishing, and not confetti, which is the tell of a generated app.
 *
 * The click fires once, on success only.
 */
export function InstallProgressView(props: InstallProgressViewProps): React.JSX.Element {
  const { results, isInstalling, onDone } = props
  const prefersReducedMotion = useReducedMotion()
  const { sound } = useTheme()

  const total = results.length
  const doneCount = results.filter((r) => r.status === 'done').length
  const failed = results.filter((r) => r.status === 'error')
  const settled = total > 0 && !isInstalling
  const succeeded = settled && failed.length === 0

  const hasSounded = useRef(false)
  useEffect(() => {
    if (succeeded && sound && !hasSounded.current) {
      hasSounded.current = true
      playKlik()
    }
    if (!settled) hasSounded.current = false
  }, [succeeded, settled, sound])

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <motion.div
        // The seat: the mark lands with overshoot. This is the one place in the
        // product where the expressive spring is allowed.
        animate={succeeded && !prefersReducedMotion ? { scale: [0.9, 1.06, 1] } : { scale: 1 }}
        transition={SPRING.expressive}
      >
        <KlikMark size={64} state={isInstalling ? 'working' : succeeded ? 'seating' : 'idle'} />
      </motion.div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-heading text-lg font-semibold text-foreground">
          {isInstalling
            ? 'Installing…'
            : succeeded
              ? total === 1
                ? 'Installed'
                : `${doneCount} installed`
              : 'Some installs failed'}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isInstalling
            ? 'Writing configuration into your apps.'
            : succeeded
              ? 'Restart the app you installed into for it to pick these up.'
              : `${doneCount} of ${total} completed.`}
        </p>
      </div>

      <div className="flex w-full flex-col gap-1.5">
        {results.map((result, index) => (
          <motion.div
            key={`${result.serverId}-${result.clientId}-${index}`}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING.standard, delay: staggerDelay(index) }}
            className="flex min-w-0 items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-xs"
          >
            {result.status === 'error' ? (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-foreground" />
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium text-foreground">{result.clientId}</span>
              {result.message && <span className="text-muted-foreground">{result.message}</span>}
            </span>
          </motion.div>
        ))}
      </div>

      <Button disabled={isInstalling} onClick={onDone} className="w-full">
        Done
      </Button>
    </div>
  )
}
