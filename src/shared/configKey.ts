/**
 * The name a server is filed under inside a client's config.
 *
 * Klik used to write the registry id verbatim — `io.modelcontextprotocol/server-
 * sequential-thinking`. That key is not an internal detail: MCP clients treat it as the
 * server's display name and show it in their own connector lists, so a reverse-DNS
 * namespace and a slash ended up in front of the user where "sequential-thinking" was
 * meant to be. Every example in the MCP documentation is a plain slug.
 *
 * The slug has to stay stable, because it is also how an uninstall finds what to remove.
 */

/** Namespacing noise that says "this is an MCP server" — true of everything here. */
const NOISE = [/^mcp-server-/, /^server-/, /^mcp-/, /-mcp-server$/, /-server$/, /-mcp$/]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** `io.modelcontextprotocol/server-sequential-thinking` → `sequential-thinking`. */
function baseKey(serverId: string): string {
  const lastSegment = serverId.split('/').pop() ?? serverId
  let slug = slugify(lastSegment)

  // Strip one layer of noise, not every layer: `server-server-foo` is somebody's real
  // package name and mangling it further helps nobody.
  for (const pattern of NOISE) {
    const stripped = slug.replace(pattern, '')
    if (stripped !== slug && stripped.length > 0) {
      slug = stripped
      break
    }
  }

  return slug
}

/** The publisher, for disambiguating two servers that shorten to the same thing. */
function namespaceOf(serverId: string): string {
  const [namespace] = serverId.split('/')
  if (!namespace || namespace === serverId) return ''
  // `io.modelcontextprotocol` → `modelcontextprotocol`: the reverse-DNS prefix carries
  // no information a person wants to read.
  const parts = namespace.split('.')
  return slugify(parts[parts.length - 1] ?? namespace)
}

/**
 * A readable, unique key for `serverId` that avoids everything in `taken`.
 *
 * Uniqueness matters more than brevity: shortening ids means two different servers can
 * collapse onto the same slug, and silently overwriting a server the user already
 * installed would be worse than an ugly name. Collisions fall back to the publisher, then
 * to a counter.
 */
export function configKeyFor(serverId: string, taken: Iterable<string> = []): string {
  const used = new Set(taken)
  const base = baseKey(serverId) || slugify(serverId) || 'mcp-server'
  if (!used.has(base)) return base

  const namespace = namespaceOf(serverId)
  if (namespace) {
    const qualified = `${namespace}-${base}`
    if (!used.has(qualified)) return qualified
  }

  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${n}`
    if (!used.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}
