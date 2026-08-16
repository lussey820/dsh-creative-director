// 领域 D：影视/游戏美术概念 profile（世界观、主体设定、设定考据、美术风格）
export default {
  id: 'game-concept',
  label: '影视/游戏美术概念',
  keywords: ['游戏', '角色', '世界观', '场景', '美术', '概念', '设定', '原画', 'IP', '影视', '机甲', '奇幻', '概念设计', '动漫', '漫画', '动画', '番剧', '剧集', '同人', '电视剧', '电影', '网剧', '动画片', '剧场版'],

  dimensions: [
    { key: 'subject', label: '主体（角色/场景/道具）', allowHalf: true },
    { key: 'mood', label: '情绪基调', allowHalf: true },
    { key: 'worldview', label: '世界观', allowHalf: false },
    { key: 'subjectDesign', label: '主体设定', allowHalf: false },
    { key: 'lore', label: '设定考据', allowHalf: false },
    { key: 'style', label: '美术风格', allowHalf: false },
  ],

  fields: {
    worldview: {
      era: { question: '时代/年代？', example: '近未来 2087' },
      region: { question: '地域/文化基底？', example: '东亚赛博 + 岭南骑楼' },
      rules: { question: '世界规则/力量体系？', example: '神经接入式义体，电力即货币' },
      tone: { question: '世界基调？', example: '潮湿、高压、霓虹下的挣扎' },
    },
    subject: {
      kind: { question: '主体类型：角色/场景/道具？', example: '角色' },
      role: { question: '角色身份/职能 或 场景功能？', example: '义体维修师，前雇佣兵' },
      backstory: { question: '背景故事？', example: '在雨街开维修铺，欠义体公司债' },
      details: { question: '关键细节/特征？', example: '左臂义体、焊枪、旧工装、咖啡渍' },
    },
    reference: {
      moodBoard: { question: '参考方向/关键词？', example: '银翼杀手质感 x 王家卫夜戏 x 港式骑楼' },
      artists: { question: '参考艺术家/作品？', example: '加藤直之 / 荒木飞吕彦 / Akira' },
      research: { question: '考据来源（年代/地域/建筑/服饰）？', example: '1980s 香港霓虹招牌、义体参考真实假肢技术' },
    },
    composition: {
      shotType: { question: '视角/景别？', example: '仰角中景，人物占 2/3，背后霓虹招牌' },
      environment: { question: '环境氛围？', example: '雨夜街角，蒸汽与霓虹光晕' },
    },
    guidance: {
      colorDirection: {
        question: '美术色彩基调？',
        example: '墨蓝+青绿基底，荧光洋红点缀，高饱和局部',
      },
      materialDirection: {
        question: '材质质感？',
        example: '旧金属氧化 + 油污织物 + 湿润混凝土',
      },
      compositionDirection: {
        question: '构图张力？',
        example: '强透视 + 前景遮挡，主体与背景层次分明',
      },
      lightDirection: {
        question: '光线方案？',
        example: '霓虹冷光主光 + 暖色店内光补光，雨雾体积光',
      },
    },
  },

  required: [
    'worldview.era',
    'worldview.rules',
    'subject.kind',
    'subject.details',
    'reference.moodBoard',
    'reference.research',
    'composition.shotType',
    'guidance.colorDirection',
    'guidance.lightDirection',
  ],

  /**
   * brief → 生成 prompt：概念图（concept art）。
   * @param {object} brief - 完整 brief（公共核心 + 游戏美术领域字段）
   */
  render(brief) {
    const dir = brief.direction ?? {}
    const wv = brief.worldview ?? {}
    const sub = brief.subject ?? {}
    const ref = brief.reference ?? {}
    const comp = brief.composition ?? {}
    const g = brief.guidance ?? {}

    const imagePrompt = [
      `Concept art — ${sub.kind ?? 'character'} design.`,
      `World setting: ${wv.era ?? ''}, ${wv.region ?? ''}. Rules: ${wv.rules ?? ''}. World tone: ${wv.tone ?? ''}.`,
      `Subject: ${sub.role ?? ''}. Backstory: ${sub.backstory ?? ''}.`,
      `Key details: ${sub.details ?? ''}.`,
      `Mood: ${dir.moodAnchor ?? ''}. Manifesto: ${dir.manifesto ?? ''}.`,
      `Reference direction: ${ref.moodBoard ?? ''}. Research basis: ${ref.research ?? ''}.`,
      `Composition: ${comp.shotType ?? ''}. Environment: ${comp.environment ?? ''}.`,
      `Color: ${g.colorDirection ?? ''}. Materials: ${g.materialDirection ?? ''}.`,
      `Lighting: ${g.lightDirection ?? ''}. Composition language: ${g.compositionDirection ?? ''}.`,
      'Painterly concept art, strong silhouette, readable at thumbnail size, high detail.',
    ].filter((s) => !s.endsWith(': ') && !s.endsWith(': .')).join('\n')

    const moodBoardPrompt = [
      `Reference moodboard for: ${dir.name ?? ''}.`,
      `Directions: ${ref.moodBoard ?? ''}. Artists: ${ref.artists ?? ''}.`,
      `Color script: ${g.colorDirection ?? ''}. Lighting: ${g.lightDirection ?? ''}.`,
    ].join('\n')

    return { imagePrompt, moodBoardPrompt }
  },
}
