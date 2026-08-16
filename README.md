# dsh-creative-director · DeepSeek Harness 创意指导 Agent 插件

**把"我要高级感"变成一份深耕领域的美学 brief（JSON），再渲染成可直接用的生成 prompt。**

dsh-creative-director 是一个 **DeepSeek Harness（dsh）插件**：先判定创作领域，再按该领域的专业维度评估、按该领域的字段模板追问，产出**开箱即用的领域 brief**，并由内置 `cd_render` 渲染成 `imagePrompt / videoPrompt / captionPrompt`——brief 有确定性的第一消费方，**立刻有用**。

- 关键词：`DeepSeek Harness 插件` · `dsh-plugin` · `创意指导 Agent` · `Creative Director` · `领域 brief` · `短视频创作` · `AIGC 去味` · `内容创作`
- 架构：核心框架 + 领域 Profile（当前深耕**短视频内容创作**，品牌视觉 / 电商 / 游戏概念按需增量）

---

## 它解决什么问题

用户说"我想要高级感"，你直接开工只会得到一条平庸的视频。真正的 CD 会先追问：爱马仕式的克制奢华，还是苹果式的冷感极简？**以及**：这到底是短视频、品牌视觉还是带货内容？

这个插件把"领域判定 → 追问 → 收敛 → 命名 → 输出 brief → 渲染 prompt"的专业流程做成 dsh 原生能力：

```
用户输入（模糊）──▶ 意图检测 ──▶ 领域判定 ──▶ 领域维度评估 ──▶ 覆盖判定
                        （闲聊放行） （mode=auto）    （0.5 不计数） （未收敛继续问）
──▶ 字段深度追问 ──▶ 命名 ──▶ 自查 ──▶ 领域 brief JSON ──▶ cd_render → 生成 prompt
```

## 领域 Profile 架构（核心薄、深度在 profile）

brief = **公共核心**（`direction` + `meta`）+ **领域字段**（随 `meta.domain` 变化）。领域知识收敛在一个 profile 文件里，加新领域 = 加一个文件。

```
dsh-creative-director/
├── index.js                # 插件入口：注册 skill + 5 个框架工具
├── lib/framework.js        # 确定性框架逻辑（评估/分类/矛盾/校验，无领域知识）
├── profiles/
│   └── short-video.js      # 领域 A：短视频（维度 + 引导式字段模板 + 必填 + render）
├── skills/creative-director.md      # 对话工作流（Step 0.5 领域判定 + 按 profile 分支）
├── cordis.patch.yml        # dsh bundle 配置层
├── smoke-test.mjs          # 22 项单元测试
└── README.md
```

### 领域 A：短视频内容创作（当前唯一）

评估维度（`cd_assess` 按它算覆盖分）：

| 维度 | 打分 | 说明 |
| --- | --- | --- |
| 主体 | 0/0.5/1 | 画面焦点是谁/什么 |
| 情绪基调 | 0/0.5/1 | 观众看完的第一反应 |
| 关键画面/动作 | 0/1 | 主体在做什么、哪个瞬间 |
| **前3秒钩子** | 0/1 | 前3秒能不能勾住人 |
| **完播节奏** | 0/1 | 钩子→展开→反转/CTA |
| 风格/媒介 | 0/1 | 写实/插画/3D/水墨 |

brief 领域字段（深度载体，每个字段带引导问题/示例/禁区）：

```
hooks:      { first3s, openingHook }         前3秒钩子策略
pacing:     { beats, cliffhanger }           完播节奏 + 结尾留人
storyboard: { sceneCount, shots }            分镜（景别/运镜/镜头/光线/转场）
format:     { aspectRatio, duration, textOverlay }   9:16 / 时长 / 字幕
guidance:   { color/material/composition/light }     视觉四维
```

## 快速开始

### 安装

```sh
dsh plugin --profile demo add github:lussey820/dsh-creative-director
```

纯 ESM、免构建，也可以本地安装：在仓库目录执行 `dsh plugin --profile demo add .`。

### 使用

在 dsh 对话中直接提需求，skill 会自动接管：

```
帮我做一个赛博朋克咖啡品牌的短视频
→ 意图检测 → cd_assess(mode=auto) 判定领域=short-video
→ 短视频维度评估 → 覆盖不足 → 自适应追问
→ 补齐领域必填（前3秒钩子/完播节奏/分镜/9:16）
→ 命名「霓虹苦味」→ 用户确认
→ cd_save_brief 校验保存 brief-current.json
→ cd_render 渲染 videoPrompt/imagePrompt/captionPrompt
```

## 框架工具（模型可调用）

| 工具 | 输入 | 输出 | 对应原逻辑 |
| --- | --- | --- | --- |
| `cd_assess` | `mode`（'auto' 或领域）+ `request`/`scores` | 领域建议+置信度，或覆盖分/`fastTrack`/`askPriority` | Step 0.5 领域判定 + Step 1 分流 |
| `cd_detect_conflict` | `text` | `conflict` / `suggestion` | Step 2 软性矛盾检测 |
| `cd_save_brief` | `brief`（按 `meta.domain` 校验） | `{ ok, saved }` 或 `{ ok:false, errors }` | Step 4 校验与持久化 |
| `cd_render` | `brief` | `imagePrompt` / `videoPrompt` / `captionPrompt` | Step 6 brief → prompt（第一消费方） |
| `cd_polish_type` | `text` | `type: prompt\|copy\|ask` | Step 5.0 润色文本类型判定 |

## 为什么把框架逻辑抽成代码

- **可测试**：`node smoke-test.mjs` 22 项单元测试覆盖收敛判定、领域分类、矛盾启发式、文本分类、领域校验、渲染
- **可靠**：0.5 不计数、覆盖≥4 且主体/情绪=1、`meta.domain` 匹配等硬规则由代码强制执行
- **可扩展**：加新领域 = 写一个 profile 文件（dimensions + fields + required + render），框架零改动
- **可消费**：`cd_render` 让 brief 立刻变成可执行的生成 prompt，深度字段不再闲置

## 相关链接

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) —— 插件式 AI Agent 框架
- [dsh-plugin 生态](https://github.com/topics/dsh-plugin) —— 社区插件

## License

[MIT](LICENSE)
