// 框架逻辑单元测试：验证领域 profile 架构下的确定性逻辑行为正确。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assess,
  classifyDomain,
  detectConflict,
  detectTextType,
  validateBrief,
  planDirectionChange,
} from './lib/framework.js'
import shortVideo from './profiles/short-video.js'
import brandVisual from './profiles/brand-visual.js'
import ecommerce from './profiles/ecommerce.js'
import gameConcept from './profiles/game-concept.js'

const here = dirname(fileURLToPath(import.meta.url))
let failed = false
let passed = 0

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ok - ${msg}`) }
  else { failed = true; console.error(`  FAIL - ${msg}`) }
}

const fullBrief = {
  direction: { name: '霓虹苦味', manifesto: 'm', moodAnchor: 'a' },
  guidance: {
    colorDirection: 'c', materialDirection: 'm', compositionDirection: 'c', lightDirection: 'l',
  },
  hooks: { first3s: 'h', openingHook: 'o' },
  pacing: { beats: 'b', cliffhanger: 'cl' },
  storyboard: { sceneCount: 3, shots: ['Scene1 WS'] },
  format: { aspectRatio: '9:16', duration: 8, textOverlay: 'No text overlay' },
  toneGuidelines: { writingPersona: 'p', vocabularyLevel: '口语', sentenceRhythm: '短', avoidPatterns: [] },
  outputConstraints: { mustInclude: [], mustAvoid: [] },
  meta: { version: '2.0', domain: 'short-video', creativeConfidence: 'high' },
}

const allProfiles = [shortVideo, brandVisual, ecommerce, gameConcept]

const brandBrief = {
  direction: { name: '暗夜实验室', manifesto: 'm', moodAnchor: 'a' },
  guidance: { colorDirection: 'c', materialDirection: 'm', compositionDirection: 'c', lightDirection: 'l' },
  brand: { positioning: 'p', audience: 'a', values: 'v', tone: 't' },
  identity: { logo: 'l', typeface: 't', palette: 'p', keyVisual: 'k' },
  media: { matrix: '包装/海报' },
  consistency: { rules: 'r', signature: 's' },
  toneGuidelines: { writingPersona: 'p', vocabularyLevel: '口语', sentenceRhythm: '短', avoidPatterns: [] },
  outputConstraints: { mustInclude: [], mustAvoid: [] },
  meta: { version: '2.0', domain: 'brand-visual', creativeConfidence: 'high' },
}

const ecommerceBrief = {
  direction: { name: '冷萃黑金', manifesto: 'm', moodAnchor: 'a' },
  product: { name: 'n', category: 'c', price: 'p', sku: 's' },
  sellingPoints: { list: ['1. 冷萃 12h 更顺口', '2. 0 糖 0 卡'], evidence: 'e' },
  usageScene: { scenario: 'sc', pain: 'pa', result: 're' },
  conversion: { hook: 'h', cta: 'cta', guarantee: 'g' },
  trust: { proof: 'pr', authority: 'au' },
  format: { aspectRatio: '9:16', duration: 30, textOverlay: 't' },
  toneGuidelines: { writingPersona: 'p', vocabularyLevel: '口语', sentenceRhythm: '短', avoidPatterns: [] },
  outputConstraints: { mustInclude: [], mustAvoid: [] },
  meta: { version: '2.0', domain: 'ecommerce', creativeConfidence: 'high' },
}

const gameBrief = {
  direction: { name: '锈雨镇', manifesto: 'm', moodAnchor: 'a' },
  worldview: { era: '2087', region: '东亚赛博', rules: 'r', tone: 't' },
  subject: { kind: '角色', role: 'ro', backstory: 'b', details: 'd' },
  reference: { moodBoard: 'mb', artists: 'ar', research: 're' },
  composition: { shotType: 'st', environment: 'en' },
  guidance: { colorDirection: 'c', materialDirection: 'm', compositionDirection: 'c', lightDirection: 'l' },
  toneGuidelines: { writingPersona: 'p', vocabularyLevel: '正式', sentenceRhythm: '长', avoidPatterns: [] },
  outputConstraints: { mustInclude: [], mustAvoid: [] },
  meta: { version: '2.0', domain: 'game-concept', creativeConfidence: 'high' },
}

console.log('assess: 快速通道（短视频维度，覆盖4，主体1，情绪1）')
{
  const r = assess({ subject: 1, mood: 1, action: 1, hook: 1 }, shortVideo.dimensions)
  assert(r.coverage === 4 && r.fastTrack === true, `coverage=${r.coverage}, fastTrack=${r.fastTrack}`)
  assert(r.status.hook === 'ok' && r.status.pacing === 'missing', `hook=${r.status.hook}, pacing=${r.status.pacing}`)
}

console.log('assess: 0.5 不参与收敛计数（覆盖0 → 追问）')
{
  const r = assess({ subject: 0, mood: 0.5 }, shortVideo.dimensions)
  assert(r.coverage === 0 && r.fastTrack === false, `coverage=${r.coverage}`)
  assert(r.status.mood === 'hint', `mood status=${r.status.mood}`)
  assert(r.askPriority[0] === 'subject', `askPriority[0]=${r.askPriority[0]}`)
}

console.log('assess: 覆盖4但情绪0.5 → 仍追问')
{
  const r = assess({ subject: 1, mood: 0.5, action: 1, hook: 1, pacing: 1 }, shortVideo.dimensions)
  assert(r.coverage === 4 && r.fastTrack === false, `coverage=${r.coverage}, fastTrack=${r.fastTrack}`)
}

console.log('classifyDomain: 短视频关键词命中')
{
  const r = classifyDomain('帮我做一个抖音咖啡宣传视频', [shortVideo])
  assert(r.mode === 'short-video' && r.confidence === 'high', `mode=${r.mode}, confidence=${r.confidence}`)
}

console.log('classifyDomain: 无关键词 → low')
{
  const r = classifyDomain('我想要高级感', [shortVideo])
  assert(r.mode === null && r.confidence === 'low', `mode=${r.mode}, confidence=${r.confidence}`)
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

console.log('validateBrief: 完整领域 brief 通过')
{
  const r = validateBrief(fullBrief, shortVideo)
  assert(r.valid === true && r.errors.length === 0, `valid=${r.valid}`)
}

console.log('validateBrief: 缺 meta.domain 报错')
{
  const brief = { ...fullBrief, meta: { ...fullBrief.meta, domain: undefined } }
  const r = validateBrief(brief, shortVideo)
  assert(r.valid === false && r.errors.some((e) => e.includes('meta.domain')), `errors=${r.errors.join(';')}`)
}

console.log('validateBrief: 缺领域必填字段报错')
{
  const brief = { ...fullBrief, hooks: { ...fullBrief.hooks, first3s: '' } }
  const r = validateBrief(brief, shortVideo)
  assert(r.valid === false && r.errors.some((e) => e.includes('hooks.first3s')), `errors=${r.errors.join(';')}`)
}

console.log('validateBrief: domain 与 profile 不匹配报错')
{
  const brief = { ...fullBrief, meta: { ...fullBrief.meta, domain: 'brand-visual' } }
  const r = validateBrief(brief, shortVideo)
  assert(r.valid === false && r.errors.some((e) => e.includes('与所选领域 profile 不符')), `errors=${r.errors.join(';')}`)
}

console.log('render: 渲染三份 prompt')
{
  const r = shortVideo.render(fullBrief)
  assert(!!r.imagePrompt && r.imagePrompt.includes('9:16'), 'imagePrompt 含比例')
  assert(!!r.videoPrompt && r.videoPrompt.includes('Opening (0-3s)'), 'videoPrompt 含开场')
  assert(!!r.captionPrompt && r.captionPrompt.includes('persona'), 'captionPrompt 含语感')
}

console.log('classifyDomain: 品牌视觉/电商/游戏概念关键词')
{
  assert(classifyDomain('帮我做咖啡品牌的视觉海报', allProfiles).mode === 'brand-visual', 'brand-visual 命中')
  assert(classifyDomain('这条冷萃咖啡液怎么带货', allProfiles).mode === 'ecommerce', 'ecommerce 命中')
  assert(classifyDomain('设计一个赛博朋克游戏角色', allProfiles).mode === 'game-concept', 'game-concept 命中')
  assert(classifyDomain('帮我画一个动漫角色的设定图', allProfiles).mode === 'game-concept', '动漫/IP 命中 game-concept')
}

console.log('classifyDomain: 跨领域命中自动降级 low')
{
  const r = classifyDomain('帮我把这个漫画做成宣传海报', allProfiles) // 漫画(game) + 宣传/海报(brand)
  assert(r.confidence === 'low', `confidence=${r.confidence}（应为 low，交给模型/用户确认）`)
  const r2 = classifyDomain('帮我设计棋魂电视剧的宣传海报', allProfiles) // 电视剧(game) + 宣传/海报(brand)
  assert(r2.confidence === 'low' && r2.mode === 'brand-visual', `confidence=${r2.confidence}, mode=${r2.mode}`)
}

console.log('validateBrief: 三领域完整 brief 通过')
{
  assert(validateBrief(brandBrief, brandVisual).valid === true, 'brand-visual 通过')
  assert(validateBrief(ecommerceBrief, ecommerce).valid === true, 'ecommerce 通过')
  assert(validateBrief(gameBrief, gameConcept).valid === true, 'game-concept 通过')
}

console.log('validateBrief: 领域必填缺失报错（三领域各查一个）')
{
  const b1 = { ...brandBrief, brand: { ...brandBrief.brand, positioning: '' } }
  const b2 = { ...ecommerceBrief, conversion: { ...ecommerceBrief.conversion, cta: '' } }
  const b3 = { ...gameBrief, worldview: { ...gameBrief.worldview, rules: '' } }
  assert(!validateBrief(b1, brandVisual).valid, 'brand-visual 缺 positioning')
  assert(!validateBrief(b2, ecommerce).valid, 'ecommerce 缺 cta')
  assert(!validateBrief(b3, gameConcept).valid, 'game-concept 缺 rules')
}

console.log('render: 三领域渲染产物')
{
  const r1 = brandVisual.render(brandBrief)
  assert(!!r1.imagePrompt && r1.imagePrompt.includes('Key visual'), 'brand-visual imagePrompt')
  assert(!!r1.captionPrompt && r1.captionPrompt.includes('Brand announcement'), 'brand-visual captionPrompt')
  const r2 = ecommerce.render(ecommerceBrief)
  assert(!!r2.captionPrompt && r2.captionPrompt.includes('带货文案'), 'ecommerce captionPrompt')
  assert(!!r2.imagePrompt && r2.imagePrompt.includes('E-commerce'), 'ecommerce imagePrompt')
  assert(!!r2.videoPrompt && r2.videoPrompt.includes('sales video'), 'ecommerce videoPrompt')
  const r3 = gameConcept.render(gameBrief)
  assert(!!r3.imagePrompt && r3.imagePrompt.includes('Concept art'), 'game-concept imagePrompt')
  assert(!!r3.moodBoardPrompt && r3.moodBoardPrompt.includes('moodboard'), 'game-concept moodBoardPrompt')
}

console.log('planDirectionChange: 保留/重生成清单')
{
  const r = planDirectionChange()
  assert(r.keep.length === 3 && r.regenerate.length === 5 && r.confidence === 'medium', `keep=${r.keep.length}, regen=${r.regenerate.length}`)
}

console.log('skill 文件 frontmatter 解析')
{
  const src = readFileSync(join(here, 'skills', 'creative-director.md'), 'utf8')
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(src)
  assert(!!m, 'frontmatter 存在')
  const name = /name:\s*"([^"]+)"/.exec(m[1])?.[1]
  assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name ?? ''), `name=${name}`)
}

console.log(`\n${passed} 项通过${failed ? '，存在失败项' : '，全部通过'}`)
process.exit(failed ? 1 : 0)
