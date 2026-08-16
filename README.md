# dsh-creative-director · DeepSeek Harness 创意指导 Agent 插件

**把"我要高级感"变成一句可以生成内容的美学 brief（JSON）。**

dsh-creative-director 是一个 **DeepSeek Harness（dsh）插件**：把 AiToEarn 创意指导 skill 的完整框架移植进 dsh，用自适应追问把模糊的中文描述收敛成结构化美学方向，让下游图文/视频 skill 直接消费。**框架逻辑从提示词里提了出来，变成可测试的代码工具**——算分、收敛判定、矛盾检测、brief 校验全部由工具完成，模型只负责判断与表达。

- 关键词：`DeepSeek Harness 插件` · `dsh-plugin` · `创意指导 Agent` · `Creative Director` · `美学 brief` · `AIGC 去味` · `内容创作` · `AiToEarn`
- 生态：与 [aitoearn-dsh-plugin](https://github.com/lussey820/aitoearn-dsh-plugin)（图文/脚本/视频生成 + 抖音发布）串联成完整创作链路

---

## 它解决什么问题

用户说"我想要高级感"，你直接开工只会得到一张平庸的图。真正的 CD 会先追问：爱马仕式的克制奢华，还是苹果式的冷感极简？

这个插件把这段"追问 → 收敛 → 命名 → 输出 brief"的专业流程做成了 dsh 原生能力：

```
用户输入（模糊）──▶ 意图检测 ──▶ 6 维评估 ──▶ 覆盖判定 ──▶ 自适应追问
                        （闲聊则放行）    （0.5 不计数）   （未收敛继续问）
──▶ 方向命名 ──▶ manifesto↔guidance 自查 ──▶ 结构化美学 brief JSON
```

## 核心特性

| 特性 | 说明 |
| --- | --- |
| 6 维评估框架 | 主体 / 情绪基调 / 关键画面 / 色彩光线 / 空间构图 / 风格媒介，`cd_assess` 计算覆盖分与快速通道判定 |
| 0.5 不计数 | 模糊线索（"高级感""对峙"）只引导追问，不参与收敛——防止半懂装懂 |
| 矛盾检测 | "极简但华丽"这类对立需求，`cd_detect_conflict` 给出融合方案而非硬塞 |
| 命名与宣言 | 每个方向都有名字（「冷萃纯净」「霓虹苦味」），可被讨论、可被复用 |
| 一致性自查 | manifesto 与 guidance 四维（色彩/材质/光线/构图）静默对账，防止宣言漂亮 JSON 跑偏 |
| 双模式润色 | Prompt 精炼师（英文生图 prompt 做减法）+ AIGC 痕迹去除大师（中文文案去 AI 味），`cd_polish_type` 自动分流 |
| 结构校验 | `cd_save_brief` 校验 16 个必填字段后才写入 `brief-current.json`，下游零解析成本 |

## 快速开始

### 安装

```sh
dsh plugin --profile demo add github:lussey820/dsh-creative-director
```

纯 ESM、免构建，也可以本地安装：在仓库目录执行 `dsh plugin --profile demo add .`。

### 使用

在 dsh 对话中直接提需求，skill 会自动接管：

```
帮我做一个赛博朋克咖啡品牌的图文
→ 意图检测 → 6 维评估 → cd_assess 判定覆盖不足
→ 自适应追问（情绪？画面？空间？）
→ 收敛 → 方向命名「霓虹苦味」→ 用户确认
→ cd_save_brief 校验并保存 brief-current.json
```

拿到 brief 后，交给 [aitoearn-dsh-plugin](https://github.com/lussey820/aitoearn-dsh-plugin) 的图文/视频 skill 直接生成并发布抖音。

## 框架工具（模型可调用）

| 工具 | 输入 | 输出 | 对应原逻辑 |
| --- | --- | --- | --- |
| `cd_assess` | 6 维评分 `subject/mood/action/color/space/style` | `coverage` / `fastTrack` / `status` / `askPriority` / `decision` | Step 1 入口判断与分流 |
| `cd_detect_conflict` | `text` | `conflict` / `left` / `right` / `suggestion` | Step 2 软性矛盾检测 |
| `cd_polish_type` | `text` | `type: prompt\|copy\|ask` / `reason` | Step 5.0 润色文本类型判定 |
| `cd_save_brief` | `brief`（+`path`） | `{ ok, saved }` 或 `{ ok:false, errors }` | Step 4 brief 校验与持久化 |

## 为什么把框架逻辑抽成代码

- **可测试**：`node smoke-test.mjs` 14 项单元测试覆盖收敛判定、矛盾启发式、文本分类、结构校验
- **可靠**：0.5 不计数、覆盖≥4 且主体/情绪=1 等硬规则由代码强制执行，模型不会"记错规则"
- **可组合**：下游 skill 复用同一份 `brief-current.json`，字段结构由 `cd_save_brief` 兜底

## 项目结构

```
dsh-creative-director/
├── index.js                # 插件入口：注册 skill + 4 个框架工具
├── lib/framework.js        # 提取出的确定性框架逻辑（纯函数）
├── skills/aitoearn-creative-director.md   # 对话工作流（人设/追问树/自查/润色）
├── cordis.patch.yml        # dsh bundle 配置层
├── smoke-test.mjs          # 框架逻辑单元测试
└── README.md
```

## 相关链接

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) —— 插件式 AI Agent 框架
- [aitoearn-dsh-plugin](https://github.com/lussey820/aitoearn-dsh-plugin) —— 图文/脚本/视频生成 + 抖音发布插件（消费本插件产出的 brief）
- [dsh-plugin 生态](https://github.com/topics/dsh-plugin)

## License

[MIT](LICENSE)
