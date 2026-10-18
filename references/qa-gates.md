# QA 门禁（每批渲染强制，已写入工程长期记忆）

## 1. 重叠验算门（最重要）

`assets/OverlapAudit.tsx` 挂主 Composition 顶层后**全程自动生效**：每帧实测所有文字包围盒（HTML 文本节点 + SVG text），两两求交 >4px 即 `cancelRender`，渲染直接失败并报帧号 / 内容 / 盒子坐标。

**渲染报「重叠验算」错误 = 画面有文字重叠，必须修复后重渲，禁止跳过或绕过。**

新幕合入流程：先渲该幕帧界验算（可用临时输出文件），绿了再出 final。多行报错会被日志吞行，报错消息用单行分隔（` ｜ ` join）。

### 实现要点（改此文件前必读）

- `useEffect` 内**同步**测量（DOM 已是本帧提交结果）；rAF 延迟测量会与 Remotion 帧时钟竞态。
- 可见性沿**祖先链**查 opacity/display/visibility——淡入组件的 opacity 常在更上层祖先（如 MaskRise 包裹层），只查父级会漏检。
- SVG `<text>` 按文本节点 `Range` 量盒子，否则分段文本自己和自己「重叠」。
- `overflow:hidden` 祖先求裁剪交集——上升入场文字被裁掉的部分不算，避免假阳性。
- 调试时可注册一个无验算的 `MainNoAudit` Composition 做对照，但**交付渲染永远用带验算的**。

## 2. 黑帧检查

```bash
ffmpeg -i final.mp4 -vf blackframe=amount=0.9 -an -f null - 2>&1 | grep -c pblack
```

非零即查。两大来源：
- **幕间空隙**：ACTS 帧界来自 SRT，句间停顿会产生 1–4 帧无人渲染的空隙 → 修法是 ActSlot 把每幕 `durationInFrames` 延伸到下一幕起点（`nextStart - thisStart`），空隙由上一幕末态定格补齐。
- **渲染范围含未实现幕**：分段渲染的 `--frames` 终点必须收口在已实现幕的末帧（如 1183 不是 1184）。

## 3. 接触印相

```bash
ffmpeg -y -v error -i final.mp4 -vf "select='not(mod(n\,145))',scale=384:216,tile=5x8" -frames:v 1 sheet.jpg
```

一格 ≈5 秒，40 格能覆盖 193s 全片，目检叙事完整性与风格统一。

## 4. 关键帧抽检

```bash
ffmpeg -y -v error -ss SECONDS -i final.mp4 -update 1 -frames:v 1 chk.png   # 注意 -update 1，否则不写文件
```

抽帧时间按秒算，别误用帧号；落点避开转场空档（先看印相再取点）。

## 5. 规格复核

```bash
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -of default=noprint_wrappers=1 final.mp4
```

对照验收标准：分辨率 / fps / 帧数与 acts.ts 总帧一致 / 时长与 SRT 末帧一致。

## 状态文件门禁（每批收尾）

- `progress.md` 追加：本批幕号、抓修 bug 清单、QA 数据（渲染用时/黑帧数/印相格数）
- 渲染中**绝不编辑源码**（bundler 抓中间态会报幽灵错误）；顺序永远是「改完再渲染」
