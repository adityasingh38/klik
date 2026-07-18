import React from 'react'
import { RefreshCw, ExternalLink, Palette, Database, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { KlikLogo } from '../components/KlikLogo'
import { useTheme } from '@/lib/theme'
import { playKlik } from '@/lib/sound'
import { cn } from '@/lib/utils'
import type { ThemePreference } from '../../../shared/prefs'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

interface SettingsViewProps {
  serverCount: number
  fromCache: boolean
  isRefreshing: boolean
  onRefresh: () => void
}

function Row({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export function SettingsView(props: SettingsViewProps): React.JSX.Element {
  const { serverCount, fromCache, isRefreshing, onRefresh } = props
  const { preference, setTheme, sound, setSound } = useTheme()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="surface-raised flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <KlikLogo size={40} showWordmark={false} />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-bold text-foreground">Klik</span>
            <Badge variant="outline">v{__APP_VERSION__}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Install MCP servers, skills and plugins into the AI tools you already use.
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 px-5">
        <Row
          icon={Database}
          title="Server registry"
          description={
            fromCache
              ? `${serverCount} servers · showing cached data`
              : `${serverCount} servers loaded from the registry`
          }
          action={
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={isRefreshing ? 'size-4 animate-spin' : 'size-4'} /> Refresh
            </Button>
          }
        />
        <Separator />
        <Row
          icon={Palette}
          title="Appearance"
          description="Follows your system by default."
          action={
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-0.5">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={preference === option.value}
                  className={cn(
                    'focus-ring rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    preference === option.value
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        />
        <Separator />
        <Row
          icon={Volume2}
          title="Install sound"
          description="A short click when an install lands. Nothing else makes a sound."
          action={
            <div className="flex items-center gap-2">
              {sound && (
                <Button variant="ghost" size="sm" onClick={() => playKlik()}>
                  Play
                </Button>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={sound}
                aria-label="Install sound"
                onClick={() => {
                  const next = !sound
                  setSound(next)
                  // Hearing it the moment you enable it is the whole confirmation.
                  if (next) playKlik()
                }}
                className={cn(
                  'focus-ring relative h-6 w-10 rounded-full border transition-colors',
                  sound ? 'border-primary bg-primary' : 'border-border bg-muted'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-4 rounded-full bg-background transition-all',
                    sound ? 'left-[1.125rem]' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          }
        />
        <Separator />
        <Row
          icon={ExternalLink}
          title="Source code"
          description="Klik is open source. Report issues or contribute on GitHub."
          action={
            <Button
              variant="outline"
              size="sm"
              render={
                <a href="https://github.com/adityasingh38/klik" target="_blank" rel="noreferrer" />
              }
            >
              <ExternalLink className="size-4" /> GitHub
            </Button>
          }
        />
      </div>
    </div>
  )
}
