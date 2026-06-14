const { spawn, execSync } = require('child_process')
const path = require('path')

const root = path.resolve(__dirname, '..')
const node = process.execPath

function esbuildArgs(entry, outfile, extraExternals = '') {
  const base = [
    'node_modules/esbuild/bin/esbuild', entry,
    '--bundle', '--platform=node', `--outfile=${outfile}`,
    '--external:electron', '--format=cjs', '--sourcemap',
  ]
  if (extraExternals) base.push(`--external:${extraExternals}`)
  return base
}

// Build once synchronously first
console.log('[dev] Building main & preload...')
execSync(
  [node, ...esbuildArgs('src/main/index.ts', 'dist/main/index.js', '@lydell/node-pty')].join(' '),
  { cwd: root, stdio: 'inherit' }
)
execSync(
  [node, ...esbuildArgs('src/preload/index.ts', 'dist/preload/index.js')].join(' '),
  { cwd: root, stdio: 'inherit' }
)

// Watch main
const mainWatch = spawn(node, [...esbuildArgs('src/main/index.ts', 'dist/main/index.js', '@lydell/node-pty'), '--watch'], { cwd: root })
mainWatch.stdout.on('data', (d) => process.stdout.write(`[main] ${d}`))
mainWatch.stderr.on('data', (d) => process.stderr.write(`[main] ${d}`))
mainWatch.on('error', (err) => console.error('[main] Error:', err.message))

// Watch preload
const preloadWatch = spawn(node, [...esbuildArgs('src/preload/index.ts', 'dist/preload/index.js'), '--watch'], { cwd: root })
preloadWatch.stdout.on('data', (d) => process.stdout.write(`[preload] ${d}`))
preloadWatch.stderr.on('data', (d) => process.stderr.write(`[preload] ${d}`))
preloadWatch.on('error', (err) => console.error('[preload] Error:', err.message))

// Vite dev server
const vite = spawn(node, ['node_modules/vite/bin/vite.js', '--host'], { cwd: root })
vite.stdout.on('data', (d) => {
  const s = d.toString()
  process.stdout.write(`[vite] ${s}`)
  if (s.includes('http://localhost')) {
    const match = s.match(/http:\/\/localhost:\d+/)
    const url = match ? match[0] : 'http://localhost:5173'
    console.log(`[dev] Vite ready at ${url}, starting Electron...`)
    const electron = spawn(node, ['node_modules/electron/cli.js', '.'], {
      cwd: root,
      env: { ...process.env, VITE_DEV_SERVER_URL: url },
      stdio: 'inherit',
    })
    electron.on('error', (err) => console.error('[electron] Error:', err.message))
  }
})
vite.stderr.on('data', (d) => process.stderr.write(`[vite] ${d}`))
vite.on('error', (err) => console.error('[vite] Error:', err.message))

process.on('SIGINT', () => {
  mainWatch.kill()
  preloadWatch.kill()
  vite.kill()
  process.exit()
})

console.log('[dev] Watching for changes...')
