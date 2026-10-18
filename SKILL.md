---
name: remotion-srt-workflow
description: 把 SRT 字稿做成 Remotion 动画成片的完整工作流——S0 可行性评估到 G6 交付的七阶段门禁、逐帧文字重叠验算层、黑帧/接触印相 QA、已验证的本机渲染配方与踩坑清单。触发词：Remotion、SRT 做视频、字稿转动画、分镜、beat-sheet、styleframe、垂直切片。
---

# Remotion SRT 动画工作流

把一份 SRT 字稿（口播稿）做成 Remotion 渲染的 2D 动画成片。本流程在一个 81 句 / 193 秒 / 35 幕的真实项目里全程验证过（含 12 轮渲染、11 处被验算门拦下的真 bug）。

## 何时用

- 用户给一份 SRT / 字稿 / 口播文案，要做「配画面的解说视频」
- 已有 Remotion 工程要续做新幕 / 改幕
- 评审别人 Remotion 工程的成片质量

## 核心原则（不遵守必翻车）

1. **证据边界**：不编造已执行的操作。结论分「已验证事实 / 设计建议 / 未验证事项」三档。
2. **门禁不跳**：每个阶段末尾有 G 门，未经用户确认不推进。用户回「继续」= 授权当前门。
3. **一次做完**：用户明确要求连贯交付时（"你不能一次性做完吗"），把剩余幕一次铺完，验算门自动把关，不要拆成多轮等待确认。
4. **帧确定性**：时间轴只以帧为单位。禁 CSS animation/transition/@keyframes/Tailwind animate-*、禁 setTimeout 驱动时间轴；Random 必须固定种子。
5. **文字间距按行盒算**：中文字体（Noto Serif SC 等）行盒 ≈1.44em，视觉上不叠的字量出来可能叠。文字块间距留 ≥0.3em 余量，竖排字距 ≥1.55em。
6. **画面文字零标点**：SRT 标点在渲染层换空格，不要求作者改源文件。

## 流程总览

| 阶段 | 产出 | 门 |
|---|---|---|
| S0 | 可行性评估（分级 / 技术路径 / 风险表 / Brief 缺口），不写代码不下素材 | G0 用户定路径 |
| S1 | 工程初始化：npm 装 Remotion 全家桶、字体入 `public/fonts/`、tsconfig、Root | — |
| S2 | `brief.md` + `beat-sheet.md`（句→幕，帧界从 SRT 推导）+ `style-guide.md` + 3 张 styleframe 真实渲染 | G1 视觉方向 |
| S3 | `assets.md` 素材规划（图元清单 + 参数 + 风险；优先 100% 程序化 SVG，零外采） | G2 合并确认 |
| S4 | `storyboard.md` 逐幕分镜（帧界 / 主视觉 / 主运动 / 转场理由 / 静音验收锚点） | G3 合并确认 |
| S5 | 垂直切片：选数据密度最高的 3–4 幕真实渲染 + 抽帧 QA | G4 样片 |
| S6 | 全片铺幕（可一次铺完），每幕过验算门 | — |
| S7 | 整片渲染 + 五级验证 + 交付 | G5 QA → G6 |

状态文件一律落盘（`brief / beat-sheet / style-guide / assets / storyboard / progress / findings`），长任务以文件为事实来源。

## 详细手册（按需读）

- **`references/workflow.md`** — 每阶段的操作细节、数字复算方法、文献核验标准
- **`references/qa-gates.md`** — 重叠验算门原理、blackframe、接触印相、抽帧命令、渲染范围规则
- **`references/remotion-rules.md`** — Remotion 硬规则与本项目实测踩坑（幕间空隙黑帧、字体加载、绝对定位等）
- **`assets/OverlapAudit.tsx`** — 逐帧文字重叠验算层，可直接复制进工程，挂主 Composition 顶层

## 新工程 10 分钟起步

1. `npm i remotion @remotion/cli @remotion/bundler react react-dom typescript`（+ `@remotion/renderer`）
2. 中文字体：`cp /c/Windows/Fonts/NotoSerifSC-VF.ttf public/fonts/`（可变字体单文件覆盖全字重，SIL OFL 可商用），用 `staticFile()` + `FontFace` + `delayRender/continueRender` 本地加载，禁在线 Google Fonts
3. 复制 `assets/OverlapAudit.tsx` 到 `src/audit/`，挂主 Composition 顶层
4. 按 S2 建 beat-sheet，帧界写入单一事实来源 `src/acts/acts.ts`

## 渲染命令（本机已验证）

```bash
npx remotion render src/index.ts Main out.mp4 --codec h264 --crf 18 --frames=START-END --log=error
npx remotion still src/index.ts Main out.png --frame=N          # 单帧验证
npx remotion browser ensure                                     # 首次下载 Headless Shell
```

渲染速度参考：1080p 复杂动效 ≈17–27fps（5810 帧全片约 3–6 分钟）。
