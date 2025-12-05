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

import * as Tabs from "@radix-ui/react-tabs";
import * as ReactDOM from 'react-dom/client';
import { NotificationProvider } from "./components/Notification";
import { usePluginStore } from "src/store/PluginStore";
import { Wechat } from "./components/Wechat";
import { PageLoading } from "./components/Loading";

import styles from "./preview.module.css";

export function Preview() {
  const isReourceLoaded = usePluginStore.use.isReourceLoaded();

  if (!isReourceLoaded) {
    return <PageLoading />;
  }

  return (
    <NotificationProvider>
      <Tabs.Root defaultValue="wechat" className={styles.Root}>
        <Tabs.List className={styles.List}>
          <Tabs.Trigger className={styles.Trigger} value="wechat">公众号</Tabs.Trigger>
          <Tabs.Trigger className={styles.Trigger} value="zhihu">知乎</Tabs.Trigger>
          <Tabs.Trigger className={styles.Trigger} value="toutiao">头条</Tabs.Trigger>
          <Tabs.Trigger className={styles.Trigger} value="redbook">小红书</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="wechat" className={styles.Content}>
          <Wechat />
        </Tabs.Content>
        <Tabs.Content value="zhihu" className={styles.Content}>
          Hello, Zhihu!
        </Tabs.Content>
        <Tabs.Content value="toutiao" className={styles.Content}>
          Toutiao
        </Tabs.Content>
        <Tabs.Content value="redbook" className={styles.Content}>
          redbook
        </Tabs.Content>
      </Tabs.Root>
    </NotificationProvider>
  );
}

export function createPreview(conatainer: HTMLElement) {
  const root = ReactDOM.createRoot(conatainer);
  root.render(<Preview />);
  return root;
}