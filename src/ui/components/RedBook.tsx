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

import { useRef, useEffect, useState } from 'react';
import { useNotification } from './Notification';
import { usePluginStore } from 'src/store/PluginStore';
import { useRenderStore } from 'src/store/RenderStore';
import { uevent } from 'src/utils';
import { Loading } from './Loading';
import { RedBookRender } from 'src/redbook-render';

import styles from './Wechat.module.css';

export function RedBook() {
  const { notify } = useNotification();
  const app = usePluginStore((s) => s.app);
  const activeNote = useRenderStore.use.note();
  const renderVersion = useRenderStore.use.renderVersion();

  const contentRef = useRef<HTMLDivElement>(null);
  
  const renderRef = useRef<RedBookRender>(new RedBookRender(app));

  const [loading, setLoading] = useState(false);

  const showMsg = (msg: string) => {
    notify({type: 'success', title: msg});
  };

  const showErr = (msg: string) => {
    notify({type: 'error', title: msg});
  };

  useEffect(()=>{
    if (!contentRef.current) return;
    if (!activeNote) return;

    renderRef.current.renderMarkdown(contentRef.current, activeNote).catch(error=>{
      showErr('渲染失败：' + error.message);
    });
  }, [activeNote, renderVersion, contentRef]);

  const handleRefresh = async () => {
    if (!activeNote) return;
    setLoading(true);
    try {
      useRenderStore.getState().setRenderVersion();
      setLoading(false);
      showMsg('刷新成功');
    } catch (error) {
      setLoading(false); 
      showErr('失败：' + error.message);
    }
  };
  
  const onHelpClick = () => {
    const { shell } = require('electron');
    shell.openExternal('https://sunboshi.tech/doc')
    uevent('open-help');
  };

  const gotoRedBook = () => {
    const { shell } = require('electron');
    const url = 'https://creator.xiaohongshu.com/';
    shell.openExternal(url);
    uevent('open-redbook');
  }

  const handleCopy = async () => {
    if (contentRef.current == null) {
      showErr('未初始化！');
      return;
    }
    try {
      setLoading(true);
      await renderRef.current.copyWithoutCSS(contentRef.current!);
      setLoading(false);
      showMsg('复制成功，快去小红书粘贴吧！');
    } catch (error) {
      setLoading(false);
      showErr('错误：' + error.message);
    }
  };

  return (
    <div className={styles.Root}>
      <div className={styles.Panel}>
        <div className={styles.PanelRight}>
          <button onClick={handleCopy}>复制</button>
          <button onClick={gotoRedBook}>去小红书</button>
          <button onClick={handleRefresh}>刷新</button>
          <button onClick={onHelpClick}>帮助</button>
        </div>
      </div>
      <div className={styles.RenderWrapper}>
        <div className={styles.RenderRoot}>
          <div ref={contentRef}></div>
        </div>
      </div>
      {loading ? ( 
        <div className={styles.Loading}>
          <div className={styles.LoadingWrapper}>
            <Loading />
          </div>
        </div>
        ) : (<></>)}
    </div>
  );
};