// 领域 C：电商带货内容 profile（卖点拆解、使用场景、转化钩子、信任背书）
export default {
  id: 'ecommerce',
  label: '电商带货内容',
  keywords: ['电商', '带货', '卖点', '商品', '种草', '优惠', '直播间', '爆款', '团购', '测评', '性价比', '促销'],

  dimensions: [
    { key: 'subject', label: '商品主体', allowHalf: true },
    { key: 'mood', label: '情绪基调', allowHalf: true },
    { key: 'sellingPoints', label: '卖点拆解', allowHalf: false },
    { key: 'usageScene', label: '使用场景', allowHalf: false },
    { key: 'conversion', label: '转化钩子', allowHalf: false },
    { key: 'trust', label: '信任背书', allowHalf: false },
  ],

  fields: {
    product: {
      name: { question: '商品名称？', example: '霓虹冷萃咖啡液（18g x 30 条）' },
      category: { question: '品类？', example: '即饮咖啡液' },
      price: { question: '价格/价格锚点？', example: '原价 129，活动价 79' },
      sku: { question: 'SKU 露出要求？', example: '主图露出 30 条装规格' },
    },
    sellingPoints: {
      list: { question: '卖点列表（按优先级，3-5 条）？', example: '1. 冷萃 12h 更顺口 2. 0 糖 0 卡 3. 10 秒冲出一杯' },
      evidence: { question: '支撑证据？', example: '获奖 / 检测报告 / 销量数据' },
    },
    usageScene: {
      scenario: { question: '使用场景？', example: '早起通勤 / 办公室下午' },
      pain: { question: '解决什么痛点？', example: '手冲太慢、速溶难喝' },
      result: { question: '效果对比（before/after）？', example: '困倦 → 清醒专注' },
    },
    conversion: {
      hook: { question: '转化钩子？限时/稀缺/对比', example: '限时 3 天 79，之后恢复 129' },
      cta: { question: '行动号召？', example: '现在下单，今天发货' },
      guarantee: { question: '售后保障/承诺？', example: '7 天无理由 + 不好喝包退' },
    },
    trust: {
      proof: { question: '信任背书？', example: '月销 10w+ / 4.9 分 / 小红书 2w 种草' },
      authority: { question: '权威认证？', example: '食品安全认证 / 明星同款' },
    },
    format: {
      aspectRatio: { question: '画面比例？', example: '9:16' },
      duration: { question: '口播时长（秒）？', example: '30' },
      textOverlay: { question: '贴字需求？', example: '价格标签 + 卖点弹字' },
    },
  },

  required: [
    'product.name',
    'product.price',
    'product.sku',
    'sellingPoints.list',
    'usageScene.scenario',
    'conversion.hook',
    'conversion.cta',
    'trust.proof',
    'format.aspectRatio',
  ],

  /**
   * brief → 生成 prompt：带货文案/口播稿 + 商品主图 + 口播视频。
   * @param {object} brief - 完整 brief（公共核心 + 电商领域字段）
   */
  render(brief) {
    const dir = brief.direction ?? {}
    const prod = brief.product ?? {}
    const sp = brief.sellingPoints ?? {}
    const us = brief.usageScene ?? {}
    const cv = brief.conversion ?? {}
    const tr = brief.trust ?? {}
    const f = brief.format ?? {}
    const tone = brief.toneGuidelines ?? {}

    const sellingLines = Array.isArray(sp.list)
      ? sp.list.map((s) => String(s).replace(/^\d+[.、]\s*/, ''))
      : String(sp.list ?? '').split(/[;；\n]/).map((s) => s.trim()).filter(Boolean)
    const sellingText = sellingLines.map((s) => `- ${s}`).join('\n')

    const captionPrompt = [
      `${dir.name ?? ''} — 带货文案/口播稿。`,
      `商品：${prod.name ?? ''}（${prod.category ?? ''}）`,
      `价格：${prod.price ?? ''}。`,
      `卖点：\n${sellingText}`,
      `使用场景：${us.scenario ?? ''}；解决痛点：${us.pain ?? ''}；效果：${us.result ?? ''}。`,
      `转化钩子：${cv.hook ?? ''}。行动号召：${cv.cta ?? ''}。售后承诺：${cv.guarantee ?? ''}。`,
      `信任背书：${tr.proof ?? ''}；权威认证：${tr.authority ?? ''}。`,
      `口吻：${tone.writingPersona ?? ''}；用词：${tone.vocabularyLevel ?? ''}；节奏：${tone.sentenceRhythm ?? ''}。`,
      '第一句抓人，卖点讲人话，结尾给明确行动指令。中文。',
    ].join('\n')

    const imagePrompt = [
      `E-commerce product hero image: ${prod.name ?? ''} (${prod.category ?? ''}).`,
      `SKU display: ${prod.sku ?? ''}. Price tag: ${prod.price ?? ''}.`,
      `Scenario: ${us.scenario ?? ''}.`,
      `Key selling points as visual badges: ${sellingLines.slice(0, 3).join(' / ')}.`,
      `Atmosphere: ${dir.manifesto ?? ''}.`,
      'Clean studio background, product in focus, text overlay friendly, high quality.',
    ].join('\n')

    const videoPrompt = [
      `A ${f.duration || 30}-second vertical ${f.aspectRatio || '9:16'} sales video for ${prod.name ?? ''}.`,
      `Opening hook: ${cv.hook ?? ''}.`,
      `Selling points (${sellingLines.slice(0, 3).join('; ')}).`,
      `Usage scenario: ${us.scenario ?? ''}. Before/after: ${us.result ?? ''}.`,
      `Trust proof: ${tr.proof ?? ''}.`,
      `CTA: ${cv.cta ?? ''}. Guarantee: ${cv.guarantee ?? ''}.`,
      `Text overlay: ${f.textOverlay || 'price + selling points'}.`,
      'Fast pacing, clear shots, product always in focus.',
    ].join('\n')

    return { imagePrompt, videoPrompt, captionPrompt }
  },
}
