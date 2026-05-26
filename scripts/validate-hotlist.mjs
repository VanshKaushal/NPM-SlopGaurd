import fs from 'fs'
import path from 'path'
import { z } from 'zod'

const hotlistPath = path.resolve(process.cwd(), 'src', 'data', 'hotlist.json')

const hotlistEntrySchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
  confidence: z.number().min(0).max(1),
  notes: z.string().min(1)
})

const hotlistSchema = z.array(hotlistEntrySchema)

const raw = fs.readFileSync(hotlistPath, 'utf8')
const data = JSON.parse(raw)
const parsed = hotlistSchema.safeParse(data)

if (!parsed.success) {
  console.error(parsed.error.format())
  process.exit(1)
}

console.log(`Hotlist OK: ${parsed.data.length} entries`)
