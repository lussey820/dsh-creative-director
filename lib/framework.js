// 创意指导框架 —— 从 SKILL-CREATIVE-DIRECTOR.md 提取的确定性逻辑。
// 对话/推理仍由模型完成，这里只负责"算分、收敛判定、领域分类、矛盾启发式、
// 文本类型判定、brief 校验"等可机械化部分。
// 领域知识全部来自 profile（profiles/*.js），本文件不写死任何领域维度。

/** 0.5 是否允许由 profile 的 dimension.allowHalf 决定。 */
export function normalizeScore(value, allowHalf) {
  const n = Number(value)
  if (n === 1) return 1
  if (allowHalf && n === 0.5) return 0.5
  return 0
}

/**
 * Step 1 分流判定：按领域 profile 的 dimensions 计算覆盖分并给出快速通道/追问决策。
 * 覆盖分只累计满分（1 分）维度，0.5 是线索、不参与收敛计数。
 * 若 profile 包含 subject/mood 维度，则二者必须为 1 才允许快速通道。
 * @param {Record<string, number>} scores - 维度评分映射，键来自 profile.dimensions
 * @param {Array<{key: string, allowHalf: boolean}>} dimensions - 领域评估维度
 * @returns {{ dimensions: Record<string, number>, coverage: number, fastTrack: boolean, status: Record<string, string>, askPriority: string[] }}
 */
export function assess(scores, dimensions) {
  const dims = {}
  for (const d of dimensions) {
    dims[d.key] = normalizeScore(scores?.[d.key], d.allowHalf)
  }
  const coverage = dimensions.reduce((sum, d) => sum + (dims[d.key] === 1 ? 1 : 0), 0)
  const hasSubject = dimensions.some((d) => d.key === 'subject')
  const hasMood = dimensions.some((d) => d.key === 'mood')
  const fastTrack =
    coverage >= 4 &&
    (!hasSubject || dims.subject === 1) &&
    (!hasMood || dims.mood === 1)
  const status = {}
  const askPriority = []
  for (const d of dimensions) {
    status[d.key] = dims[d.key] === 1 ? 'ok' : dims[d.key] === 0.5 ? 'hint' : 'missing'
    if (dims[d.key] !== 1) askPriority.push(d.key)
  }
  return { dimensions: dims, coverage, fastTrack, status, askPriority }
}

/**
 * Step 0.5 领域判定：关键词启发式给出建议领域与置信度。
 * 最终领域由模型综合判断；置信度 low 时模型应先向用户确认。
 * @param {string} request - 用户原始需求文本
 * @param {Array<{id: string, keywords: string[]}>} profiles - 领域 profile 列表
 * @returns {{ mode: string|null, confidence: 'high'|'low', keywords?: string[], reason: string }}
 */
export function classifyDomain(request, profiles) {
  const text = String(request ?? '')
  const results = profiles.map((p) => ({
    mode: p.id,
    hits: p.keywords.filter((k) => text.includes(k)),
  }))
  const best = results.reduce((a, b) => (b.hits.length > a.hits.length ? b : a), { mode: null, hits: [] })
  if (!best.mode || best.hits.length === 0) {
    return { mode: null, confidence: 'low', reason: '未命中任何领域关键词，需向用户确认领域' }
  }
  const tied = results.filter((r) => r.hits.length === best.hits.length && r.hits.length > 0).length > 1
  const confidence = tied || best.hits.length < 2 ? 'low' : 'high'
  return { mode: best.mode, confidence, keywords: best.hits, reason: `命中关键词：${best.hits.join('、')}` }
}

const CONTRAST_RE = /([^，。！？；,.;!?]{2,}?)(?:但(?!是)|却|不过|然而|同时|既要|又要|却又要)([^，。！？；,.;!?]{2,})/

/** 已知矛盾组合 → 融合方案（软性指南，命中即建议）。 */
const FUSION_EXAMPLES = [
  { pattern: '极简', counter: '华丽', suggestion: '去掉所有装饰，让光的质感本身成为装饰——安藤忠雄的清水混凝土' },
  { pattern: '温暖', counter: '冷酷', suggestion: '冷色基底里一小片暖光——阴天雪地中一扇亮着暖黄灯光的窗户' },
  { pattern: '赛博', counter: '田园', suggestion: '霓虹灯管挂在木梁上，全息投影映着稻田' },
]

