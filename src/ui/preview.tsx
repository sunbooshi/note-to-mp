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
import { NoteRender } from "./components/NoteRender";
import { PageLoading } from "./components/Loading";
import { RedBook } from "./components/RedBook";
import { DoubleArrowUpIcon, DoubleArrowDownIcon } from "@radix-ui/react-icons"
import { useEffect, useState } from "react";
import { requestAnnouncement, Announcement as IAnnouncement } from "src/weixin-api";
import { NMPSettings } from "src/settings";
import { Announcement } from "./components/Announcement";
import NoteToMpPlugin from "src/main";
import { matchesVersionRequirement } from "src/utils";

import styles from "./preview.module.css";


export function Preview() {
  const isReourceLoaded = usePluginStore.use.isReourceLoaded();
  const isCollapsed = usePluginStore.use.isCollapsed();
  const setIsCollapsed = usePluginStore.use.setIsCollapsed();
  const plugin = usePluginStore.use.plugin() as NoteToMpPlugin;

  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);

  useEffect(() => {
    if (isReourceLoaded) {
      requestAnnouncement().then((anns) => {
        if (Array.isArray(anns)) {
          const settings = NMPSettings.getInstance();
          const serverIds = anns.map(a => a.id);
          
          // Cleanup: Remove IDs that are no longer on the server to prevent bloat
          const validDismissed = settings.dismissedAnnouncements.filter(id => serverIds.includes(id));
          if (validDismissed.length !== settings.dismissedAnnouncements.length) {
            settings.dismissedAnnouncements = validDismissed;
            plugin.saveSettings();
          }

          const version = plugin.manifest.version;
          
          // 过滤已忽略的和不符合版本要求的公告
          const activeAnns = anns.filter(ann => 
            !settings.dismissedAnnouncements.includes(ann.id) &&
            matchesVersionRequirement(version, ann.target_version)
          );
          setAnnouncements(activeAnns);
        }
      });
    }
  }, [isReourceLoaded, plugin]);

  const handleDismiss = (id: string) => {
    const settings = NMPSettings.getInstance();
    if (!settings.dismissedAnnouncements.includes(id)) {
      settings.dismissedAnnouncements.push(id);
      plugin?.saveSettings();
      setAnnouncements(prev => prev.filter(ann => ann.id !== id));
    }
  };

  if (!isReourceLoaded) {
    return <PageLoading />;
  }

  return (
    <NotificationProvider>
      {announcements.map((ann) => (
        <Announcement 
          key={ann.id}
          announcement={ann} 
          onDismiss={() => handleDismiss(ann.id)} 
        />
      ))}
      <Tabs.Root defaultValue="wechat" className={styles.Root}>
        <Tabs.List className={styles.List} data-collapsed={isCollapsed}>
          <Tabs.Trigger className={styles.Trigger} value="wechat">公众号</Tabs.Trigger>
          <Tabs.Trigger className={styles.Trigger} value="zhihu">知乎</Tabs.Trigger>
          <Tabs.Trigger className={styles.Trigger} value="toutiao">头条</Tabs.Trigger>
          <Tabs.Trigger className={styles.Trigger} value="redbook">小红书</Tabs.Trigger>
          <div 
            className={styles.CollapseBtn} 
            data-floating={isCollapsed} 
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "展开" : "折叠"}
          >
            {isCollapsed ? <DoubleArrowDownIcon /> : <DoubleArrowUpIcon />}
          </div>
        </Tabs.List>
        <Tabs.Content value="wechat" forceMount className={styles.Content}>
          <Wechat />
        </Tabs.Content>
        <Tabs.Content value="zhihu" forceMount className={styles.Content}>
          <NoteRender platform="zhihu"/>
        </Tabs.Content>
        <Tabs.Content value="toutiao" forceMount className={styles.Content}>
          <NoteRender platform="toutiao"/>
        </Tabs.Content>
        <Tabs.Content value="redbook" forceMount className={styles.Content}>
          <RedBook />
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