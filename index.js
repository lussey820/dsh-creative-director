import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  assess,
  detectConflict,
  detectTextType,
  validateBrief,
} from './lib/framework.js'

export const name = 'dsh-creative-director'
export const inject = ['tools', 'skills']

const here = dirname(fileURLToPath(import.meta.url))
const SKILL_FILE = 'aitoearn-creative-director.md'

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

  // 2) 注册框架工具：把可机械化的逻辑交给代码，模型只做判断与表达
  ctx.tools.register(defineTool({
    name: 'cd_assess',
    description: '创意指导 Step 1 分流：输入 6 维评分（subject/mood 可 0|0.5|1，其余 0|1），返回覆盖分、快速通道/追问决策与缺失维度优先级',
    parameters: {
      subject: { type: 'number', required: true, description: '主体评分（0=未提及，0.5=有线索，1=明确）' },
      mood: { type: 'number', required: true, description: '情绪基调评分（0=未提及，0.5=模糊线索，1=具体情绪）' },
      action: { type: 'number', description: '关键画面/动作评分（0|1）' },
      color: { type: 'number', description: '色彩/光线倾向评分（0|1）' },
      space: { type: 'number', description: '空间/构图倾向评分（0|1）' },
      style: { type: 'number', description: '风格/媒介评分（0|1）' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: renderJson,
    },
    async execute(args) {
      const result = assess(args)
      return {
        ...result,
        decision: result.fastTrack
          ? 'fast-track：覆盖达标，直接进入 Step 3 确认方向并输出 brief'
          : 'adaptive-ask：继续追问，按 askPriority 补齐维度（0.5 线索先给 2 个对立方向让其选择）',
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
    description: '创意指导 Step 4 输出：校验美学 brief 必填字段并保存为 brief-current.json（校验失败不写入）',
    parameters: {
      brief: { type: 'object', required: true, description: '美学 brief JSON 对象', additionalProperties: true },
      path: { type: 'string', description: '保存路径，默认 brief-current.json' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: renderJson,
    },
    async execute(args) {
      const { valid, errors } = validateBrief(args.brief)
      if (!valid) return { ok: false, errors }
      const target = args.path || 'brief-current.json'
      const abs = join(process.cwd(), target)
      writeFileSync(abs, JSON.stringify(args.brief, null, 2), 'utf8')
      return { ok: true, saved: abs }
    },
  }))
}
