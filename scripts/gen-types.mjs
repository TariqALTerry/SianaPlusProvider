// Converts the backend's C# DTO classes and enums into TypeScript declarations.
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2] ?? path.resolve("../Siana")
const out = process.argv[3] ?? path.resolve("src/api/types.gen.ts")
const seen = new Set()
const dtoDir = path.join(root, 'Siana.Core', 'DTOs')
const enumDir = path.join(root, 'Siana.Core', 'Enums')

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.cs') ? [path.join(d, e.name)] : [],
  )
}

const enums = new Map()
// .NET enums the DTOs use directly (serialized as their names).
enums.set('DayOfWeek', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
// Enums live in Siana.Core/Enums, but a few are declared next to the DTO that uses them.
for (const f of [...walk(enumDir), ...walk(dtoDir)]) {
  const src = fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')
  for (const m of src.matchAll(/public enum (\w+)\s*\{([^}]*)\}/g)) {
    const names = m[2].split(',').map((s) => s.trim().split('=')[0].trim()).filter(Boolean)
    enums.set(m[1], names)
  }
}

const prim = {
  Guid: 'string', string: 'string', String: 'string', DateTime: 'string', DateTimeOffset: 'string',
  DateOnly: 'string', TimeOnly: 'string', TimeSpan: 'string',
  int: 'number', long: 'number', decimal: 'number', double: 'number', float: 'number', short: 'number', byte: 'number',
  bool: 'boolean', object: 'unknown', JsonElement: 'unknown',
}

function mapType(t) {
  t = t.trim()
  let nullable = false
  if (t.endsWith('?')) { nullable = true; t = t.slice(0, -1) }
  let ts
  const gen = t.match(/^(\w+)<(.+)>$/)
  if (gen) {
    const [, g, inner] = gen
    if (['List', 'IList', 'IReadOnlyList', 'IEnumerable', 'ICollection', 'IReadOnlyCollection', 'HashSet'].includes(g)) {
      ts = `${wrap(mapType(inner).ts)}[]`
    } else if (['Dictionary', 'IDictionary', 'IReadOnlyDictionary'].includes(g)) {
      const [k, v] = splitTop(inner)
      ts = `Record<${mapType(k).ts}, ${mapType(v).ts}>`
    } else {
      ts = `${g}<${splitTop(inner).map((x) => mapType(x).ts).join(', ')}>`
    }
  } else if (t.endsWith('[]')) {
    ts = `${wrap(mapType(t.slice(0, -2)).ts)}[]`
  } else {
    ts = prim[t] ?? t
  }
  return { ts, nullable }
}
function wrap(s) { return s.includes('|') ? `(${s})` : s }
function splitTop(s) {
  const parts = []; let depth = 0; let cur = ''
  for (const c of s) {
    if (c === '<') depth++
    if (c === '>') depth--
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue }
    cur += c
  }
  parts.push(cur)
  return parts.map((p) => p.trim())
}

const lines = []
lines.push('// AUTO-GENERATED from Siana.Core/DTOs and Siana.Core/Enums. Regenerate with')
lines.push('// `npm run gen:types` — do not edit by hand.')
lines.push('/* eslint-disable */')
lines.push('')
for (const [name, values] of enums) {
  lines.push(`export const ${name}Values = [${values.map((v) => `'${v}'`).join(', ')}] as const`)
  lines.push(`export type ${name} = (typeof ${name}Values)[number]`)
}
lines.push('')

for (const f of walk(dtoDir).sort()) {
  const src = fs.readFileSync(f, 'utf8')
  const rel = path.relative(dtoDir, f).replace(/\\/g, '/')
  const cls = [...src.matchAll(/public (?:sealed |abstract )?class (\w+)(<[^>]+>)?(?:\s*:\s*([\w<>, ]+))?\s*(?:where [^{]+)?\{/g)]
  if (!cls.length) continue
  lines.push(`// ── ${rel}`)
  for (const m of cls) {
    const [, name, generic, base] = m
    if (seen.has(name)) continue // same class name in another namespace (e.g. Executors.PriceItemResponse)
    seen.add(name)
    // body = balanced braces from match end
    let i = m.index + m[0].length; let depth = 1; const start = i
    while (depth > 0 && i < src.length) { if (src[i] === '{') depth++; if (src[i] === '}') depth--; i++ }
    const body = src.slice(start, i - 1)
    const isRequest = /Request$|Filter$|Query$/.test(name)
    // Query-string filters: every field is optional on the wire, the server applies defaults.
    const allOptional = name === "PaginatedRequest" || /ListRequest$/.test(name) || base?.trim() === "PaginatedRequest"
    const props = []
    for (const pm of body.matchAll(/^\s*public\s+(?:required\s+)?(?:virtual\s+)?([\w<>\[\]?, ]+?)\s+(\w+)\s*\{\s*get;\s*(?:set;|init;)?\s*\}/gm)) {
      const [, type, pname] = pm
      const { ts, nullable } = mapType(type)
      const camel = pname[0].toLowerCase() + pname.slice(1)
      const opt = isRequest && (nullable || /=\s*/.test('')) ? '?' : ''
      props.push(`  ${camel}${(nullable && isRequest) || allOptional ? '?' : ''}: ${ts}${nullable ? ' | null' : ''}`)
    }
    // expression-bodied computed props: public T Name => ...
    // Requests skip them: computed server-side helpers (NormalizedPage) are never sent.
    for (const pm of isRequest ? [] : body.matchAll(/^\s*public\s+([\w<>\[\]?, ]+?)\s+(\w+)\s*=>/gm)) {
      const [, type, pname] = pm
      const { ts, nullable } = mapType(type)
      props.push(`  ${pname[0].toLowerCase() + pname.slice(1)}: ${ts}${nullable ? ' | null' : ''}`)
    }
    const baseClean = base?.split(',').map((b) => b.trim()).filter((b) => !/^I[A-Z]/.test(b))[0]
    const ext = baseClean ? ` extends ${mapType(baseClean).ts}` : ''
    lines.push(`export interface ${name}${generic ?? ''}${ext} {`)
    lines.push(...props)
    lines.push('}')
  }
  lines.push('')
}
fs.writeFileSync(out, lines.join('\n'))
console.log('enums', enums.size, 'written', out)
