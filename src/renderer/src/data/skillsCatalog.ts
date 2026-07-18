import type { SkillEntry } from '../../../shared/catalog'

/**
 * A curated catalog of well-known skills. A skill is a packaged capability the tool
 * loads on demand. These are Anthropic's own (github.com/anthropics/skills) and
 * install into a tool's skills directory; each `source` was verified against the
 * repository rather than assumed. `compatibleTools` carries the model forward as
 * portable skill formats land in other tools.
 */
function anthropicSkill(
  name: string,
  title: string,
  description: string,
  category: string
): SkillEntry {
  return {
    id: `anthropics/skills:${name}`,
    installName: name,
    title,
    description,
    source: `github.com/anthropics/skills/skills/${name}`,
    author: 'Anthropic',
    repositoryUrl: 'https://github.com/anthropics/skills',
    category,
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  }
}

export const SKILLS_CATALOG: SkillEntry[] = [
  anthropicSkill('pdf', 'PDF', 'Read, merge, split, rotate, watermark, fill forms, and OCR scanned PDFs.', 'Documents'),
  anthropicSkill('docx', 'DOCX', 'Create and edit Word documents — headings, tables of contents, tracked changes, and comments.', 'Documents'),
  anthropicSkill('xlsx', 'XLSX', 'Open, edit, and create spreadsheets — formulas, charts, formatting, and messy-data cleanup.', 'Documents'),
  anthropicSkill('pptx', 'PPTX', 'Build and edit slide decks — layouts, templates, speaker notes, and comments.', 'Documents'),
  anthropicSkill('doc-coauthoring', 'Doc Co-authoring', 'A structured workflow for writing docs, proposals, specs, and decision records.', 'Documents'),
  anthropicSkill('mcp-builder', 'MCP Builder', 'Build high-quality MCP servers in Python (FastMCP) or Node/TypeScript.', 'Development'),
  anthropicSkill('skill-creator', 'Skill Creator', 'Create, improve, and benchmark skills — including evals and description tuning.', 'Development'),
  anthropicSkill('webapp-testing', 'Webapp Testing', 'Drive and debug local web apps with Playwright — screenshots and browser logs.', 'Development'),
  anthropicSkill('frontend-design', 'Frontend Design', 'Distinctive, intentional visual design that avoids templated defaults.', 'Design'),
  anthropicSkill('canvas-design', 'Canvas Design', 'Create original posters and static visual art as .png and .pdf.', 'Design'),
  anthropicSkill('algorithmic-art', 'Algorithmic Art', 'Generative art with p5.js — flow fields, particle systems, seeded randomness.', 'Design'),
  anthropicSkill('theme-factory', 'Theme Factory', 'Style slides, docs, and pages with 10 preset themes or generate one on the fly.', 'Design')
]
