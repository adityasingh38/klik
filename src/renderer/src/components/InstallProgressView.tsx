import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

  return (
    <div className="flex flex-col gap-4">
      <Progress value={total > 0 ? (doneCount / total) * 100 : 0} />

      <div className="flex flex-col gap-2">
        {results.map((result, index) => (
          <div
            key={`${result.serverId}-${result.clientId}-${index}`}
            className="flex items-center justify-between rounded-md bg-card px-3 py-2"
          >
            <span className="text-sm">
              {result.serverId} &rarr; {result.clientId}
            </span>
            {result.status === 'running' && <Spinner className="size-4" />}
            {result.status === 'done' && (
              <div className="flex flex-col items-end gap-0.5">
                <Badge className="bg-success text-success-foreground">Installed</Badge>
                {result.message && (
                  <span className="text-xs text-muted-foreground">{result.message}</span>
                )}
              </div>
            )}
            {result.status === 'error' && (
              <Badge variant="destructive">{result.message ?? 'Failed'}</Badge>
            )}
            {result.status === 'pending' && (
              <span className="text-xs text-muted-foreground">Waiting…</span>
            )}
          </div>
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
