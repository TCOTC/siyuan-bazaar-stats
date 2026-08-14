import { describe, expect, it } from 'vitest'
import { parseBazaarIndex } from './parse-index.ts'
import { buildPackageRating, statsEqual } from './rating.ts'
import { applySnapshot, diffStats, reconstructHistories } from './history.ts'
import { unescapeHtml } from './locale.ts'
import { parseStageUpdated, parseBazaarHash } from './catalog-view.ts'
import { isValidPackageName } from './names.ts'

describe('parseBazaarIndex', () => {
  it('parses schema 2 packages and ratings', () => {
    const index = parseBazaarIndex({
      meta: {
        schema: 2,
        ratingsAvailable: true,
        generation: '42',
        publishedAt: 1786665600,
      },
      packages: {
        sample: {
          repo: 'owner/repo',
          downloads: 12,
          rating: { average: 3, count: 5, distribution: [1, 1, 1, 1, 1] },
        },
        skipped: { repo: 'bad', downloads: 1 },
      },
      'Owner/Repo': { downloads: 9 },
    })
    expect(index.packages.sample?.downloads).toBe(12)
    expect(index.packages.sample?.rating?.count).toBe(5)
    expect(index.packages.skipped).toBeUndefined()
  })

  it('rejects unsupported schema', () => {
    expect(() => parseBazaarIndex({
      meta: { schema: 1, ratingsAvailable: true, generation: '1', publishedAt: 1 },
      packages: {},
    })).toThrow(/schema/)
  })
})

describe('rating helpers', () => {
  it('rebuilds average from distribution', () => {
    expect(buildPackageRating([0, 0, 0, 2, 2])?.average).toBe(4.5)
  })

  it('treats missing rating as different from a zeroed rating object shape', () => {
    expect(statsEqual({ d: 1 }, { d: 1, c: 0 })).toBe(false)
    expect(statsEqual({ d: 1, a: 5, c: 1, x: [0, 0, 0, 0, 1] }, {
      d: 1, a: 5, c: 1, x: [0, 0, 0, 0, 1],
    })).toBe(true)
  })
})

describe('history', () => {
  it('diffs changed packages only', () => {
    const changes = diffStats(
      { keep: { d: 1 }, change: { d: 2 } },
      { keep: { d: 1 }, change: { d: 3 }, add: { d: 4 } },
    )
    expect(Object.keys(changes).sort()).toEqual(['add', 'change'])
  })

  it('applies full snapshots as replacements', () => {
    const next = applySnapshot(
      { gone: { d: 1 }, keep: { d: 2 } },
      { t: 1, g: '1', full: true, p: { keep: { d: 3 } } },
    )
    expect(next.gone).toBeUndefined()
    expect(next.keep?.d).toBe(3)
  })
})

describe('isValidPackageName', () => {
  it('rejects path-like names', () => {
    expect(isValidPackageName('owner/repo')).toBe(false)
    expect(isValidPackageName('sample')).toBe(true)
  })
})

describe('unescapeHtml', () => {
  it('restores ampersands from stage HTML entities', () => {
    expect(unescapeHtml('霞鹜文楷 &amp; Twemoji')).toBe('霞鹜文楷 & Twemoji')
  })
})

describe('parseStageUpdated', () => {
  it('parses bazaar stage ISO timestamps', () => {
    expect(parseStageUpdated('2026-08-14T10:33:28Z')).toBe(Math.floor(Date.parse('2026-08-14T10:33:28Z') / 1000))
    expect(parseStageUpdated('')).toBeUndefined()
  })
})

describe('parseBazaarHash', () => {
  it('reads the rhy bazaar field', () => {
    expect(parseBazaarHash({ bazaar: 'f631b50cd02a1d7674bb78bb2563a96dd4d8fdb5' })).toBe(
      'f631b50cd02a1d7674bb78bb2563a96dd4d8fdb5',
    )
    expect(() => parseBazaarHash({})).toThrow(/bazaar hash/)
  })
})

describe('reconstructHistories', () => {
  it('only appends packages that appear in each snapshot', () => {
    const histories = reconstructHistories([
      {
        t: 100,
        g: '1',
        full: true,
        p: {
          alpha: { d: 10, a: 5, c: 1, x: [0, 0, 0, 0, 1] },
          beta: { d: 3 },
        },
      },
      {
        t: 200,
        g: '2',
        p: { alpha: { d: 12, a: 5, c: 1, x: [0, 0, 0, 0, 1] } },
      },
    ])
    expect(histories.alpha?.map((point) => point.d)).toEqual([10, 12])
    expect(histories.beta?.map((point) => point.d)).toEqual([3])
  })
})
