import { describe, it, expect } from 'vitest'
import { parseSkillSource } from '../../../src/main/skills/source'

describe('parseSkillSource', () => {
  it('parses owner, repo, and sub-path', () => {
    expect(parseSkillSource('github.com/anthropics/skills/document-skills/pdf')).toEqual({
      owner: 'anthropics',
      repo: 'skills',
      path: 'document-skills/pdf'
    })
  })

  it('tolerates a scheme and trailing slash', () => {
    expect(parseSkillSource('https://github.com/owner/repo/')).toEqual({
      owner: 'owner',
      repo: 'repo',
      path: ''
    })
  })

  it('refuses non-GitHub hosts so a catalog entry cannot redirect the fetch', () => {
    expect(parseSkillSource('evil.example.com/owner/repo/path')).toBeNull()
    expect(parseSkillSource('gitlab.com/owner/repo')).toBeNull()
  })

  it('refuses sources missing an owner or repo', () => {
    expect(parseSkillSource('github.com/onlyowner')).toBeNull()
    expect(parseSkillSource('')).toBeNull()
  })
})
