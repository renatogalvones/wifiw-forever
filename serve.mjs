#!/usr/bin/env node
// Minimal static server for the WiFIW legacy site.
// Usage: node serve.mjs [port]   (default 8791)
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('./dist', import.meta.url)))
const port = Number(process.argv[2] ?? process.env.PORT ?? 8791)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  const requested = normalize(join(root, pathname))

  if (!requested.startsWith(root)) {
    res.writeHead(403).end('Forbidden')
    return
  }

  try {
    let filePath = requested
    if ((await stat(filePath)).isDirectory()) {
      filePath = join(filePath, 'index.html')
    }
    const body = await readFile(filePath)
    res.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
  }
})

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`)
})
