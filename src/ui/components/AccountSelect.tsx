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
import * as Select from "@radix-ui/react-select";
import classnames from "classnames";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import { NMPSettings } from "src/settings";
import { useConfigContext } from "src/store/ConfigStore";
import styles from "./AccountSelect.module.css";

function AccountSelect({ disabled = false }: { disabled?: boolean }) {
  const setAppId = useConfigContext((s)=>s.setAppId);
  const defaultAccount = useConfigContext((s)=>s.appid) || '';
  const settings = NMPSettings.getInstance();
  const accounts = !settings.wxInfo ? [] : settings.wxInfo.map((account) => {
    return (
      <SelectItem value={account.appid} key={account.appid}>{account.name}</SelectItem>
    );
  });

  // 使用 useRef 获取父容器的引用
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <Select.Root defaultValue={defaultAccount} onValueChange={setAppId} disabled={disabled}>
        <Select.Trigger className={styles.Trigger} disabled={disabled}>
          <Select.Value placeholder="请在设置添加公众号" />
          <Select.Icon className={styles.Icon}>
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>
        {/* 直接使用父容器作为 portal 的挂载点 */}
        <Select.Portal container={containerRef.current || undefined}>
          <Select.Content 
            className={styles.Content} 
            position="popper" 
            sideOffset={5}
          >
            <Select.ScrollUpButton className={styles.ScrollButton}>
              <ChevronUpIcon />
            </Select.ScrollUpButton>
            <Select.Viewport className={styles.Viewport}>
              <Select.Group>
                <Select.Label className={styles.Label}>公众号</Select.Label>
                {accounts}
              </Select.Group>
            </Select.Viewport>
            <Select.ScrollDownButton className={styles.ScrollButton}>
              <ChevronDownIcon />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

const SelectItem = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string; value: string;[key: string]: any }
>(({ children, className, value, ...props }, forwardedRef) => {
  return (
    <Select.Item
      className={classnames(styles.Item, className)}
      value={value}
      {...props}
      ref={forwardedRef}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className={styles.ItemIndicator}>
        <CheckIcon />
      </Select.ItemIndicator>
    </Select.Item>
  );
});

export default AccountSelect;
