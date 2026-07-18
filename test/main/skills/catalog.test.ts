import { describe, it, expect } from 'vitest'
import { parseFrontmatter, summarise } from '../../../src/main/skills/catalog'

describe('parseFrontmatter', () => {
  it('reads name and description out of a SKILL.md head', () => {
    const md = ['---', 'name: pdf', 'description: Does PDF things.', 'license: X', '---', '# Body'].join('\n')
    expect(parseFrontmatter(md)).toEqual({ name: 'pdf', description: 'Does PDF things.' })
  })

  it('strips surrounding quotes, which several skills use', () => {
    const md = ['---', 'name: docx', 'description: "Quoted description."', '---'].join('\n')
    expect(parseFrontmatter(md).description).toBe('Quoted description.')
  })

  it('returns nothing for a file with no front matter rather than throwing', () => {
    expect(parseFrontmatter('# Just a heading')).toEqual({})
  })
})

describe('summarise', () => {
  it('drops the model-facing trigger phrasing, including the third-person framing', () => {
    // A catalogue line should address the reader, not describe "the user" to them.
    expect(summarise('Use this skill whenever the user wants to edit PDFs. More text.', 'x')).toBe(
      'Edit PDFs.'
    )
  })

  it('handles the shapes real skills actually ship with', () => {
    expect(summarise('Use when the user asks to build a deck.', 'x')).toBe('Build a deck.')
    expect(summarise('Use this skill any time a spreadsheet is involved.', 'x')).toBe(
      'A spreadsheet is involved.'
    )
  })

  it('keeps only the first sentence', () => {
    expect(summarise('Creates decks. Also reads them. And more.', 'x')).toBe('Creates decks.')
  })

  it('truncates something very long', () => {
    const long = `${'a'.repeat(400)}.`
    const out = summarise(long, 'x')
    expect(out.length).toBeLessThanOrEqual(156)
    expect(out.endsWith('…')).toBe(true)
  })

  it('falls back when a skill declares no description', () => {
    expect(summarise('', 'Fallback text.')).toBe('Fallback text.')
  })
})
