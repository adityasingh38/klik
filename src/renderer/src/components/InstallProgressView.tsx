import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import type { InstallStepResult } from '../../../shared/types'

interface InstallProgressViewProps {
  results: InstallStepResult[]
  isInstalling: boolean
  onDone: () => void
}

export function InstallProgressView(props: InstallProgressViewProps): React.JSX.Element {
  const { results, isInstalling, onDone } = props
  const doneCount = results.filter((r) => r.status === 'done').length
  const total = results.length
  const pct = total > 0 ? (doneCount / total) * 100 : 0
  const reducedMotion = useReducedMotion()

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        {isInstalling && !reducedMotion && (
          <motion.div
            className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-primary-foreground/40 to-transparent"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      {total > 0 && (
        <p className="text-sm text-muted-foreground">
          <NumberTicker value={doneCount} className="text-primary tabular-nums" /> of {total} installed
        </p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((result, index) => (
          <BlurFade key={`${result.serverId}-${result.clientId}-${index}`} direction="up" duration={0.25}>
            <div className="surface-raised flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5">
              <span className="truncate text-sm">
                {result.serverId} &rarr; {result.clientId}
              </span>
              {result.status === 'running' && <Spinner className="size-4 shrink-0" />}
              {result.status === 'done' && (
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <Badge className="bg-success text-success-foreground">Installed</Badge>
                  {result.message && (
                    <span className="text-xs text-muted-foreground">{result.message}</span>
                  )}
                </div>
              )}
              {result.status === 'error' && (
                <Badge variant="destructive" className="shrink-0">
                  {result.message ?? 'Failed'}
                </Badge>
              )}
              {result.status === 'pending' && (
                <span className="shrink-0 text-xs text-muted-foreground">Waiting…</span>
              )}
            </div>
          </BlurFade>
        ))}
      </div>

      <div className="flex justify-end">
        <Button disabled={isInstalling} onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
