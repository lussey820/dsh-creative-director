// 四领域端到端演示：每个领域跑 领域判定 → brief 校验 → 渲染
// 运行：node demo-all-domains.mjs
import { classifyDomain, validateBrief } from './lib/framework.js'
import shortVideo from './profiles/short-video.js'
import brandVisual from './profiles/brand-visual.js'
import ecommerce from './profiles/ecommerce.js'
import gameConcept from './profiles/game-concept.js'

const PROFILES = [shortVideo, brandVisual, ecommerce, gameConcept]
const line = () => console.log('═'.repeat(64))

const briefs = {
  shortVideo: {
    request: '帮我做一个赛博朋克咖啡品牌的抖音短视频',
    profile: shortVideo,
    brief: {
      direction: { name: '霓虹苦味 (Neon Bitter)', manifesto: '潮湿城市的最后手工仪式。霓虹冷光打在咖啡热气上，孤独但不寒冷。', moodAnchor: '看完想发给朋友' },
      guidance: {
        colorDirection: '冷色基底配暖琥珀点缀，中高对比',
        materialDirection: '混凝土 vs 黄铜镜面',
        compositionDirection: '紧凑构图，重心偏下',
        lightDirection: '霓虹侧光（冷）+ 暖黄吊灯（暖）',
      },
      hooks: { first3s: '咖啡杯砸在霓虹灯管前，蒸汽冲镜头', openingHook: '反差：越高级的咖啡店越不装' },
      pacing: { beats: '0-3s 悬念；3-8s 展开；8-15s 反转', cliffhanger: '这杯咖啡值 68 吗？评论区说' },
      storyboard: { sceneCount: 3, shots: ['Scene1 WS slow push-in 50mm', 'Scene2 MCU static 85mm', 'Scene3 ECU slow motion 135mm'] },
      format: { aspectRatio: '9:16', duration: 8, textOverlay: '前3秒大字：68元的咖啡贵吗？' },
      toneGuidelines: { writingPersona: '咖啡店老板，说话有钩子', vocabularyLevel: '口语', sentenceRhythm: '短促', avoidPatterns: [] },
      outputConstraints: { mustInclude: ['蒸汽', '霓虹灯管'], mustAvoid: ['笑脸'] },
      meta: { version: '2.0', domain: 'short-video', creativeConfidence: 'high' },
    },
  },
  brandVisual: {
    request: '帮我做咖啡品牌的视觉海报和 VI',
    profile: brandVisual,
    brief: {
      direction: { name: '暗夜实验室', manifesto: '克制、精准、有距离感的暗黑实验室气质。', moodAnchor: '专业但神秘' },
      guidance: { colorDirection: '墨黑+荧光青，暖琥珀点缀', materialDirection: '哑光金属+磨砂玻璃', compositionDirection: '大量留白，主体偏置', lightDirection: '单侧冷光+轮廓描边' },
      brand: { positioning: '精品咖啡中的暗黑实验室', audience: '25-35 城市白领', values: '克制/精准/深夜感', tone: '冷静陈述，不煽情' },
      identity: { logo: '字标+几何图形', typeface: '无衬线窄体', palette: '墨黑/荧光青/哑光银/暖琥珀', keyVisual: '蒸汽穿过环形灯管' },
      media: { matrix: '包装/户外海报/15s视频/门店空间' },
      consistency: { rules: '统一色板与留白，禁止渐变', signature: '角落环形灯管符号+冷光描边' },
      toneGuidelines: { writingPersona: '品牌官微，冷静专业', vocabularyLevel: '正式', sentenceRhythm: '长短交替', avoidPatterns: [] },
      outputConstraints: { mustInclude: [], mustAvoid: [] },
      meta: { version: '2.0', domain: 'brand-visual', creativeConfidence: 'high' },
    },
  },
  ecommerce: {
    request: '这条冷萃咖啡液怎么带货',
    profile: ecommerce,
    brief: {
      direction: { name: '冷萃黑金', manifesto: '10 秒冲出的高级感，价格打下来。', moodAnchor: '想马上下一单' },
      product: { name: '霓虹冷萃咖啡液（18g x 30 条）', category: '即饮咖啡液', price: '原价 129，活动价 79', sku: '主图露出 30 条装规格' },
      sellingPoints: { list: ['1. 冷萃 12h 更顺口', '2. 0 糖 0 卡', '3. 10 秒冲出一杯'], evidence: '检测报告' },
      usageScene: { scenario: '早起通勤/办公室下午', pain: '手冲太慢、速溶难喝', result: '困倦→清醒专注' },
      conversion: { hook: '限时 3 天 79，之后恢复 129', cta: '现在下单，今天发货', guarantee: '7 天无理由+不好喝包退' },
      trust: { proof: '月销 10w+ / 4.9 分', authority: '食品安全认证' },
      format: { aspectRatio: '9:16', duration: 30, textOverlay: '价格标签+卖点弹字' },
      toneGuidelines: { writingPersona: '直播间主播，热情不油腻', vocabularyLevel: '口语', sentenceRhythm: '短促', avoidPatterns: [] },
      outputConstraints: { mustInclude: [], mustAvoid: [] },
      meta: { version: '2.0', domain: 'ecommerce', creativeConfidence: 'high' },
    },
  },
  gameConcept: {
    request: '设计一个赛博朋克游戏角色，义体维修师',
    profile: gameConcept,
    brief: {
      direction: { name: '锈雨镇义体师', manifesto: '雨街角落的守夜人，霓虹下的旧手艺。', moodAnchor: '潮湿、疲惫但倔强' },
      worldview: { era: '近未来 2087', region: '东亚赛博+岭南骑楼', rules: '神经接入式义体，电力即货币', tone: '潮湿、高压、霓虹下的挣扎' },
      subject: { kind: '角色', role: '义体维修师，前雇佣兵', backstory: '在雨街开维修铺，欠义体公司债', details: '左臂义体、焊枪、旧工装、咖啡渍' },
      reference: { moodBoard: '银翼杀手 x 王家卫夜戏 x 港式骑楼', artists: '加藤直之/荒木飞吕彦/Akira', research: '1980s 香港霓虹招牌、义体参考真实假肢' },
      composition: { shotType: '仰角中景，人物占 2/3', environment: '雨夜街角，蒸汽与霓虹光晕' },
      guidance: { colorDirection: '墨蓝+青绿基底，荧光洋红点缀', materialDirection: '旧金属氧化+油污织物+湿润混凝土', compositionDirection: '强透视+前景遮挡', lightDirection: '霓虹冷光主光+暖色店内光' },
      toneGuidelines: { writingPersona: '设定集文案，克制冷峻', vocabularyLevel: '正式', sentenceRhythm: '长句', avoidPatterns: [] },
      outputConstraints: { mustInclude: [], mustAvoid: [] },
      meta: { version: '2.0', domain: 'game-concept', creativeConfidence: 'high' },
    },
  },
}

for (const [key, { request, profile, brief }] of Object.entries(briefs)) {
  line()
  console.log(`领域 ${profile.label}（${profile.id}）`)
  console.log(`用户输入：${request}`)
  line()
  const cls = classifyDomain(request, PROFILES)
  console.log(`[0.5] 领域判定 → mode=${cls.mode} confidence=${cls.confidence} keywords=[${(cls.keywords ?? []).join(',')}]`)
  const check = validateBrief(brief, profile)
  console.log(`[4]  brief 校验 → valid=${check.valid}${check.errors.length ? ` errors=${check.errors.join(';')}` : ''}`)
  const rendered = profile.render(brief)
  for (const [name, prompt] of Object.entries(rendered)) {
    const first = String(prompt).split('\n')[0]
    console.log(`[6]  ${name} → ${first}${String(prompt).split('\n').length > 1 ? ' …' : ''}`)
  }
  console.log()
}
