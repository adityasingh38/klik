import React, { useEffect, useState } from 'react'
import { ShieldCheck, ShieldQuestion, TriangleAlert, FolderDown, FileCog, CheckCircle2, XCircle } from 'lucide-react'
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
import type { SkillEntry, SkillInstallPreview, SkillInstallStepResult } from '../../../../shared/catalog'

interface SkillInstallDialogProps {
  skill: SkillEntry
  targetToolIds: string[]
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Phase = 'preview' | 'installing' | 'done'

export function SkillInstallDialog(props: SkillInstallDialogProps): React.JSX.Element {
  const { skill, targetToolIds, onCancel, onDone } = props
  const [phase, setPhase] = useState<Phase>('preview')
  const [preview, setPreview] = useState<SkillInstallPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allowOverwrite, setAllowOverwrite] = useState(false)
  const [results, setResults] = useState<SkillInstallStepResult[]>([])

  useEffect(() => {
    let cancelled = false
    klikApi
      .skillPreflight({ skill, targetToolIds })
      .then((result) => {
        if (!cancelled) setPreview(result)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [skill, targetToolIds])

  const supported = preview?.targets.filter((t) => t.supported) ?? []
  const blocked = preview?.targets.filter((t) => !t.supported) ?? []
  const overwrites = supported.filter((t) => t.wouldOverwrite)
  const needsConsent = overwrites.length > 0 && !allowOverwrite
  const isLoading = !preview && !error

  async function confirm(): Promise<void> {
    setPhase('installing')
    const steps = await klikApi.installSkill({ skill, targetToolIds, allowOverwrite })
    setResults(steps)
    setPhase('done')
  }

  const succeeded = results.filter((r) => r.status === 'done')

  return (
    <Dialog open onOpenChange={(open: boolean) => { if (!open && phase !== 'installing') onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {phase === 'done'
              ? succeeded.length > 0
                ? `${skill.title} installed`
                : `${skill.title} was not installed`
              : 'Review before installing'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'done'
              ? succeeded.length > 0
                ? `${preview?.files.length ?? 0} files written.`
                : 'Nothing was written.'
              : 'Exactly which files Klik will download and where they land. Nothing is written until you confirm.'}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-foreground/90">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Resolving files from the source…
          </div>
        ) : phase === 'installing' ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Downloading and writing files…
          </div>
        ) : phase === 'done' ? (
          <div className="flex max-h-[52vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {results.map((r, i) => {
              // The tool's own name and the real path — a raw tool id tells the user
              // nothing about what just happened to their machine.
              const target = preview?.targets.find((t) => t.toolId === r.toolId)
              return (
                <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
                  {r.status === 'done' ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success-foreground" />
                  ) : (
                    <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  )}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-foreground">{target?.displayName ?? r.toolId}</span>
                    {target?.skillDir && (
                      <span className="break-all font-mono text-[11px] text-muted-foreground">
                        {target.skillDir}
                      </span>
                    )}
                    {r.message && <span className="text-muted-foreground">{r.message}</span>}
                  </span>
                </div>
              )
            })}
            {succeeded.length > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Skills are loaded when a session starts — restart the tool to use this one.
              </p>
            )}
          </div>
        ) : (
          preview && (
            <div className="flex max-h-[52vh] flex-col gap-5 overflow-y-auto pr-1">
              <Section icon={FolderDown} title="Source">
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
                  <code className="mt-1.5 block truncate rounded bg-background px-2 py-1 font-mono text-[11px] text-primary">
                    {preview.source}
                  </code>
                </div>
              </Section>

              <Section icon={FileCog} title={`Files (${preview.files.length} · ${formatBytes(preview.totalBytes)})`}>
                <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
                  {preview.files.map((f) => (
                    <div key={f.relativePath} className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-mono text-[11px] text-muted-foreground">{f.relativePath}</span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {formatBytes(f.bytes)}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={FolderDown} title="Installs into">
                <div className="flex flex-col gap-1">
                  {supported.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No tool selected can accept this skill.</span>
                  ) : (
                    supported.map((t) => (
                      <div key={t.toolId} className="flex items-baseline gap-2">
                        <span className="shrink-0 text-xs text-foreground">{t.displayName}</span>
                        <span className="truncate font-mono text-[11px] text-muted-foreground">{t.skillDir}</span>
                      </div>
                    ))
                  )}
                  {blocked.map((b) => (
                    <span key={b.toolId} className="text-[11px] text-destructive">
                      Skipped — {b.reason}
                    </span>
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

              {overwrites.length > 0 && (
                <label className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5">
                  <Checkbox
                    checked={allowOverwrite}
                    onCheckedChange={(v: boolean) => setAllowOverwrite(v)}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground">
                      Replace the existing &ldquo;{skill.installName}&rdquo; skill
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      The current folder is deleted and rewritten. Any local edits to it are lost.
                    </span>
                  </span>
                </label>
              )}
            </div>
          )
        )}

        <DialogFooter>
          {phase === 'done' ? (
            <Button onClick={onDone}>{succeeded.length > 0 ? 'Done' : 'Close'}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onCancel} disabled={phase === 'installing'}>
                Cancel
              </Button>
              <ShimmerButton
                disabled={isLoading || !!error || supported.length === 0 || needsConsent || phase === 'installing'}
                onClick={() => void confirm()}
                background="var(--primary)"
                shimmerColor="#eeeae2"
                shimmerDuration="2.5s"
                borderRadius="var(--radius-lg)"
                className="h-9 rounded-lg border-none px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Install skill
              </ShimmerButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
