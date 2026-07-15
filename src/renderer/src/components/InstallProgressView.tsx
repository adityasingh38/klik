import React from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Badge } from '@astryxdesign/core/Badge'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
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
    <VStack gap={4} width="100%">
      <ProgressBar
        label="Install progress"
        value={doneCount}
        max={total || 1}
        hasValueLabel
        isIndeterminate={isInstalling && total === 0}
        variant={results.some((r) => r.status === 'error') ? 'warning' : 'accent'}
      />

      <VStack gap={2}>
        {results.map((result, index) => (
          <HStack key={`${result.serverId}-${result.clientId}-${index}`} justify="between" align="center">
            <Text type="body">
              {result.serverId} → {result.clientId}
            </Text>
            {result.status === 'running' && <Spinner size="sm" label="Installing" />}
            {result.status === 'done' && <Badge variant="success" label="Installed" />}
            {result.status === 'error' && <Badge variant="error" label={result.message ?? 'Failed'} />}
            {result.status === 'pending' && <Text type="supporting">Waiting…</Text>}
          </HStack>
        ))}
      </VStack>

      <HStack justify="end">
        <Button label="Done" variant="primary" isDisabled={isInstalling} onClick={onDone} />
      </HStack>
    </VStack>
  )
}
