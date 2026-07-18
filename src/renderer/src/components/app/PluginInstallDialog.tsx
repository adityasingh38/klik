import React, { useEffect, useState } from 'react'
import { ShieldCheck, ShieldQuestion, TriangleAlert, Terminal, Store, CheckCircle2, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Spinner } from '@/components/ui/spinner'
import { klikApi } from '../../api/klikApi'
import type { PluginEntry, PluginInstallPreview, PluginInstallStepResult } from '../../../../shared/catalog'

interface PluginInstallDialogProps {
  plugin: PluginEntry
  onCancel: () => void
  onDone: () => void
}

function Section({
  icon: Icon,
  title,
  children
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </div>
      {children}
    </div>
  )
}

type Phase = 'preview' | 'installing' | 'done'

export function PluginInstallDialog(props: PluginInstallDialogProps): React.JSX.Element {
  const { plugin, onCancel, onDone } = props
  const [phase, setPhase] = useState<Phase>('preview')
  const [preview, setPreview] = useState<PluginInstallPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allowMarketplaceAdd, setAllowMarketplaceAdd] = useState(false)
  const [results, setResults] = useState<PluginInstallStepResult[]>([])

  useEffect(() => {
    let cancelled = false
    klikApi
      .pluginPreflight({ plugin })
      .then((result) => {
        if (!cancelled) setPreview(result)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [plugin])

  const isLoading = !preview && !error
  const needsMarketplaceConsent = preview ? !preview.marketplaceAlreadyKnown && !allowMarketplaceAdd : false
  const blocked = !preview?.cliAvailable || preview?.alreadyInstalled

  async function confirm(): Promise<void> {
    setPhase('installing')
    const steps = await klikApi.installPlugin({ plugin, allowMarketplaceAdd })
    setResults(steps)
    setPhase('done')
  }

  return (
    <Dialog open onOpenChange={(open: boolean) => { if (!open && phase !== 'installing') onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {phase === 'done' ? 'Install complete' : 'Review before installing'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'done'
              ? 'Claude Code finished processing this plugin.'
              : 'Klik runs Claude Code’s own CLI. These are the exact commands it will run.'}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-foreground/90">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Checking marketplaces and installed plugins…
          </div>
        ) : phase === 'installing' ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Running Claude Code CLI…
          </div>
        ) : phase === 'done' ? (
          <div className="flex max-h-[52vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
                {r.status === 'done' ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success-foreground" />
                ) : (
                  <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <code className="truncate font-mono text-[11px] text-foreground">{r.step}</code>
                  {r.message && <span className="text-muted-foreground">{r.message}</span>}
                </span>
              </div>
            ))}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Restart Claude Code for plugin changes to take effect.
            </p>
          </div>
        ) : (
          preview && (
            <div className="flex max-h-[52vh] flex-col gap-5 overflow-y-auto pr-1">
              <Section icon={Store} title="Plugin">
                <div className="rounded-md border border-border bg-card px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-medium text-foreground">{preview.title}</span>
                    {preview.verified ? (
                      <Badge className="gap-1 bg-accent text-accent-foreground">
                        <ShieldCheck className="size-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <ShieldQuestion className="size-3" /> Unverified
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Marketplace
                    </span>
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {preview.marketplaceSource}
                      {preview.marketplaceAlreadyKnown ? ' · already trusted' : ' · new'}
                    </span>
                  </div>
                </div>
              </Section>

              <Section icon={Terminal} title="Commands Klik will run">
                <div className="flex flex-col gap-1">
                  {preview.commands.map((c) => (
                    <code
                      key={c}
                      className="block truncate rounded bg-background px-2 py-1 font-mono text-[11px] text-primary"
                    >
                      {c}
                    </code>
                  ))}
                </div>
              </Section>

              {preview.warnings.length > 0 && (
                <Section icon={TriangleAlert} title="Warnings">
                  <div className="flex flex-col gap-1.5">
                    {preview.warnings.map((w, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground/90"
                      >
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {!preview.marketplaceAlreadyKnown && preview.cliAvailable && (
                <label className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5">
                  <Checkbox
                    checked={allowMarketplaceAdd}
                    onCheckedChange={(v: boolean) => setAllowMarketplaceAdd(v)}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground">
                      Trust and add the marketplace {preview.marketplaceSource}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Off by default. A marketplace can publish code that runs inside Claude Code.
                    </span>
                  </span>
                </label>
              )}
            </div>
          )
        )}

        <DialogFooter>
          {phase === 'done' ? (
            <Button onClick={onDone}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onCancel} disabled={phase === 'installing'}>
                Cancel
              </Button>
              <ShimmerButton
                disabled={isLoading || !!error || blocked || needsMarketplaceConsent || phase === 'installing'}
                onClick={() => void confirm()}
                background="var(--primary)"
                shimmerColor="#eeeae2"
                shimmerDuration="2.5s"
                borderRadius="var(--radius-lg)"
                className="h-9 rounded-lg border-none px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Add plugin
              </ShimmerButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
