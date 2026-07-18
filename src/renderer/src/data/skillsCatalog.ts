import type { SkillEntry } from '../../../shared/catalog'

/**
 * A curated catalog of well-known skills. A skill is a packaged instruction/
 * capability the tool loads on demand. The document skills below are Anthropic's
 * own (github.com/anthropics/skills) and install into Claude's skills directory;
 * `compatibleTools` carries the model forward as portable skill/rule formats land
 * in other tools. Phase 3 wires the actual fetch-and-write engine.
 */
export const SKILLS_CATALOG: SkillEntry[] = [
  {
    id: 'anthropics/skills:pdf',
    title: 'PDF',
    description: 'Read, fill, split, merge, and create PDF files — including form filling and signatures.',
    source: 'github.com/anthropics/skills/document-skills/pdf',
    author: 'Anthropic',
    repositoryUrl: 'https://github.com/anthropics/skills',
    category: 'Documents',
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  },
  {
    id: 'anthropics/skills:docx',
    title: 'DOCX',
    description: 'Create and edit Word documents with tracked changes, comments, and formatting preserved.',
    source: 'github.com/anthropics/skills/document-skills/docx',
    author: 'Anthropic',
    repositoryUrl: 'https://github.com/anthropics/skills',
    category: 'Documents',
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  },
  {
    id: 'anthropics/skills:xlsx',
    title: 'XLSX',
    description: 'Read and write Excel spreadsheets — formulas, multiple sheets, and cell formatting intact.',
    source: 'github.com/anthropics/skills/document-skills/xlsx',
    author: 'Anthropic',
    repositoryUrl: 'https://github.com/anthropics/skills',
    category: 'Documents',
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  },
  {
    id: 'anthropics/skills:pptx',
    title: 'PPTX',
    description: 'Build and edit PowerPoint decks — layouts, speaker notes, and images handled programmatically.',
    source: 'github.com/anthropics/skills/document-skills/pptx',
    author: 'Anthropic',
    repositoryUrl: 'https://github.com/anthropics/skills',
    category: 'Documents',
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  }
]
