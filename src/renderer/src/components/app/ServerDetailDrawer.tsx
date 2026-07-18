import React from 'react'
import { ExternalLink, ShieldCheck, BadgeCheck, TriangleAlert, KeyRound, Trash2 } from 'lucide-react'
import {
  Drawer,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerPanel,
  DrawerFooter,
  DrawerClose
} from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ServerLogo } from '../ServerLogo'
import { HostCompat } from '../HostCompat'
import type { ClientId, MergedServerEntry } from '../../../../shared/types'

interface ServerDetailDrawerProps {
  server: MergedServerEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isInstalled: boolean
  detectedClientIds: ClientId[]
  onInstall: (server: MergedServerEntry) => void
  onUninstall: (serverId: string) => void
}

function Meta({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground">{value}</span>
    </div>
  )
}

export function ServerDetailDrawer(props: ServerDetailDrawerProps): React.JSX.Element | null {
  const { server, open, onOpenChange, isInstalled, detectedClientIds, onInstall, onUninstall } = props
  if (!server) return null

  const requiredEnv = server.requiredEnv.filter((e) => e.isRequired)

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position="right">
      <DrawerPopup showCloseButton className="w-[26rem] max-w-[92vw]">
        <DrawerHeader>
          <ServerLogo server={server} size={44} className="mb-1 rounded-lg" />
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle>{server.title}</DrawerTitle>
            {server.curation?.verified && (
              <Badge className="gap-1 bg-accent text-accent-foreground">
                <ShieldCheck className="size-3" /> Verified
              </Badge>
            )}
            {server.curation?.tested && (
              <Badge variant="outline" className="gap-1">
                <BadgeCheck className="size-3" /> Tested
              </Badge>
            )}
            {isInstalled && <Badge className="bg-success text-success-foreground">Installed</Badge>}
          </div>
          <DrawerDescription className="font-mono text-[11px]">{server.id}</DrawerDescription>
        </DrawerHeader>

        <DrawerPanel className="flex flex-col gap-5">
          <p className="text-sm leading-relaxed text-foreground/90">{server.description}</p>

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card/60 p-4">
            <Meta label="Category" value={server.category} />
            <Meta label="Transport" value={server.transport} />
            <Meta label="Version" value={server.version} />
            <Meta label="Runtime" value={server.requiredRuntime.join(', ') || '—'} />
          </div>

          <HostCompat
            transport={server.transport}
            detectedClientIds={detectedClientIds}
            variant="detail"
            className="rounded-lg border border-border bg-card/60 p-4"
          />

          {server.curation?.warnings && server.curation.warnings.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              {server.curation.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {requiredEnv.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <KeyRound className="size-3.5" /> Required configuration
              </div>
              <div className="flex flex-col gap-2">
                {requiredEnv.map((env) => (
                  <div key={env.name} className="rounded-md border border-border bg-card px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-foreground">{env.name}</span>
                      {env.isSecret && <Badge variant="outline" className="text-[10px]">secret</Badge>}
                    </div>
                    {env.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{env.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {server.repositoryUrl && (
            <>
              <Separator />
              <a
                href={server.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-accent-foreground hover:underline"
              >
                <ExternalLink className="size-3.5" /> View repository
              </a>
            </>
          )}
        </DrawerPanel>

        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
          {isInstalled ? (
            <Button
              variant="destructive"
              onClick={() => {
                onUninstall(server.id)
                onOpenChange(false)
              }}
            >
              <Trash2 className="size-4" /> Uninstall
            </Button>
          ) : (
            <Button
              onClick={() => {
                onInstall(server)
                onOpenChange(false)
              }}
            >
              Install
            </Button>
          )}
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}
