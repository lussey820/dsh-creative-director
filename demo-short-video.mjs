// 端到端场景演示：赛博朋克咖啡品牌 → 抖音短视频
// 跑通：领域判定 → 维度评估 → 追问收敛 → brief 校验 → 渲染 prompt
import {
  classifyDomain,
  assess,
  detectConflict,
  validateBrief,
} from './lib/framework.js'
import shortVideo from './profiles/short-video.js'

const PROFILES = [shortVideo]
const PROFILE = shortVideo
const line = () => console.log('─'.repeat(56))

line()
console.log('场景：帮我做一个赛博朋克咖啡品牌的抖音短视频')
line()

console.log('\n[Step 0.5] 领域判定 cd_assess(mode=auto)')
const cls = classifyDomain('帮我做一个赛博朋克咖啡品牌的抖音短视频', PROFILES)
console.log(' →', JSON.stringify(cls, null, 2))

console.log('\n[Step 1] 初始评估（覆盖不足 → 追问）')
let r = assess(
  { subject: 1, mood: 0.5, action: 1, style: 1 },
  PROFILE.dimensions,
)
console.log(' 评分: 主体=1 情绪=0.5 画面=1 钩子=0 节奏=0 风格=1')
console.log(' → coverage =', r.coverage, '| fastTrack =', r.fastTrack)
console.log(' → askPriority =', r.askPriority.join(' → '))

console.log('\n[Step 2] 追问过程中检测到矛盾：用户说"潮湿但温暖"')
const conflict = detectConflict('潮湿但温暖')
console.log(' →', JSON.stringify(conflict))

console.log('\n[Step 2] 用户回答后重新评估（已收敛）')
console.log(' 用户补充: 情绪=温暖街头感 钩子=反差 节奏=反转+CTA')
r = assess(
  { subject: 1, mood: 1, action: 1, hook: 1, pacing: 1, style: 1 },
  PROFILE.dimensions,
)
console.log(' → coverage =', r.coverage, '| fastTrack =', r.fastTrack, '| decision =', r.fastTrack ? '进入 Step 3 确认方向' : '继续追问')

console.log('\n[Step 4] 输出领域 brief + cd_save_brief 校验')
const brief = {
  direction: {
    name: '霓虹苦味 (Neon Bitter)',
    manifesto: '在一个被数据流冲刷的潮湿城市，咖啡是最后的手工仪式。粗粝的混凝土与温暖的蒸汽共存，霓虹灯管的冷光在雨雾里晕开。孤独但不寒冷，粗糙但有温度。',
    moodAnchor: '看完想马上把这家店发给朋友',
  },
  guidance: {
    colorDirection: '冷色基底（墨蓝+青绿）配暖色点缀（琥珀灯+奶白蒸汽），中高对比',
    materialDirection: '混凝土粗糙面 vs 黄铜镜面，蒸汽半透明 vs 霓虹锐利',
    compositionDirection: '紧凑构图，主体与环境有挤压感，视觉重心偏下',
    lightDirection: '主光=霓虹侧光（冷），补光=暖黄吊灯（暖），雨雾中光晕扩散',
  },
  hooks: {
    first3s: '咖啡杯砸在霓虹灯管前，蒸汽冲镜头',
    openingHook: '反差：越高级的咖啡店，越不装',
  },
  pacing: {
    beats: '0-3s 悬念：霓虹灯灭；3-8s 展开：咖啡制作特写；8-15s 反转：拉远露出整条雨街',
    cliffhanger: '你觉得这杯咖啡值 68 吗？评论区说',
  },
  storyboard: {
    sceneCount: 3,
    shots: [
      'Scene1 WS slow push-in 50mm golden hour 暖琥珀',
      'Scene2 MCU static 85mm hard light 黑白高对比',
      'Scene3 ECU slow motion 135mm backlit dust 暖琥珀 glow',
    ],
  },
  format: { aspectRatio: '9:16', duration: 8, textOverlay: '前3秒大字：68元的咖啡贵吗？' },
  toneGuidelines: {
    writingPersona: '下北泽独立咖啡店老板，说话有钩子，不解释太多',
    vocabularyLevel: '口语',
    sentenceRhythm: '短促利落',
    avoidPatterns: ['在当今...', '不仅...而且...', '✨', '💫'],
  },
  outputConstraints: {
    mustInclude: ['蒸汽', '霓虹灯管', '咖啡杯'],
    mustAvoid: ['笑脸', '文字过多', '过于干净无菌'],
  },
  meta: { version: '2.0', domain: 'short-video', dimensionsCovered: 6, creativeConfidence: 'high' },
}
const check = validateBrief(brief, PROFILE)
console.log(' → valid =', check.valid, check.errors.length ? `| errors: ${check.errors.join('; ')}` : '')

console.log('\n[Step 6] cd_render 渲染生成 prompt')
const { imagePrompt, videoPrompt, captionPrompt } = PROFILE.render(brief)
console.log('\n--- imagePrompt ---\n' + imagePrompt)
console.log('\n--- videoPrompt ---\n' + videoPrompt)
console.log('\n--- captionPrompt ---\n' + captionPrompt)
line()
console.log(`结论：${cls.confidence === 'high' ? '领域判定 high' : '需要确认'} → 收敛 → brief 校验通过 → 三份 prompt 可直接喂给生成 API`)
line()
