import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Check, FileText, Code2, Globe, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KlikMark } from '../KlikLogo'
import { ToolMark } from '../ToolBadges'
import { toolBrand } from '../../../../shared/tools'
import { SPRING, staggerDelay } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { DetectedTool } from '../../../../shared/catalog'

export interface Intent {
  id: string
  label: string
  blurb: string
  icon: React.ComponentType<{ className?: string }>
  /** Curated server ids this intent recommends. */
  servers: string[]
}

/**
 * Intents are phrased as things a person wants to do, not as categories of software.
 * Someone arriving at Klik for the first time does not yet know what an MCP server is,
 * and shouldn't have to in order to get a useful one installed.
 */
export const INTENTS: Intent[] = [
  {
    id: 'documents',
    label: 'Work with documents',
    blurb: 'Read and write PDFs, spreadsheets and decks',
    icon: FileText,
    servers: ['com.notion/notion-mcp-server']
  },
  {
    id: 'code',
    label: 'Write and ship code',
    blurb: 'Up-to-date docs, and a browser it can drive',
    icon: Code2,
    servers: ['com.upstash/context7', 'com.microsoft/playwright-mcp']
  },
  {
    id: 'web',
    label: 'Search and read the web',
    blurb: 'Real results and clean page text',
    icon: Globe,
    servers: ['ai.exa/exa-mcp-server', 'com.firecrawl/firecrawl-mcp']
  },
  {
    id: 'memory',
    label: 'Remember things',
    blurb: 'Keep context across conversations',
    icon: Brain,
    servers: ['io.modelcontextprotocol/server-memory']
  }
]

interface FirstRunProps {
  tools: DetectedTool[]
  /** Called with the recommended server ids once the intents are chosen. */
  onFinish: (recommendedServerIds: string[]) => void
}

export function FirstRun({ tools, onFinish }: FirstRunProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion()
  const [beat, setBeat] = useState<1 | 2>(1)
  const [chosen, setChosen] = useState<string[]>([])

  const found = tools.filter((t) => t.installed)

  // Beat one is a held moment, not a wait: detection has already resolved, and the
  // pause exists so the person sees their own tools being recognised.
  useEffect(() => {
    const timer = setTimeout(() => setBeat(2), prefersReducedMotion ? 400 : 2100)
    return () => clearTimeout(timer)
  }, [prefersReducedMotion])

  function toggle(id: string): void {
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function finish(): void {
    const picked = chosen.length > 0 ? chosen : INTENTS.map((i) => i.id)
    const ids = [
      ...new Set(
        INTENTS.filter((i) => picked.includes(i.id)).flatMap((i) => i.servers)
      )
    ]
    onFinish(ids.slice(0, 3))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-6">
      <AnimatePresence mode="wait">
        {beat === 1 ? (
          <motion.div
            key="detect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING.standard}
            className="flex w-full max-w-md flex-col items-center gap-7 text-center"
          >
            <KlikMark size={56} state="working" />
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                Finding your apps
              </h1>
              <p className="text-sm text-muted-foreground">
                Klik installs into the AI tools already on this machine.
              </p>
            </div>

            <div className="flex flex-col gap-2 self-stretch">
              {found.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No AI tools found yet — you can still browse everything.
                </p>
              ) : (
                found.map((tool, index) => {
                  const brand = toolBrand(tool.id)
                  return (
                    <motion.div
                      key={tool.id}
                      initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...SPRING.standard, delay: 0.25 + staggerDelay(index) * 4 }}
                      className="surface-raised flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                    >
                      {brand && <ToolMark brand={brand} detected size={20} />}
                      <span className="text-sm font-medium text-foreground">{tool.displayName}</span>
                      <Check className="ml-auto size-4 text-primary" />
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="intent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING.standard}
            className="flex w-full max-w-2xl flex-col gap-7"
          >
            <div className="flex flex-col gap-2 text-center">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                What should your AI be able to do?
              </h1>
              <p className="text-sm text-muted-foreground">
                Pick anything that sounds useful. You can change all of this later.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {INTENTS.map((intent, index) => {
                const Icon = intent.icon
                const on = chosen.includes(intent.id)
                return (
                  <motion.button
                    key={intent.id}
                    type="button"
                    onClick={() => toggle(intent.id)}
                    aria-pressed={on}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING.standard, delay: staggerDelay(index) * 2 }}
                    whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                    className={cn(
                      'focus-ring surface-raised flex items-start gap-3 rounded-2xl border p-5 text-left transition-colors',
                      on ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-elevated'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                        on ? 'bg-primary text-primary-foreground' : 'bg-elevated text-primary'
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-heading text-[0.98rem] font-semibold text-foreground">
                        {intent.label}
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {intent.blurb}
                      </span>
                    </span>
                  </motion.button>
                )
              })}
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={() => onFinish([])}>
                Skip
              </Button>
              <Button onClick={finish} className="px-6">
                {chosen.length > 0 ? 'Show me what to install' : 'Show me everything'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
