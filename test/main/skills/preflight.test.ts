import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('../../../src/main/skills/source', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/main/skills/source')>()
  return {
    ...actual,
    listSkillFiles: vi.fn(async () => [
      { relativePath: 'SKILL.md', downloadUrl: 'https://example/SKILL.md', bytes: 100 },
      { relativePath: 'scripts/run.py', downloadUrl: 'https://example/run.py', bytes: 400 }
    ])
  }
})

import { buildSkillInstallPreview } from '../../../src/main/skills/preflight'
import type { DetectedTool, SkillEntry } from '../../../src/shared/catalog'

const skill: SkillEntry = {
  id: 'anthropics/skills:pdf',
  installName: 'pdf',
  title: 'PDF',
  description: 'PDF things',
  source: 'github.com/anthropics/skills/document-skills/pdf',
  category: 'Documents',
  compatibleTools: ['claude-code'],
  verified: true,
  warnings: []
}

let root: string

function toolWithSkills(dir: string, installed = true): DetectedTool {
  return {
    id: 'claude-code',
    displayName: 'Claude Code',
    installed,
    capabilities: { skills: { dir } }
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'klik-skills-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('buildSkillInstallPreview', () => {
  it('lists the files and total size without writing anything', async () => {
    const preview = await buildSkillInstallPreview(
      { skill, targetToolIds: ['claude-code'] },
      { tools: [toolWithSkills(root)] }
    )
    expect(preview.files.map((f) => f.relativePath)).toEqual(['SKILL.md', 'scripts/run.py'])
    expect(preview.totalBytes).toBe(500)
  })

  it('resolves the exact target directory', async () => {
    const preview = await buildSkillInstallPreview(
      { skill, targetToolIds: ['claude-code'] },
      { tools: [toolWithSkills(root)] }
    )
    expect(preview.targets[0].skillDir).toBe(join(root, 'pdf'))
    expect(preview.targets[0].supported).toBe(true)
    expect(preview.targets[0].wouldOverwrite).toBe(false)
  })

  it('flags an overwrite and warns when the skill already exists', async () => {
    mkdirSync(join(root, 'pdf'), { recursive: true })
    const preview = await buildSkillInstallPreview(
      { skill, targetToolIds: ['claude-code'] },
      { tools: [toolWithSkills(root)] }
    )
    expect(preview.targets[0].wouldOverwrite).toBe(true)
    expect(preview.warnings.join(' ')).toMatch(/already exists/)
  })

  it('marks a tool that is not installed as unsupported', async () => {
    const preview = await buildSkillInstallPreview(
      { skill, targetToolIds: ['claude-code'] },
      { tools: [toolWithSkills(root, false)] }
    )
    expect(preview.targets[0].supported).toBe(false)
    expect(preview.targets[0].reason).toMatch(/not installed/)
  })

  it('marks a tool without a skills capability as unsupported', async () => {
    const preview = await buildSkillInstallPreview(
      { skill, targetToolIds: ['claude-desktop'] },
      {
        tools: [
          { id: 'claude-desktop', displayName: 'Claude Desktop', installed: true, capabilities: { mcp: { configPath: 'x' } } }
        ]
      }
    )
    expect(preview.targets[0].supported).toBe(false)
    expect(preview.targets[0].reason).toMatch(/does not support skills/)
  })

  it('rejects a non-GitHub source before any network call', async () => {
    await expect(
      buildSkillInstallPreview(
        { skill: { ...skill, source: 'evil.example.com/a/b' }, targetToolIds: ['claude-code'] },
        { tools: [toolWithSkills(root)] }
      )
    ).rejects.toThrow(/Unsupported skill source/)
  })
})
