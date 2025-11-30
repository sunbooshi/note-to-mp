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

import * as React from "react";
import { DropdownMenu } from "radix-ui";
import {
	DotFilledIcon,
	ChevronRightIcon,
} from "@radix-ui/react-icons";
import AssetsManager from "src/assets";
import { NMPSettings } from "src/settings";
import { useWechatContext } from "../context/WechatContext";
import styles from "./ThemeList.module.css";

export default function ThemeList() {
  const settings = NMPSettings.getInstance();
	const [curTheme, setCurTheme] = React.useState(settings.defaultStyle);
  const [curHighlight, setCurHighlight] = React.useState(settings.defaultHighlight);
  const { setTheme, setHighlight } = useWechatContext();

  const mananger = AssetsManager.getInstance();

  const onThemeChange = (themeClassName: string) => {
    setCurTheme(themeClassName);
    setTheme(themeClassName);
  }
  
  const themes = mananger.themes === undefined ? [] : mananger.themes.map(t => {
    return (
      <DropdownMenu.RadioItem className={styles.RadioItem} value={t.className} key={t.className}>
        <DropdownMenu.ItemIndicator className={styles.ItemIndicator}>
          <DotFilledIcon />
        </DropdownMenu.ItemIndicator>
        {t.name}
      </DropdownMenu.RadioItem>
    );
  });

  const highlights = mananger.highlights === undefined ? [] : mananger.highlights.map(h => {
    return (
      <DropdownMenu.RadioItem className={styles.RadioItem} value={h.name} key={h.name}>
        <DropdownMenu.ItemIndicator className={styles.ItemIndicator}>
          <DotFilledIcon />
        </DropdownMenu.ItemIndicator>
        {h.name}
      </DropdownMenu.RadioItem>
    );
  });


	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button>主题</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content className={styles.Content} sideOffset={5}>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger className={styles.SubTrigger}>
							主题
							<div className={styles.RightSlot}>
								<ChevronRightIcon />
							</div>
						</DropdownMenu.SubTrigger>
						<DropdownMenu.Portal>
							<DropdownMenu.SubContent
								className={styles.SubContent}
								sideOffset={2}
								alignOffset={-5}
							>
                <DropdownMenu.RadioGroup value={curTheme} onValueChange={onThemeChange}>
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
						<DropdownMenu.Portal>
							<DropdownMenu.SubContent
								className={styles.SubContent}
								sideOffset={2}
								alignOffset={-5}
							>
                <DropdownMenu.RadioGroup value={curHighlight} onValueChange={setCurHighlight}>
                  {highlights}
                </DropdownMenu.RadioGroup>
							</DropdownMenu.SubContent>
						</DropdownMenu.Portal>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
};
