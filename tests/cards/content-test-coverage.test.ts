import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, it } from 'vitest'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(testDir, '../..')
const contentRoot = path.join(repoRoot, 'game', 'content')
const testsRoot = path.join(repoRoot, 'tests', 'cards')

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(entryPath))
      continue
    }

    files.push(entryPath)
  }

  return files
}

function toTestSlug(value: string): string {
  return value.replaceAll('_', '-')
}

describe('content test coverage', () => {
  it('reports runtime content files that are missing tests', () => {
    const runtimeFiles = walk(contentRoot)
    const missing: string[] = []

    for (const filePath of runtimeFiles) {
      const fileName = path.basename(filePath)

      if (
        filePath.includes(`${path.sep}cards${path.sep}`) &&
        fileName.endsWith('.ts') &&
        fileName !== 'index.ts' &&
        fileName !== 'types.ts'
      ) {
        const slug = fileName.replace(/\.ts$/, '')
        const expectedTest = path.join(testsRoot, `card.${slug}.test.ts`)
        if (!existsSync(expectedTest)) {
          missing.push(
            `${path.relative(repoRoot, filePath)} -> missing ${path.relative(repoRoot, expectedTest)}`,
          )
        }
        continue
      }

      if (
        filePath.includes(`${path.sep}summons${path.sep}`) &&
        fileName.endsWith('.ts') &&
        fileName !== 'index.ts' &&
        fileName !== 'types.ts'
      ) {
        const slug = fileName.replace(/\.ts$/, '')
        const matchingCardFile = filePath.replace(
          `${path.sep}summons${path.sep}${fileName}`,
          `${path.sep}cards${path.sep}${fileName}`,
        )

        if (existsSync(matchingCardFile)) {
          continue
        }

        const cardTest = path.join(testsRoot, `card.${slug}.test.ts`)
        const summonTest = path.join(testsRoot, `summon.${slug}.test.ts`)

        if (!existsSync(cardTest) && !existsSync(summonTest)) {
          missing.push(
            `${path.relative(repoRoot, filePath)} -> missing ${path.relative(repoRoot, cardTest)} or ${path.relative(repoRoot, summonTest)}`,
          )
        }
        continue
      }

      if (fileName === 'hero.ts') {
        const heroSlug = toTestSlug(path.basename(path.dirname(filePath)))
        const expectedTest = path.join(testsRoot, `mechanic.${heroSlug}-passive.test.ts`)

        if (!existsSync(expectedTest)) {
          missing.push(
            `${path.relative(repoRoot, filePath)} -> missing ${path.relative(repoRoot, expectedTest)}`,
          )
        }
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing runtime content tests:\n${missing.sort().join('\n')}`)
    }
  })
})
