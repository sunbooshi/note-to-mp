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
import { BaseRender } from 'src/base-render';

import styles from './Wechat.module.css';
import { NMPSettings } from 'src/settings';
import AssetsManager from 'src/assets';

export function NoteRender({platform}:{platform:string}) {
  const { notify } = useNotification();
  const app = usePluginStore((s) => s.app);
  const activeNote = useRenderStore.use.note();
  const renderVersion = useRenderStore.use.renderVersion();

  const contentRef = useRef<HTMLDivElement>(null);
  
  const renderRef = useRef<BaseRender>(new BaseRender(app));

  const [loading, setLoading] = useState(false);
  const cssContent = AssetsManager.getInstance().getTheme('obsidian-light')?.css.replace(/\.note-to-mp/g, '.note-to-mp-base');

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

  const gotoPlatform = () => {
    const { shell } = require('electron');
    let url = '';
    if (platform == 'zhihu') {
      url = 'https://zhuanlan.zhihu.com/write';
    }
    else if (platform == 'toutiao') {
      url = 'https://mp.toutiao.com/profile_v4/graphic/publish';
    }
    shell.openExternal(url);
    uevent('open-' + platform);
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
      if (NMPSettings.getInstance().isAuthKeyVaild()) {
        showMsg('复制成功，快去粘贴吧！');
      }
      else {
        showMsg('复制成功，快去粘贴吧！如需复制本地图片请购买会员，感谢支持！');
      }
    } catch (error) {
      setLoading(false);
      showErr('错误：' + error.message);
    }
  };

  let btnTitle = '';
    if (platform == 'zhihu') {
    btnTitle = '去知乎';
  }
  else if (platform == 'toutiao') {
    btnTitle = '去头条';
  } 

  return (
    <div className={styles.Root}>
      <div className={styles.Panel}>
        <div className={styles.PanelRight}>
          <button onClick={handleCopy}>复制</button>
          <button onClick={gotoPlatform}>{btnTitle}</button>
          <button onClick={handleRefresh}>刷新</button>
          <button onClick={onHelpClick}>帮助</button>
        </div>
      </div>
      <div className={styles.RenderWrapper}>
        <div className={styles.RenderRoot}>
          <style>{cssContent}</style>
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
