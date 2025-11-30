/*
 * Copyright (c) 2024-2025 Sun Booshi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { forwardRef, useImperativeHandle, useRef } from 'react';
import styles from './RenderContainer.module.css';

// 定义 ref 暴露的句柄类型
export interface RenderContainerRef {
  styleEl: HTMLStyleElement | null;
  contentEl: HTMLDivElement | null;
}

// 使用 forwardRef 来允许父组件访问内部 DOM 节点
export const RenderContainer = forwardRef<RenderContainerRef, {}>((props, ref) => {
  const styleRef = useRef<HTMLStyleElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 使用 useImperativeHandle 将内部 ref 暴露给父组件
  useImperativeHandle(ref, () => ({
    styleEl: styleRef.current,
    contentEl: contentRef.current,
  }));

  return (
    <div className={styles.RenderRoot}>
      {/* 用于注入动态 CSS */}
      <style ref={styleRef}></style>
      {/* 用于渲染 Markdown HTML */}
      <div ref={contentRef} className="braft-output-content">
        {/* 内容将由 ArticleRender 动态填充 */}
        <p>正在等待渲染...</p>
      </div>
    </div>
  );
});
