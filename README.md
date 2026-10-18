# remotion-srt-workflow

把 SRT 字稿（口播稿）做成 Remotion 动画成片的完整工作流 Skill。

在一个 81 句 / 193 秒 / 35 幕的真实项目里全程验证：七阶段门禁（S0 可行性 → S2 节拍表与视觉方向 → S3 素材规划 → S4 分镜 → S5 垂直切片 → S6 铺幕 → S7 整片渲染），配套逐帧文字重叠验算层与五级 QA。流程中 11 处真 bug 全部被门禁拦截修复，无一漏到成片。

## 内容

| 文件 | 说明 |
|---|---|
| `SKILL.md` | 技能入口：原则、流程总览、10 分钟起步、渲染命令 |
| `assets/OverlapAudit.tsx` | 逐帧文字重叠验算层——每帧实测所有文字包围盒，相交 >4px 即渲染失败并报帧号。可直接复制进任何 Remotion 工程 |
| `references/workflow.md` | 各阶段操作细节：数字复算、文献核验、styleframe、分镜、垂直切片 |
| `references/qa-gates.md` | 验算门实现要点、blackframe、接触印相、抽帧、规格复核 |
| `references/remotion-rules.md` | 帧确定性硬规则、版式陷阱（字体行盒 1.44em 等）、真 bug 存档、渲染配方 |

## 设计立场

- **门禁不跳**：每个阶段末尾有用户确认门，状态文件落盘为事实来源。
- **验算是常驻机制不是一次性检查**：验算层挂主 Composition 顶层，渲染报错 = 有重叠，想绕都绕不过。
- **证据边界**：结论分「已验证事实 / 设计建议 / 未验证事项」，不编造已执行的操作。
- **一次做完**：用户要求连贯交付时，剩余幕一次铺完，由验算门自动把关质量。

## 安装

复制本目录到技能目录（如 `~/.workbuddy/skills/remotion-srt-workflow/` 或 Claude Code 的 skills 目录）即可，无外部依赖。`OverlapAudit.tsx` 需要 `remotion >= 4.0`。

## 来源项目

《回本》——赌场负期望值科普动画，1920×1080 / 30fps / 5810 帧 / 193.7s，Remotion 4.0.536 渲染，验算门 12 轮渲染全绿交付。

## License

MIT
