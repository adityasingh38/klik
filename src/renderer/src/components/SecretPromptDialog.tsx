import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ShimmerButton } from '@/components/ui/shimmer-button'
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
  const canContinue = requiredEnv.every((envVar) => values[envVar.name])

  return (
    <Dialog open onOpenChange={(open: boolean) => { if (!open) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Configure {server.title}</DialogTitle>
          <DialogDescription>Required values for this server</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {requiredEnv.map((envVar) => (
            <div key={envVar.name} className="flex flex-col gap-1.5">
              <Label htmlFor={envVar.name}>{envVar.name}</Label>
              <Input
                id={envVar.name}
                type={envVar.isSecret ? 'password' : 'text'}
                value={values[envVar.name] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [envVar.name]: e.target.value }))}
              />
              {envVar.description && (
                <p className="text-xs text-muted-foreground">{envVar.description}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <ShimmerButton
            disabled={!canContinue}
            onClick={() => onSubmit(values)}
            background="var(--primary)"
            shimmerColor="#eeeae2"
            shimmerDuration="2.5s"
            borderRadius="var(--radius-lg)"
            className="h-8 rounded-lg border-none px-3 text-sm font-medium text-primary-foreground"
          >
            Continue
          </ShimmerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