/**
 * Step 2 软性矛盾检测：启发式识别 "A 但 B" 式对立表达。
 * 命中已知组合时给出融合建议，否则仅标记 conflict，由模型判断。
 * @returns {{ conflict: boolean, left?: string, right?: string, suggestion?: string|null }}
 */
export function detectConflict(text) {
  const m = CONTRAST_RE.exec(String(text ?? ''))
  if (!m) return { conflict: false }
  const left = m[1].trim()
  const right = m[2].trim()
  if (!left || !right) return { conflict: false }
  const hit = FUSION_EXAMPLES.find((e) => left.includes(e.pattern) && right.includes(e.counter))
  return { conflict: true, left, right, suggestion: hit?.suggestion ?? null }
}

const PROMPT_KEYWORDS = [
  'color', 'lighting', 'texture', 'composition', 'scene', 'aspect ratio',
  'cinematic', 'render', 'depth of field', 'bokeh', 'camera', 'shot',
]

/**
 * Step 5.0 文本类型判定。
 * @returns {{ type: 'prompt'|'copy'|'ask', keywords?: string[], reason: string }}
 */
export function detectTextType(text) {
  const t = String(text ?? '')
  const lower = t.toLowerCase()
  const keywords = PROMPT_KEYWORDS.filter((k) => lower.includes(k))
  const latinChars = (t.match(/[A-Za-z]/g) ?? []).length
  const latinRatio = t.length > 0 ? latinChars / t.length : 0
  const hasChinese = /[\u4e00-\u9fff]/.test(t)
  if (keywords.length >= 2 || (latinRatio > 0.5 && !hasChinese)) {
    return { type: 'prompt', keywords, reason: '含 visual prompt 特征关键词或英文主导' }
  }
  if (hasChinese) return { type: 'copy', reason: '中文为主，按社交媒体文案处理' }
  return { type: 'ask', reason: '既不像 visual prompt 也不像中文文案，需要询问用户' }
}

/** 按点路径取字段值，如 getPath(brief, 'hooks.first3s')。 */
export function getPath(obj, path) {
  return path.split('.').reduce((cur, key) => (cur == null ? undefined : cur[key]), obj)
}

/**
 * Step 4 通用 brief 校验：公共核心（direction + meta） + 领域 profile.required。
 * brief 为平台/厂商无关的通用结构，深度字段按 profile 校验。
 * @param {object} brief - 美学 brief（需含 meta.domain）
 * @param {{id: string, required: string[]}|undefined} profile - 领域 profile
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBrief(brief, profile) {
  const errors = []
  if (!brief || typeof brief !== 'object') {
    return { valid: false, errors: ['brief 必须是 JSON 对象'] }
  }
  const dir = brief.direction ?? {}
  const meta = brief.meta ?? {}
  const core = [
    ['direction.name', dir.name],
    ['direction.manifesto', dir.manifesto],
    ['direction.moodAnchor', dir.moodAnchor],
    ['meta.creativeConfidence', meta.creativeConfidence],
  ]
  for (const [path, value] of core) {
    if (value === undefined || value === null || value === '') {
      errors.push(`缺少必填字段: ${path}`)
    }
  }
  if (!meta.domain) {
    errors.push('缺少必填字段: meta.domain（领域标识）')
  } else if (profile && profile.id !== meta.domain) {
    errors.push(`meta.domain=${meta.domain} 与所选领域 profile 不符，应为 ${profile.id}`)
  }
  for (const path of profile?.required ?? []) {
    const value = getPath(brief, path)
    if (value === undefined || value === null || value === '') {
      errors.push(`缺少必填字段: ${path}`)
    }
  }
  return { valid: errors.length === 0, errors }
}

/**
 * Step 3 "换个方向" 保留/重生成清单（保留用户确认过的，重写方向性字段）。
 * @returns {{ keep: string[], regenerate: string[], confidence: 'medium' }}
 */
export function planDirectionChange() {
  return {
    keep: ['outputConstraints', '主体与关键画面', 'meta.inferredDimensions（追加新推理记录）'],
    regenerate: ['direction.name', 'direction.manifesto', 'direction.moodAnchor', 'guidance.colorDirection', 'guidance.lightDirection'],
    confidence: 'medium',
  }
}
