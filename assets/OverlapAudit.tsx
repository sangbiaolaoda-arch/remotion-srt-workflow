import React, {useEffect} from 'react';
import {cancelRender, continueRender, delayRender, useCurrentFrame} from 'remotion';

/**
 * 逐帧重叠验算层（挂在 Main 顶层，全程生效）。
 *
 * 规则：
 * 1. useEffect 内同步测量（React 提交后 DOM 即本帧，无帧时钟竞态）。
 * 2. 只测「真实渲染中的文字」：HTML 直接文本节点 + SVG <text>。
 * 3. 可见性：opacity ≥0.05、非 display:none/visibility:hidden、宽高 ≥2px、画内有交集。
 * 4. 裁剪修正：文字若处于 overflow:hidden 祖先内（如 MaskRise 上升期），
 *    包围盒先与每个裁剪祖先求交——被裁掉的部分不算，避免假阳性。
 * 5. 判定：两段文字的有效包围盒双向重叠 > 4px（避开字体 hinting 噪声）→ cancelRender，
 *    渲染失败并报出帧号 / 文字内容 / 包围盒。
 */
interface Box {
  label: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const isVisibleThroughAncestors = (el: Element): boolean => {
  let cur: Element | null = el;
  while (cur) {
    const s = getComputedStyle(cur);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    cur = cur.parentElement;
  }
  return true;
};

const intersectWithClipAncestors = (el: Element, r: DOMRect): DOMRect | null => {
  let box = {left: r.left, top: r.top, right: r.right, bottom: r.bottom};
  let cur = el.parentElement;
  while (cur) {
    const s = getComputedStyle(cur);
    if (s.overflow !== 'visible' && s.overflowY !== 'visible') {
      const cr = cur.getBoundingClientRect();
      box = {
        left: Math.max(box.left, cr.left),
        top: Math.max(box.top, cr.top),
        right: Math.min(box.right, cr.right),
        bottom: Math.min(box.bottom, cr.bottom),
      };
      if (box.right - box.left < 2 || box.bottom - box.top < 2) return null;
    }
    cur = cur.parentElement;
  }
  return new DOMRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
};

const collectTextBoxes = (): Box[] => {
  const boxes: Box[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent || '';
    const parent = node.parentElement;
    if (text.trim().length > 0 && parent) {
      if (isVisibleThroughAncestors(parent)) {
        // 一律按文本节点自身的 Range 量（SVG text 分段/HTML 都准确），退化时用父级盒子
        const range = document.createRange();
        range.selectNodeContents(node);
        let raw = range.getBoundingClientRect();
        if (raw.width < 2 || raw.height < 2) raw = parent.getBoundingClientRect();
        if (raw.width >= 2 && raw.height >= 2) {
          const clipped = intersectWithClipAncestors(parent, raw);
          if (
            clipped &&
            clipped.width >= 2 &&
            clipped.height >= 2 &&
            clipped.right > 0 &&
            clipped.bottom > 0 &&
            clipped.left < window.innerWidth &&
            clipped.top < window.innerHeight
          ) {
            boxes.push({
              label: text.trim().replace(/\s+/g, ' ').slice(0, 16),
              left: clipped.left,
              top: clipped.top,
              right: clipped.right,
              bottom: clipped.bottom,
            });
          }
        }
      }
    }
    node = walker.nextNode();
  }
  return boxes;
};

const findOverlaps = (boxes: Box[]): string[] => {
  const TOL = 4;
  const hits: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > TOL && h > TOL) {
        hits.push(
          `「${a.label}」[${Math.round(a.left)},${Math.round(a.top)},${Math.round(a.right)},${Math.round(
            a.bottom
          )}] × 「${b.label}」[${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(
            b.bottom
          )}] 交叠 ${Math.round(w)}×${Math.round(h)}px`
        );
      }
    }
  }
  return hits;
};

export const OverlapAudit: React.FC = () => {
  const frame = useCurrentFrame();

  useEffect(() => {
    const handle = delayRender(`overlap-audit-f${frame}`);
    try {
      // 同步测量：useEffect 时 DOM 已是本帧提交结果，getBoundingClientRect 强制布局
      const hits = findOverlaps(collectTextBoxes());
      if (hits.length > 0) {
        cancelRender(
          new Error(
            `[重叠验算] 第 ${frame} 帧发现 ${hits.length} 处文字重叠： ${hits.join(' ｜ ')}`
          )
        );
      }
    } finally {
      continueRender(handle);
    }
  }, [frame]);

  return null;
};
