const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const root = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'))
const version = pkg.version
const tag = `v${version}`

function run(cmd, label) {
  console.log(`\n[release] ${label}...`)
  execSync(cmd, { cwd: root, stdio: 'inherit' })
}

// 1. 检查工作区是否干净
const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf-8' })
if (status.trim()) {
  console.error('[release] 工作区有未提交的更改，请先提交或暂存。')
  process.exit(1)
}

// 2. 检查 gh CLI 是否可用
try {
  execSync('gh --version', { cwd: root, stdio: 'pipe' })
} catch {
  console.error('[release] 未安装 GitHub CLI (gh)。请先安装: https://cli.github.com/')
  process.exit(1)
}

// 3. 检查 tag 是否已存在
const existingTags = execSync('git tag -l', { cwd: root, encoding: 'utf-8' })
if (existingTags.includes(tag)) {
  console.error(`[release] Tag ${tag} 已存在，请更新 package.json 中的版本号。`)
  process.exit(1)
}

// 4. 构建 & 打包
run('npm run package', '构建并打包')

// 5. 提交版本号变更
run('git add package.json', '暂存 package.json')
try {
  run(`git commit -m "chore: bump version to ${tag}"`, '提交版本号变更')
} catch {
  console.log('[release] 没有需要提交的变更，跳过。')
}

// 6. 创建 tag 并推送
run(`git tag ${tag}`, `创建 tag ${tag}`)
run(`git push origin master`, '推送 master 分支')
run(`git push origin ${tag}`, `推送 tag ${tag}`)

// 7. 创建 GitHub Release
const exeFiles = fs.readdirSync(path.join(root, 'release')).filter(f => f.endsWith('.exe'))
if (exeFiles.length === 0) {
  console.error('[release] release 目录中未找到 .exe 文件。')
  process.exit(1)
}

const notes = `${tag} 版本发布

📦 安装包: ${exeFiles[0]}
`
run(`gh release create ${tag} release/${exeFiles[0]} --title "${tag}" --notes "${notes}"`, '创建 GitHub Release')

console.log(`\n[release] 发布完成!`)
console.log(`[release] Release 地址: https://github.com/wei-jianhan/cliDesk/releases/tag/${tag}`)
console.log(`[release] GitHub Actions 将自动构建并附加安装包。`)
