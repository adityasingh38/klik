import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { skillTargetDir, skillsDir } from '../../../src/main/tools/claudeCode'

describe('skillTargetDir', () => {
  it('resolves a skill folder inside the skills directory', () => {
    expect(skillTargetDir('pdf')).toBe(join(skillsDir(), 'pdf'))
  })

  it('allows dots, dashes and underscores in a name', () => {
    expect(() => skillTargetDir('my-skill_v2.1')).not.toThrow()
  })

  it('refuses path traversal so a catalog entry cannot escape the skills directory', () => {
    expect(() => skillTargetDir('../../evil')).toThrow(/Unsafe skill name/)
    expect(() => skillTargetDir('..')).toThrow(/Unsafe skill name/)
    expect(() => skillTargetDir('nested/path')).toThrow(/Unsafe skill name/)
  })

  it('refuses absolute paths and empty names', () => {
    expect(() => skillTargetDir('C:\\Windows\\System32')).toThrow(/Unsafe skill name/)
    expect(() => skillTargetDir('/etc/passwd')).toThrow(/Unsafe skill name/)
    expect(() => skillTargetDir('')).toThrow(/Unsafe skill name/)
  })
})
