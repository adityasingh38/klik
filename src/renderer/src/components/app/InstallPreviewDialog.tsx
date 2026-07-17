import React, { useState } from 'react'
import { ShieldCheck, BadgeCheck, TriangleAlert, Terminal, FileCog, KeyRound, PackagePlus, Globe, ShieldQuestion } from 'lucide-react'
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
import type { InstallPreview } from '../../../../shared/types'

interface InstallPreviewDialogProps {
  previews: InstallPreview[]
  isLoading: boolean
  onCancel: () => void
  onConfirm: (allowRuntimeInstall: boolean) => void
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

export function InstallPreviewDialog(props: InstallPreviewDialogProps): React.JSX.Element {
  const { previews, isLoading, onCancel, onConfirm } = props
  const [allowRuntimeInstall, setAllowRuntimeInstall] = useState(false)

  const missingRuntimes = [
    ...new Set(
      previews.flatMap((p) => p.runtimes.filter((r) => !r.available && r.canAutoInstall).map((r) => r.runtime))
    )
  ]
  const unfixableRuntimes = [
    ...new Set(
      previews.flatMap((p) => p.runtimes.filter((r) => !r.available && !r.canAutoInstall).map((r) => r.runtime))
    )
  ]
  const allWarnings = previews.flatMap((p) => p.warnings.map((w) => ({ server: p.title, text: w })))
  const configPaths = [
    ...new Map(
      previews.flatMap((p) => p.targets.filter((t) => t.supported).map((t) => [t.configPath, t]))
    ).values()
  ]
  const blockedTargets = previews.flatMap((p) =>
    p.targets.filter((t) => !t.supported).map((t) => ({ server: p.title, reason: t.reason ?? 'Unsupported' }))
  )
  const unverified = previews.filter((p) => !p.verified)
  const secretNames = [...new Set(previews.flatMap((p) => p.secretNames))]

  return (
    <Dialog open onOpenChange={(open: boolean) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Review before installing</DialogTitle>
          <DialogDescription>
            Exactly what Klik will run and change on this machine. Nothing is written until you confirm.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Checking runtimes and client configs…
          </div>
        ) : (
          <div className="flex max-h-[52vh] flex-col gap-5 overflow-y-auto pr-1">
            {/* What will run — the core disclosure. */}
            <Section icon={Terminal} title={`Will run (${previews.length} server${previews.length > 1 ? 's' : ''})`}>
              <div className="flex flex-col gap-1.5">
                {previews.map((p) => (
                  <div key={p.serverId} className="rounded-md border border-border bg-card px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-foreground">{p.title}</span>
                      {p.verified ? (
                        <Badge className="gap-1 bg-accent text-accent-foreground">
                          <ShieldCheck className="size-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <ShieldQuestion className="size-3" /> Unverified
                        </Badge>
                      )}
                      {p.tested && (
                        <Badge variant="outline" className="gap-1">
                          <BadgeCheck className="size-3" /> Tested
                        </Badge>
                      )}
                    </div>
                    {p.commandLine ? (
                      <code className="mt-1.5 block truncate rounded bg-background px-2 py-1 font-mono text-[11px] text-primary">
                        {p.commandLine}
                      </code>
                    ) : (
                      <span className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <Globe className="size-3" /> {p.url}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {unverified.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-border bg-elevated px-3 py-2.5 text-xs text-muted-foreground">
                <ShieldQuestion className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  {unverified.length === previews.length ? 'This server has' : `${unverified.length} of these have`} not
                  been reviewed by Klik. An MCP server runs with your full user permissions — only install code you
                  trust.
                </span>
              </div>
            )}

            {allWarnings.length > 0 && (
              <Section icon={TriangleAlert} title="Warnings">
                <div className="flex flex-col gap-1.5">
                  {allWarnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground/90"
                    >
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                      <span>
                        <span className="font-medium">{w.server}:</span> {w.text}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section icon={FileCog} title="Files Klik will edit">
              <div className="flex flex-col gap-1">
                {configPaths.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No writable client selected.</span>
                ) : (
                  configPaths.map((t) => (
                    <div key={t.configPath} className="flex items-baseline gap-2">
                      <span className="shrink-0 text-xs text-foreground">{t.displayName}</span>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">{t.configPath}</span>
                    </div>
                  ))
                )}
                {blockedTargets.map((b, i) => (
                  <span key={i} className="text-[11px] text-destructive">
                    Skipped — {b.reason}
                  </span>
                ))}
              </div>
            </Section>

            {secretNames.length > 0 && (
              <Section icon={KeyRound} title="Secrets stored in client config">
                <div className="flex flex-wrap gap-1.5">
                  {secretNames.map((name) => (
                    <code key={name} className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
                      {name}
                    </code>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Saved in plain text in the config files above — same as editing them by hand.
                </span>
              </Section>
            )}

            {(missingRuntimes.length > 0 || unfixableRuntimes.length > 0) && (
              <Section icon={PackagePlus} title="Missing runtimes">
                {missingRuntimes.length > 0 && (
                  <label className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5">
                    <Checkbox
                      checked={allowRuntimeInstall}
                      onCheckedChange={(v: boolean) => setAllowRuntimeInstall(v)}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-foreground">
                        Install {missingRuntimes.join(', ')} system-wide via winget
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Off by default. Unchecked, Klik still installs the server — it just won&apos;t run until the
                        runtime exists.
                      </span>
                    </span>
                  </label>
                )}
                {unfixableRuntimes.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {unfixableRuntimes.join(', ')} must be installed manually — Klik won&apos;t do it for you.
                  </span>
                )}
              </Section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <ShimmerButton
            disabled={isLoading || configPaths.length === 0}
            onClick={() => onConfirm(allowRuntimeInstall)}
            background="var(--primary)"
            shimmerColor="#eeeae2"
            shimmerDuration="2.5s"
            borderRadius="var(--radius-lg)"
            className="h-9 rounded-lg border-none px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Install
          </ShimmerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
