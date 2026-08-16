// 框架逻辑单元测试：验证从原 skill 提取的确定性逻辑行为正确。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assess,
  detectConflict,
  detectTextType,
  validateBrief,
  planDirectionChange,
} from './lib/framework.js'

const here = dirname(fileURLToPath(import.meta.url))
let failed = false
let passed = 0

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ok - ${msg}`) }
  else { failed = true; console.error(`  FAIL - ${msg}`) }
}

console.log('assess: 快速通道（覆盖5，主体1，情绪1）')
{
  const r = assess({ subject: 1, mood: 1, action: 1, color: 1, space: 1 })
  assert(r.coverage === 5 && r.fastTrack === true, `coverage=${r.coverage}, fastTrack=${r.fastTrack}`)
}

console.log('assess: 0.5 不参与收敛计数（覆盖0 → 追问）')
{
  const r = assess({ subject: 0, mood: 0.5 })
  assert(r.coverage === 0 && r.fastTrack === false, `coverage=${r.coverage}`)
  assert(r.status.mood === 'hint', `mood status=${r.status.mood}`)
  assert(r.askPriority[0] === 'subject', `askPriority[0]=${r.askPriority[0]}`)
}

console.log('assess: 覆盖4但情绪0.5 → 仍追问')
{
  const r = assess({ subject: 1, mood: 0.5, action: 1, color: 1, space: 1 })
  assert(r.coverage === 4 && r.fastTrack === false, `coverage=${r.coverage}, fastTrack=${r.fastTrack}`)
}

console.log('detectConflict: 命中已知组合')
{
  const r = detectConflict('我想要极简但华丽的风格')
  assert(r.conflict === true && !!r.suggestion, `conflict=${r.conflict}, suggestion=${r.suggestion}`)
}

console.log('detectConflict: 普通描述不误报')
{
  const r = detectConflict('一杯温暖的拿铁放在木桌上')
  assert(r.conflict === false, `conflict=${r.conflict}`)
}

console.log('detectTextType: 英文 prompt')
{
  const r = detectTextType('A vertical 9:16 shot. Color palette, lighting, composition, cinematic bokeh.')
  assert(r.type === 'prompt', `type=${r.type}`)
}

console.log('detectTextType: 中文文案')
{
  const r = detectTextType('今天天气不错，我们出去走走吧，顺便喝杯咖啡')
  assert(r.type === 'copy', `type=${r.type}`)
}

console.log('validateBrief: 完整 brief 通过')
{
  const brief = {
    direction: { name: '冷萃纯净', manifesto: 'm', moodAnchor: 'a' },
    guidance: {
      colorDirection: 'c', materialDirection: 'm', compositionDirection: 'c', lightDirection: 'l',
    },
    toneGuidelines: {
      writingPersona: 'p', vocabularyLevel: '口语', sentenceRhythm: '短', avoidPatterns: [],
    },
    outputConstraints: { aspectRatio: '9:16', platform: 'douyin', mustInclude: [], mustAvoid: [] },
    meta: { version: '2.0', creativeConfidence: 'high' },
  }
  const r = validateBrief(brief)
  assert(r.valid === true && r.errors.length === 0, `valid=${r.valid}`)
}

console.log('validateBrief: 缺字段报错')
{
  const r = validateBrief({ direction: {} })
  assert(r.valid === false && r.errors.length > 0, `errors=${r.errors.length}`)
}

console.log('planDirectionChange: 保留/重生成清单')
{
  const r = planDirectionChange()
  assert(r.keep.length === 3 && r.regenerate.length === 5 && r.confidence === 'medium', `keep=${r.keep.length}, regen=${r.regenerate.length}`)
}

console.log('skill 文件 frontmatter 解析')
{
  const src = readFileSync(join(here, 'skills', 'aitoearn-creative-director.md'), 'utf8')
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(src)
  assert(!!m, 'frontmatter 存在')
  const name = /name:\s*"([^"]+)"/.exec(m[1])?.[1]
  assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name ?? ''), `name=${name}`)
}

console.log(`\n${passed} 项通过${failed ? '，存在失败项' : '，全部通过'}`)
process.exit(failed ? 1 : 0)
