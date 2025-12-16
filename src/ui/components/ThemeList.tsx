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

import { DropdownMenu } from "radix-ui";
import {
	DotFilledIcon,
	ChevronRightIcon,
} from "@radix-ui/react-icons";
import AssetsManager from "src/assets";
import { useConfigContext } from "src/store/ConfigStore";
import styles from "./ThemeList.module.css";
import * as React from "react";

export default function ThemeList({ disabled = false }: { disabled?: boolean }) {
  const manager = AssetsManager.getInstance();

  const theme = useConfigContext((s) => s.theme);
  const highlight = useConfigContext((s) => s.highlight);
  const setTheme = useConfigContext((s) => s.setTheme);
  const setHighlight = useConfigContext((s) => s.setHighlight);

  const themes = manager.themes === undefined ? [] : manager.themes.map(t => {
    return (
      <DropdownMenu.RadioItem className={styles.RadioItem} value={t.className} key={t.className}>
        <DropdownMenu.ItemIndicator className={styles.ItemIndicator}>
          <DotFilledIcon />
        </DropdownMenu.ItemIndicator>
        {t.name}
      </DropdownMenu.RadioItem>
    );
  });

  const highlights = manager.highlights === undefined ? [] : manager.highlights.map(h => {
    return (
      <DropdownMenu.RadioItem className={styles.RadioItem} value={h.name} key={h.name}>
        <DropdownMenu.ItemIndicator className={styles.ItemIndicator}>
          <DotFilledIcon />
        </DropdownMenu.ItemIndicator>
        {h.name}
      </DropdownMenu.RadioItem>
    );
  });

  // 使用 useRef 获取父容器的引用
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <button>主题</button>
        </DropdownMenu.Trigger>

        {/* 直接使用父容器作为 portal 的挂载点 */}
        <DropdownMenu.Portal container={containerRef.current || undefined}>
          <DropdownMenu.Content className={styles.Content} sideOffset={5}>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className={styles.SubTrigger}>
                主题
                <div className={styles.RightSlot}>
                  <ChevronRightIcon />
                </div>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal container={containerRef.current || undefined}>
                <DropdownMenu.SubContent
                  className={styles.SubContent}
                  sideOffset={2}
                  alignOffset={-5}
                >
                  <DropdownMenu.RadioGroup value={theme} onValueChange={setTheme}>
                    {themes}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className={styles.SubTrigger}>
                代码高亮
                <div className={styles.RightSlot}>
                  <ChevronRightIcon />
                </div>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal container={containerRef.current || undefined}>
                <DropdownMenu.SubContent
                  className={styles.SubContent}
                  sideOffset={2}
                  alignOffset={-5}
                >
                  <DropdownMenu.RadioGroup value={highlight} onValueChange={setHighlight}>
                    {highlights}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};
