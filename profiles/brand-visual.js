// 领域 B：品牌视觉/广告创意 profile（品牌调性、主视觉、系列一致性）
export default {
  id: 'brand-visual',
  label: '品牌视觉/广告创意',
  keywords: ['品牌', 'LOGO', 'VI', '视觉', '广告', '主视觉', '海报', '包装', '画册', '宣传', '调性'],

  dimensions: [
    { key: 'subject', label: '主体', allowHalf: true },
    { key: 'mood', label: '情绪基调', allowHalf: true },
    { key: 'brand', label: '品牌调性', allowHalf: false },
    { key: 'identity', label: '主视觉/LOGO', allowHalf: false },
    { key: 'consistency', label: '系列一致性', allowHalf: false },
    { key: 'style', label: '风格/媒介', allowHalf: false },
  ],

  fields: {
    guidance: {
      colorDirection: {
        question: '品牌色彩基调 + 对比方案 + 饱和度？',
        example: '墨黑+荧光青主调，暖琥珀点缀，低饱和中对比',
      },
      materialDirection: {
        question: '材质质感：印刷/金属/玻璃/织物？',
        example: '哑光金属 + 磨砂玻璃，拒绝高光塑料感',
      },
      compositionDirection: {
        question: '构图：留白比例、对称/张力、重心？',
        example: '大量留白，主体偏置，黄金分割',
      },
      lightDirection: {
        question: '光线：棚拍/自然/特殊光效？',
        example: '单侧冷光 + 轮廓描边，阴影锐利',
      },
    },
    brand: {
      positioning: { question: '品牌调性定位一句话？', example: '精品咖啡中的暗黑实验室：克制、专业、有距离感' },
      audience: { question: '目标人群画像？', example: '25-35 城市白领，追求质感与独特性' },
      values: { question: '品牌价值观/关键词（2-4 个）？', example: '克制 / 精准 / 深夜感' },
      tone: { question: '对外传播基调？', example: '冷静陈述，不煽情，像实验室报告' },
    },
    identity: {
      logo: { question: 'LOGO 形态：字标/图形/组合？', example: '字标 + 咖啡豆剖面的几何图形' },
      typeface: { question: '字体方向？', example: '无衬线窄体，字距偏大' },
      palette: { question: '主视觉色板（2-4 色）？', example: '墨黑 / 荧光青 / 哑光银 / 暖琥珀' },
      keyVisual: { question: '主视觉核心图形/符号？', example: '蒸汽穿过环形灯管的剪影' },
    },
    media: {
      matrix: { question: '传播媒介矩阵（包装/海报/视频/空间…）？', example: '产品包装 / 户外海报 / 15s 视频 / 门店空间' },
    },
    consistency: {
      rules: { question: '系列延展/一致性规则？', example: '所有物料用同一色板与留白比例，禁止渐变' },
      signature: { question: '标志性视觉记忆点？', example: '角落的环形灯管符号 + 冷光描边' },
    },
  },

  required: [
    'guidance.colorDirection',
    'guidance.materialDirection',
    'brand.positioning',
    'brand.audience',
    'identity.logo',
    'identity.palette',
    'identity.keyVisual',
    'media.matrix',
    'consistency.rules',
  ],

  /**
   * brief → 生成 prompt：主视觉图（key visual）+ 广告文案。
   * @param {object} brief - 完整 brief（公共核心 + 品牌视觉领域字段）
   */
  render(brief) {
    const dir = brief.direction ?? {}
    const g = brief.guidance ?? {}
    const brand = brief.brand ?? {}
    const id = brief.identity ?? {}
    const media = brief.media ?? {}
    const cons = brief.consistency ?? {}
    const tone = brief.toneGuidelines ?? {}

    const imagePrompt = [
      `Key visual for ${dir.name ?? ''} — ${brand.positioning ?? ''}.`,
      `Target audience: ${brand.audience ?? ''}.`,
      `Logo: ${id.logo ?? ''}. Typeface: ${id.typeface ?? ''}.`,
      `Palette: ${id.palette ?? ''}.`,
      `Core visual symbol: ${id.keyVisual ?? ''}.`,
      `Color palette: ${g.colorDirection ?? ''}. Texture: ${g.materialDirection ?? ''}.`,
      `Lighting: ${g.lightDirection ?? ''}. Composition: ${g.compositionDirection ?? ''}.`,
      `Consistency rules: ${cons.rules ?? ''}. Signature element: ${cons.signature ?? ''}.`,
      `Mediums: ${(media.matrix ?? '').split(/[\/,，]/).map((s) => s.trim()).filter(Boolean).join(', ')}.`,
      'Clean, professional brand identity design. Avoid clutter and gradients.',
    ].filter((s) => !s.endsWith(': ') && !s.endsWith(': .')).join('\n')

    const captionPrompt = [
      `Brand announcement copy for: ${dir.name ?? ''}.`,
      `Positioning: ${brand.positioning ?? ''}. Communication tone: ${brand.tone ?? ''}.`,
      `Values: ${(brand.values ?? '').split(/[\/,，]/).map((s) => s.trim()).filter(Boolean).join(', ')}.`,
      `The copy should speak to: ${brand.audience ?? ''}.`,
      `Persona: ${tone.writingPersona ?? ''}. Vocabulary: ${tone.vocabularyLevel ?? ''}.`,
      'Concise, confident, no empty superlatives. Chinese language.',
    ].join('\n')

    return { imagePrompt, captionPrompt }
  },
}
