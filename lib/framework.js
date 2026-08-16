// 创意指导框架 —— 从 SKILL-CREATIVE-DIRECTOR.md 提取的确定性逻辑。
// 对话/推理仍由模型完成，这里只负责模型判断不了的"算分、收敛判定、
// 矛盾启发式、文本类型判定、brief 校验"等可机械化部分。

/** 6 个评估维度，顺序即追问优先级。subject/mood 允许 0.5（线索），其余只允许 0/1。 */
export const DIMENSIONS = [
  { key: 'subject', label: '主体', allowHalf: true },
  { key: 'mood', label: '情绪基调', allowHalf: true },
  { key: 'action', label: '关键画面/动作', allowHalf: false },
  { key: 'color', label: '色彩/光线倾向', allowHalf: false },
  { key: 'space', label: '空间/构图倾向', allowHalf: false },
  { key: 'style', label: '风格/媒介', allowHalf: false },
]

export function normalizeScore(value, allowHalf) {
  const n = Number(value)
  if (n === 1) return 1
  if (allowHalf && n === 0.5) return 0.5
  return 0
}

/**
 * Step 1 分流判定：计算覆盖分并给出 快速通道 / 追问 决策。
 * 覆盖分只累计满分（1 分）维度，0.5 是线索、不参与收敛计数。
 * @returns {{ dimensions, coverage, threshold, fastTrack, status, askPriority }}
 */
export function assess(scores) {
  const dims = {}
  for (const d of DIMENSIONS) {
    dims[d.key] = normalizeScore(scores?.[d.key], d.allowHalf)
  }
  const coverage = DIMENSIONS.reduce((sum, d) => sum + (dims[d.key] === 1 ? 1 : 0), 0)
  const subject = dims.subject
  const mood = dims.mood
  const fastTrack = coverage >= 4 && subject === 1 && mood === 1
  const status = {}
  const askPriority = []
  for (const d of DIMENSIONS) {
    status[d.key] = dims[d.key] === 1 ? 'ok' : dims[d.key] === 0.5 ? 'hint' : 'missing'
    if (dims[d.key] !== 1) askPriority.push(d.key)
  }
  return {
    dimensions: dims,
    coverage,
    threshold: { requiredCoverage: 4, subjectRequired: 1, moodRequired: 1 },
    fastTrack,
    status,
    askPriority,
  }
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

/**
 * Step 4 brief 结构校验：检查必填字段是否齐全。
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBrief(brief) {
  const errors = []
  if (!brief || typeof brief !== 'object') {
    return { valid: false, errors: ['brief 必须是 JSON 对象'] }
  }
  const dir = brief.direction ?? {}
  const g = brief.guidance ?? {}
  const tone = brief.toneGuidelines ?? {}
  const out = brief.outputConstraints ?? {}
  const meta = brief.meta ?? {}
  const checks = [
    ['direction.name', dir.name],
    ['direction.manifesto', dir.manifesto],
    ['direction.moodAnchor', dir.moodAnchor],
    ['guidance.colorDirection', g.colorDirection],
    ['guidance.materialDirection', g.materialDirection],
    ['guidance.compositionDirection', g.compositionDirection],
    ['guidance.lightDirection', g.lightDirection],
    ['toneGuidelines.writingPersona', tone.writingPersona],
    ['toneGuidelines.vocabularyLevel', tone.vocabularyLevel],
    ['toneGuidelines.sentenceRhythm', tone.sentenceRhythm],
    ['toneGuidelines.avoidPatterns', tone.avoidPatterns],
    ['outputConstraints.aspectRatio', out.aspectRatio],
    ['outputConstraints.platform', out.platform],
    ['outputConstraints.mustInclude', out.mustInclude],
    ['outputConstraints.mustAvoid', out.mustAvoid],
    ['meta.creativeConfidence', meta.creativeConfidence],
  ]
  for (const [path, value] of checks) {
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
