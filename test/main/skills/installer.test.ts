import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('../../../src/main/skills/source', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/main/skills/source')>()
  return {
    ...actual,
    listSkillFiles: vi.fn(async () => [
      { relativePath: 'SKILL.md', downloadUrl: 'https://example/SKILL.md', bytes: 5 },
      { relativePath: 'scripts/run.py', downloadUrl: 'https://example/run.py', bytes: 5 }
    ]),
    downloadFile: vi.fn(async (url: string) => Buffer.from(url.endsWith('run.py') ? 'PYTHON' : 'MARKDOWN'))
  }
})

import { installSkill, uninstallSkill } from '../../../src/main/skills/installer'
import { listInstalledSkills } from '../../../src/main/skills/state'
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

let skillsRoot: string
let userData: string

function tools(installed = true): DetectedTool[] {
  return [{ id: 'claude-code', displayName: 'Claude Code', installed, capabilities: { skills: { dir: skillsRoot } } }]
}

function deps(): { tools: DetectedTool[]; userDataDir: string; now: () => string } {
  return { tools: tools(), userDataDir: userData, now: () => '2026-01-01T00:00:00.000Z' }
}

beforeEach(() => {
  skillsRoot = mkdtempSync(join(tmpdir(), 'klik-skills-'))
  userData = mkdtempSync(join(tmpdir(), 'klik-data-'))
})
afterEach(() => {
  rmSync(skillsRoot, { recursive: true, force: true })
  rmSync(userData, { recursive: true, force: true })
})

describe('installSkill', () => {
  it('writes every file, including nested paths', async () => {
    const results = await installSkill({ skill, targetToolIds: ['claude-code'] }, deps())
    expect(results[0].status).toBe('done')
    expect(readFileSync(join(skillsRoot, 'pdf', 'SKILL.md'), 'utf-8')).toBe('MARKDOWN')
    expect(readFileSync(join(skillsRoot, 'pdf', 'scripts', 'run.py'), 'utf-8')).toBe('PYTHON')
  })

  it('records the install so it can be listed and removed later', async () => {
    await installSkill({ skill, targetToolIds: ['claude-code'] }, deps())
    const records = listInstalledSkills(userData)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ skillId: skill.id, installName: 'pdf', tools: ['claude-code'] })
  })

  it('refuses to replace an existing skill without explicit consent', async () => {
    mkdirSync(join(skillsRoot, 'pdf'), { recursive: true })
    writeFileSync(join(skillsRoot, 'pdf', 'mine.md'), 'DO NOT LOSE')

    const results = await installSkill({ skill, targetToolIds: ['claude-code'] }, deps())
    expect(results[0].status).toBe('error')
    expect(results[0].message).toMatch(/already exists/)
    // The user's file must still be untouched.
    expect(readFileSync(join(skillsRoot, 'pdf', 'mine.md'), 'utf-8')).toBe('DO NOT LOSE')
  })

  it('replaces an existing skill when consent is given', async () => {
    mkdirSync(join(skillsRoot, 'pdf'), { recursive: true })
    writeFileSync(join(skillsRoot, 'pdf', 'stale.md'), 'OLD')

    const results = await installSkill(
      { skill, targetToolIds: ['claude-code'], allowOverwrite: true },
      deps()
    )
    expect(results[0].status).toBe('done')
    expect(existsSync(join(skillsRoot, 'pdf', 'stale.md'))).toBe(false)
    expect(readFileSync(join(skillsRoot, 'pdf', 'SKILL.md'), 'utf-8')).toBe('MARKDOWN')
  })

  it('leaves no temp directory behind', async () => {
    await installSkill({ skill, targetToolIds: ['claude-code'] }, deps())
    expect(existsSync(join(skillsRoot, 'pdf.klik-tmp'))).toBe(false)
  })

  it('errors when no selected tool can accept a skill', async () => {
    const results = await installSkill(
      { skill, targetToolIds: ['claude-code'] },
      { tools: tools(false), userDataDir: userData, now: () => 'now' }
    )
    expect(results[0].status).toBe('error')
  })
})

describe('uninstallSkill', () => {
  it('removes the skill directory and its record', async () => {
    await installSkill({ skill, targetToolIds: ['claude-code'] }, deps())
    expect(existsSync(join(skillsRoot, 'pdf'))).toBe(true)

    uninstallSkill(skill.id, { tools: tools(), userDataDir: userData })

    expect(existsSync(join(skillsRoot, 'pdf'))).toBe(false)
    expect(listInstalledSkills(userData)).toHaveLength(0)
  })

  it('is a no-op for a skill Klik never installed', () => {
    expect(() => uninstallSkill('unknown', { tools: tools(), userDataDir: userData })).not.toThrow()
  })
})
