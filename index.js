import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  assess,
  classifyDomain,
  detectConflict,
  detectTextType,
  validateBrief,
} from './lib/framework.js'
import shortVideo from './profiles/short-video.js'
import brandVisual from './profiles/brand-visual.js'
import ecommerce from './profiles/ecommerce.js'
import gameConcept from './profiles/game-concept.js'

export const name = 'dsh-creative-director'
export const inject = ['tools', 'skills']

const here = dirname(fileURLToPath(import.meta.url))
const SKILL_FILE = 'creative-director.md'

// 领域 profile 注册表：后续加领域只需 import 并在 PROFILES 登记
const PROFILES = [shortVideo, brandVisual, ecommerce, gameConcept]
const PROFILE_BY_ID = Object.fromEntries(PROFILES.map((p) => [p.id, p]))
const AVAILABLE_MODES = PROFILES.map((p) => p.id).join(' | ')

/** Parse the `name`/`description`/`whenToUse` frontmatter keys off a skill file. */
function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!match) {
    return { name: null, description: '', whenToUse: undefined, content: text }
  }
  const meta = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    meta[key] = value
  }
  return {
    name: meta.name ?? null,
    description: meta.description ?? '',
    whenToUse: meta['whenToUse'],
    content: text.slice(match[0].length),
  }
}

const renderJson = (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }]

export function apply(ctx) {
  // 1) 注册创意指导 skill（对话工作流，参照框架工具执行）
  const source = readFileSync(join(here, 'skills', SKILL_FILE), 'utf8')
  const skill = parseFrontmatter(source)
  if (skill.name) {
    ctx.skills.register({
      name: skill.name,
      description: skill.description,
      whenToUse: skill.whenToUse,
      content: skill.content,
    })
  }

  // 2) 注册框架工具：可机械化的逻辑交给代码，模型只做判断与表达
  ctx.tools.register(defineTool({
    name: 'cd_assess',
    description: `创意指导 Step 0.5/1：mode='auto' 时按 request 给出建议领域与置信度；指定 mode（可用：${AVAILABLE_MODES}）时按该领域维度评分返回覆盖分/快速通道/追问优先级。scores 的键来自该领域评估维度（short-video: subject/mood/action/hook/pacing/style；brand-visual: subject/mood/brand/identity/consistency/style；ecommerce: subject/mood/sellingPoints/usageScene/conversion/trust；game-concept: subject/mood/worldview/subjectDesign/lore/style）`,
    parameters: {
      mode: { type: 'string', description: `领域模式：'auto' 或 ${AVAILABLE_MODES}` },
      request: { type: 'string', description: '用户原始需求文本（mode=auto 时必填，用于领域推断）' },
      scores: {
        type: 'object',
        description: '维度评分映射（subject/mood 可 0|0.5|1，其余 0|1）',
        additionalProperties: true,
      },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: renderJson,
    },
    async execute(args) {
      if (args.mode === 'auto' || !args.mode) {
        const cls = classifyDomain(args.request ?? '', PROFILES)
        return {
          ...cls,
          classifyOnly: true,
          decision: '据此进入 Step 1；置信度 low 或同时命中多领域时先向用户确认领域',
        }
      }
      const profile = PROFILE_BY_ID[args.mode]
      if (!profile) {
        return { error: `未知领域 mode: ${args.mode}，可用: ${AVAILABLE_MODES}` }
      }
      const result = assess(args.scores ?? {}, profile.dimensions)
      return {
        mode: profile.id,
        domainLabel: profile.label,
        ...result,
        decision: result.fastTrack
          ? 'fast-track：覆盖达标，直接进入 Step 3 确认方向并输出 brief'
          : 'adaptive-ask：按 askPriority 继续追问（0.5 线索先给 2 个对立方向让其选择）',
      }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'cd_detect_conflict',
    description: '创意指导 Step 2 软性矛盾检测：检测用户描述中"既要 A 又要非 A"式对立表达（如"极简但华丽"），命中已知组合时给出融合建议',
    parameters: {
      text: { type: 'string', required: true, description: '用户描述文本' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: renderJson,
    },
    async execute(args) {
      return detectConflict(args.text)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'cd_polish_type',
    description: '创意指导 Step 5.0 文本类型判定：visual prompt → prompt 优化模式；中文文案 → 文案润色模式；无法判定 → ask 询问用户',
    parameters: {
      text: { type: 'string', required: true, description: '待判定文本' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: renderJson,
    },
    async execute(args) {
      return detectTextType(args.text)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'cd_save_brief',
    description: '创意指导 Step 4 输出：按 brief.meta.domain 找领域 profile，校验公共核心+领域必填字段后保存为 brief-current.json（校验失败不写入）',
    parameters: {
      brief: { type: 'object', required: true, description: '美学 brief JSON（需含 meta.domain）', additionalProperties: true },
      path: { type: 'string', description: '保存路径，默认 brief-current.json' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: renderJson,
    },
    async execute(args) {
      const domain = args.brief?.meta?.domain
      const profile = PROFILE_BY_ID[domain]
      if (!profile) {
        return { ok: false, errors: [`meta.domain=${domain} 无效，可用: ${AVAILABLE_MODES}`] }
      }
      const { valid, errors } = validateBrief(args.brief, profile)
      if (!valid) return { ok: false, errors }
      const target = args.path || 'brief-current.json'
      const abs = join(process.cwd(), target)
      writeFileSync(abs, JSON.stringify(args.brief, null, 2), 'utf8')
      return { ok: true, domain: profile.id, saved: abs }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'cd_render',
    description: 'brief → 生成 prompt：按 brief.meta.domain 的 profile.render 渲染 imagePrompt/videoPrompt/captionPrompt，作为下游生成的第一消费方',
    parameters: {
      brief: { type: 'object', required: true, description: '美学 brief JSON（需含 meta.domain 且通过 cd_save_brief 校验）', additionalProperties: true },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: renderJson,
    },
    async execute(args) {
      const domain = args.brief?.meta?.domain
      const profile = PROFILE_BY_ID[domain]
      if (!profile) {
        return { error: `meta.domain=${domain} 无效，可用: ${AVAILABLE_MODES}` }
      }
      const { valid, errors } = validateBrief(args.brief, profile)
      if (!valid) return { ok: false, errors }
      return { ok: true, domain: profile.id, ...profile.render(args.brief) }
    },
  }))
}
