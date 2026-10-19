// Replaces the external Redoc <script src> in a generated HTML with the inlined bundle,
// so the file works offline. Usage: node scripts/inline-redoc.mjs <file.html>
import { readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
    console.error('Usage: node scripts/inline-redoc.mjs <file.html>')
    process.exit(1)
}

const html = readFileSync(file, 'utf8')
const tag = /<script src="(https:\/\/cdn\.redocly\.com\/[^"]+)"[^>]*><\/script>/
const match = tag.exec(html)

if (!match) {
    console.log('No external Redoc script found; nothing to inline.')
    process.exit(0)
}

const response = await fetch(match[1])
if (!response.ok) {
    console.error(`Could not download ${match[1]} (${response.status})`)
    process.exit(1)
}
const bundle = (await response.text()).replaceAll('</script', '<\\/script')

writeFileSync(file, html.replace(tag, () => `<script>${bundle}</script>`))
console.log(`Inlined ${match[1]} into ${file}`)
