import type { RegistryServerEntry } from '../../shared/types'

/**
 * The upstream MCP registry carries no category field, so Klik derives one from
 * a keyword heuristic over each server's title/description/id. Rules are ordered
 * most-specific → most-general; the first match wins, falling back to "Other".
 * A curation overlay entry's own `category` always takes precedence over this.
 */
export const MCP_CATEGORIES = [
  'Search',
  'Data & DB',
  'Finance & Crypto',
  'Cloud & DevOps',
  'Communication',
  'Docs',
  'Files',
  'Browser & Web',
  'Productivity',
  'Dev Tools',
  'AI & Models',
  'Other'
] as const

export type McpCategory = (typeof MCP_CATEGORIES)[number]

const RULES: Array<[McpCategory, RegExp]> = [
  ['Search', /\b(search|serp|perplexity|web[-\s]?search|lookup|discovery)\b/i],
  ['Data & DB', /\b(postgres|mysql|sqlite|mongo|database|db|sql|redis|supabase|bigquery|snowflake|clickhouse|vector|duckdb|dataset|warehouse)\b/i],
  ['Finance & Crypto', /\b(crypto|blockchain|wallet|token|ethereum|solana|bitcoin|onchain|trading|stocks?|payment|stripe|defi|nft|invoice|billing|ledger)\b/i],
  ['Cloud & DevOps', /\b(aws|gcp|azure|kubernetes|k8s|terraform|cloudflare|vercel|netlify|deploy|devops|serverless|lambda|infra|provisioning)\b/i],
  ['Communication', /\b(slack|discord|telegram|gmail|email|mail|sms|twilio|whatsapp|notification|messaging|inbox)\b/i],
  ['Docs', /\b(docs?|documentation|notion|confluence|wiki|knowledge[-\s]?base|readme|manual)\b/i],
  ['Files', /\b(files?|filesystem|pdf|excel|csv|spreadsheet|drive|dropbox|upload|attachment)\b/i],
  ['Browser & Web', /\b(browser|playwright|puppeteer|scrape|crawl|screenshot|headless|dom|webpage)\b/i],
  ['Productivity', /\b(calendar|todo|reminder|schedule|task[-\s]?manager|project[-\s]?management|jira|linear|asana|trello)\b/i],
  ['Dev Tools', /\b(github|gitlab|\bgit\b|repo|sdk|lint|debugger|npm|package|compiler|ide|terminal|shell|cli)\b/i],
  ['AI & Models', /\b(llm|gpt|openai|anthropic|inference|embeddings?|image|video|audio|generat(e|ion)|diffusion|fine[-\s]?tun|multimodal|rag)\b/i]
]

export function categorize(entry: RegistryServerEntry): McpCategory {
  const haystack = `${entry.title} ${entry.description} ${entry.id}`
  for (const [category, pattern] of RULES) {
    if (pattern.test(haystack)) return category
  }
  return 'Other'
}
