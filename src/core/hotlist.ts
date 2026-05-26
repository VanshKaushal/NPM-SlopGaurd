import fs from 'fs'
import path from 'path'
import { z } from 'zod'

const HOTLIST_PATH = path.resolve(process.cwd(), 'src', 'data', 'hotlist.json')

const hotlistEntrySchema = z.object({
  name: z.string().min(1),
  source: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional()
})

const hotlistSchema = z.array(hotlistEntrySchema)

export type HotlistEntry = z.infer<typeof hotlistEntrySchema>

let hotlistCache: HotlistEntry[] | null = null

export function loadHotlist(): HotlistEntry[] {
  if (hotlistCache) return hotlistCache
  try {
    const raw = fs.readFileSync(HOTLIST_PATH, 'utf8')
    const parsed = hotlistSchema.safeParse(JSON.parse(raw))
    hotlistCache = parsed.success ? parsed.data : []
    return hotlistCache
  } catch (err) {
    hotlistCache = []
    return hotlistCache
  }
}

export function isHotlisted(pkgName: string): boolean {
  const list = loadHotlist()
  return list.some(e => e.name === pkgName)
}
