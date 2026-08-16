// 领域 A：短视频内容创作 profile（深耕抖音生态：竖屏图文 + 短视频 + 口播脚本）
export default {
  id: 'short-video',
  label: '短视频内容创作',
  keywords: [
    '抖音', '短视频', '竖屏', '口播', '分镜', '完播', '9:16', '宣传片',
    '带货视频', '短片', '视频', 'vlog',
  ],

  // 评估维度：cd_assess 按它算覆盖分（0.5 只在 subject/mood 允许）
  dimensions: [
    { key: 'subject', label: '主体', allowHalf: true },
    { key: 'mood', label: '情绪基调', allowHalf: true },
    { key: 'action', label: '关键画面/动作', allowHalf: false },
    { key: 'hook', label: '前3秒钩子', allowHalf: false },
    { key: 'pacing', label: '完播节奏', allowHalf: false },
    { key: 'style', label: '风格/媒介', allowHalf: false },
  ],

  // 引导式字段模板：追问时按字段逐个挖，深度全在这里。
  // question=模型问用户的话；example=提示用户怎么答；forbid=禁区。
  fields: {
    guidance: {
      colorDirection: {
        question: '色彩基调 + 对比方案 + 饱和度倾向？',
        example: '冷色基底（墨蓝+青绿）配暖色点缀（琥珀灯+奶白蒸汽），中高对比',
      },
      materialDirection: {
        question: '材质质感：粗糙vs光滑、厚重vs轻盈、有机vs工业？',
        example: '混凝土粗糙面 vs 黄铜镜面，蒸汽半透明 vs 霓虹锐利',
      },
      compositionDirection: {
        question: '构图：景别、透视、视觉重心？',
        example: '紧凑构图，主体与环境有挤压感，视觉重心偏下',
      },
      lightDirection: {
        question: '光线：主光/补光、色温、层次？',
        example: '主光=霓虹侧光（冷），补光=暖黄吊灯（暖），雨雾中光晕扩散',
      },
    },
    hooks: {
      first3s: {
        question: '前3秒观众看到/听到什么？一句话说清',
        example: '咖啡杯砸在霓虹灯管前，蒸汽冲镜头',
        forbid: ['空泛形容词', '超过20字'],
      },
      openingHook: {
        question: '用什么钩住人？悬念 / 反差 / 视觉奇观 / 痛点',
        example: '反差点：越高级的咖啡店，越不装',
      },
    },
    pacing: {
      beats: {
        question: '按时间线列情绪节拍（如 0-3s 钩子 / 3-8s 展开 / 8-15s 反转+CTA）',
        example: '0-3s 悬念：霓虹灯灭；3-8s 展开：咖啡制作特写；8-15s 反转：拉远露出整条雨街',
      },
      cliffhanger: {
        question: '结尾用什么留人？悬念 / 反差 / 互动提问',
        example: '你觉得这杯咖啡值 68 吗？评论区说',
      },
    },
    storyboard: {
      sceneCount: {
        question: '几个分镜？（5s=1-2个，8s=2-3个，15s≤4个）',
        example: '3',
      },
      shots: {
        question: '每个分镜一行：景别/运镜/镜头/光线/色调/转场（参照 Cinematography 词汇表）',
        example: 'Scene1 WS slow push-in 50mm golden hour 暖琥珀\nScene2 MCU static 85mm hard light 黑白高对比',
      },
    },
    format: {
      aspectRatio: { question: '画面比例？', example: '9:16' },
      duration: { question: '时长（秒）？', example: '8' },
      textOverlay: {
        question: '字幕/贴字需求？无则写 No text overlay',
        example: '前3秒大字：68元的咖啡贵吗？',
      },
    },
  },

  // 领域必填字段：cd_save_brief 在公共核心之上按此校验
  required: [
    'guidance.colorDirection',
    'guidance.materialDirection',
    'guidance.compositionDirection',
    'guidance.lightDirection',
    'hooks.first3s',
    'hooks.openingHook',
    'pacing.beats',
    'pacing.cliffhanger',
    'storyboard.sceneCount',
    'storyboard.shots',
    'format.aspectRatio',
    'format.duration',
  ],

  /**
   * brief → 生成 prompt：cd_render 的第一消费方。
   * 把领域 brief 翻译成可直接喂给生成 API 的 imagePrompt / videoPrompt / captionPrompt。
   * @param {object} brief - 完整 brief（含公共核心 + 本领域字段）
   */
  render(brief) {
    const dir = brief.direction ?? {}
    const g = brief.guidance ?? {}
    const h = brief.hooks ?? {}
    const p = brief.pacing ?? {}
    const sb = brief.storyboard ?? {}
    const f = brief.format ?? {}
    const tone = brief.toneGuidelines ?? {}
    const out = brief.outputConstraints ?? {}

    const ratio = f.aspectRatio || '9:16'
    const duration = f.duration || 8
    const shotLines = Array.isArray(sb.shots)
      ? sb.shots
      : String(sb.shots ?? '').split('\n').map((s) => s.trim()).filter(Boolean)

    const imagePrompt = [
      `A vertical ${ratio} social media poster.`,
      `Color palette: ${g.colorDirection ?? ''}.`,
      `Texture: ${g.materialDirection ?? ''}.`,
      `Lighting: ${g.lightDirection ?? ''}.`,
      `Composition: ${g.compositionDirection ?? ''}.`,
      `Atmosphere: ${dir.manifesto ?? ''}.`,
      `Include: ${(out.mustInclude ?? []).join(', ')}.`,
      `Avoid: ${(out.mustAvoid ?? []).join(', ')}.`,
      'All text and characters in the image must be Simplified Chinese only.',
      'Social media card style, eye-catching, high quality.',
    ].filter((line) => !/: \.$/.test(line) && !line.endsWith(': ')).join('\n')

    const videoPrompt = [
      `A ${duration}-second vertical ${ratio} video.`,
      `Opening (0-3s): ${h.first3s ?? ''}. Hook: ${h.openingHook ?? ''}.`,
      ...shotLines,
      `Pacing: ${p.beats ?? ''}. Ending: ${p.cliffhanger ?? ''}.`,
      `Text overlay: ${f.textOverlay || 'No text overlay'}.`,
      'High quality, smooth motion, stable composition.',
    ].join('\n')

    const captionPrompt = [
      `Create a social media post about: ${dir.name ?? ''}.`,
      `The tone should match this persona: ${tone.writingPersona ?? ''}.`,
      `Vocabulary: ${tone.vocabularyLevel ?? ''}. Sentence rhythm: ${tone.sentenceRhythm ?? ''}.`,
      'Title should be catchy. Content should hook in the first line. Include hashtags. Chinese language.',
    ].join('\n')

    return { imagePrompt, videoPrompt, captionPrompt }
  },
}
