import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { MergedServerEntry } from '../../../shared/types'

/**
 * Only ~10% of registry servers declare an `icons` entry, so a logo is assembled from
 * a candidate chain, best source first, each tried in order until one loads:
 *   1. the publisher's declared icon
 *   2. the GitHub owner's avatar (65% of servers carry a repository url)
 *   3. the website's own favicon (71% carry a websiteUrl)
 * Anything that 404s/blocks falls through to a copper monogram tile, so every row
 * always renders something deliberate rather than a broken-image glyph.
 *
 * Every candidate is fetched from the publisher's own host — no third-party favicon
 * proxy — so browsing Klik doesn't hand a list of servers to an unrelated service.
 */
function githubAvatar(repositoryUrl?: string): string | null {
  if (!repositoryUrl) return null
  try {
    const url = new URL(repositoryUrl)
    if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null
    const owner = url.pathname.split('/').filter(Boolean)[0]
    return owner ? `https://github.com/${owner}.png?size=80` : null
  } catch {
    return null
  }
}

function faviconFor(websiteUrl?: string): string | null {
  if (!websiteUrl) return null
  try {
    const url = new URL(websiteUrl)
    if (url.protocol !== 'https:') return null
    return `${url.origin}/favicon.ico`
  } catch {
    return null
  }
}

export function logoCandidates(server: MergedServerEntry): string[] {
  return [server.iconUrl, githubAvatar(server.repositoryUrl), faviconFor(server.websiteUrl)].filter(
    (src): src is string => Boolean(src)
  )
}

/** First letter/digit of the title — the monogram shown when no logo resolves. */
function monogramOf(title: string): string {
  const match = title.match(/[a-z0-9]/i)
  return (match?.[0] ?? '?').toUpperCase()
}

interface ServerLogoProps {
  server: MergedServerEntry
  /** Rendered pixel size of the square tile. */
  size?: number
  className?: string
}

export function ServerLogo({ server, size = 32, className }: ServerLogoProps): React.JSX.Element {
  const candidates = useMemo(() => logoCandidates(server), [server])
  const [index, setIndex] = useState(0)

  const src = candidates[index]
  const exhausted = index >= candidates.length

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-elevated',
        className
      )}
      style={{ width: size, height: size }}
    >
      {!exhausted && src ? (
        <img
          // Remount on source change so a failed load can't stick to the next candidate.
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setIndex((i) => i + 1)}
          className="size-full object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="font-heading font-bold text-primary"
          style={{ fontSize: size * 0.44 }}
        >
          {monogramOf(server.title)}
        </span>
      )}
    </span>
  )
}
