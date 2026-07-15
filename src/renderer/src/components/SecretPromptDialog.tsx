import React, { useState } from 'react'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Button } from '@astryxdesign/core/Button'
import type { MergedServerEntry } from '../../../shared/types'

interface SecretPromptDialogProps {
  server: MergedServerEntry
  onSubmit: (secrets: Record<string, string>) => void
  onCancel: () => void
}

export function SecretPromptDialog(props: SecretPromptDialogProps): React.JSX.Element {
  const { server, onSubmit, onCancel } = props
  const [values, setValues] = useState<Record<string, string>>({})

  const requiredEnv = server.requiredEnv.filter((envVar) => envVar.isRequired)

  return (
    <Dialog isOpen onOpenChange={(open) => { if (!open) onCancel() }} purpose="form" width={440}>
      <Layout
        header={
          <DialogHeader
            title={`Configure ${server.title}`}
            subtitle="Required values for this server"
            onOpenChange={() => onCancel()}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              {requiredEnv.map((envVar) => (
                <TextInput
                  key={envVar.name}
                  label={envVar.name}
                  description={envVar.description}
                  type={envVar.isSecret ? 'password' : 'text'}
                  value={values[envVar.name] ?? ''}
                  onChange={(value) => setValues((prev) => ({ ...prev, [envVar.name]: value }))}
                />
              ))}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onCancel} />
              <Button
                label="Continue"
                variant="primary"
                isDisabled={requiredEnv.some((envVar) => !values[envVar.name])}
                onClick={() => onSubmit(values)}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
