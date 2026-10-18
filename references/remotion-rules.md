# Remotion 硬规则与实测踩坑

## 硬规则（违反即返工）

1. **帧确定性**：时间轴只以帧为单位（`useCurrentFrame` + `interpolate`/`spring`）。禁 CSS animation/transition/@keyframes、禁 Tailwind animate-*、禁 setTimeout/setInterval 驱动时间轴。
2. **Random 固定种子**：任何随机性（点阵、路径簇、城市灯光）用 mulberry32 等种子 RNG，种子写进常量。
3. **字体本地加载**：`staticFile()` + `FontFace` + `delayRender/continueRender`，字体文件放 `public/fonts/`。禁在线 Google Fonts（渲染机不保证网络）。Noto Serif/Sans SC 可变字体（`-VF.ttf`）配 `font-weight: 100 900` 单文件覆盖全字重，SIL OFL 可商用。
4. **多幕门控**：每幕 Sequence 内，非当前帧返回 null 或末态，禁止上一幕元素残留堆叠。
5. **幕间空隙补齐**：ActSlot 的 `durationInFrames = 下一幕 start − 本幕 start`（不是 `end − start`），空隙由上一幕末态定格，否则黑帧。

## 版式（验算门实测抓出来的）

- 中文字体行盒 ≈1.44em：视觉不叠的字，量出来可能叠 8–18px。文字块间距按行盒留 ≥0.3em 余量；竖排字距 ≥1.55em（96px 字 → 字距 ≥150px）。
- SVG `<text>` 超出 svg width 会被裁切——居中文本用 `x={width/2} textAnchor="middle"`，别把长文本塞在窄 SVG 里。
- 新旧数字交叉淡化：旧数字淡出完成帧必须早于新数字入场起始帧（留 2+ 帧空档），否则同屏相叠。
- 绝对定位容器的子元素再用 `position:absolute` 会脱离文档流导致 flex 居中失效；绝对定位必须显式 `left/top`，跨层级对齐用 px 不用 %。
- 组件外层 flex 居中时，子元素改 `relative`，不要 absolute。
- 大数字与说明行是最高频相叠点（220px 数字 + 40px 说明），层级间距 ≥90px 起步。

## 逻辑陷阱（真 bug 存档）

- `text.slice(0, chars)` 打字机：`chars` 为负时 slice 从尾部反向截取，开始前就漏字 → `Math.max(0, ...)` 或 `Math.min(len, Math.floor(...))` 先钳住。
- 文字「重合」节拍：两词完全叠印不可读，改「贴近不重叠」（间距 30px 读作一个短语）。可读性 > 隐喻。
- 「穿过」类运动：物体移动路径会穿过文字标签（天平砝码撞标签）→ 横向挪出路径或提前淡出，验算门只查文字对文字，查不到物体压字，这种要靠抽帧目检。
- 沿椭圆/几何方程核位：元素「悬在桌外」这类错位靠目检不够，把椭圆方程写下来算实际落点。

## 渲染配方（本机验证值）

```bash
# 首次
npx remotion browser ensure          # Headless Shell ~150MB 落 node_modules/.remotion/
# 单帧验证（几秒一张）
npx remotion still src/index.ts Main out.png --frame=N
# 成片
npx remotion render src/index.ts Main out.mp4 --codec h264 --crf 18 --frames=S-E --log=error
```

- 速度：1080p 复杂动效 17–27fps（含逐帧验算）；5810 帧全片 3–6 分钟。
- 渲染中不可编辑源码（bundler 抓中间态，报错在开始后数分钟，极易误判）。
- 报错被吞（多行消息只显示首行）→ 单帧 `--frames=N-N` 复现取完整报错。

## 环境坑（Windows / WorkBuddy 沙箱）

- ffmpeg 单帧输出必须 `-update 1`。
- `blackframe` 滤镜 grep `pblack`（不是 `blackframe` 行本身）。
- 后台 shell 约 120s 被砍 → 长渲染前台调用 + 显式 timeout 600000，或分段 ≤2 分钟。
- npm 装含原生模块的包报 EBUSY → `--ignore-scripts`。
- 沙箱内 npm 无法建 symlink → 大型依赖安装需禁用沙箱，装完复查 `node_modules/.bin` 非空。
