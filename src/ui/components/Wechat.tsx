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
import { Cover } from './Cover';
import AccountSelect from "./AccountSelect";
import ThemeList from './ThemeList';
import { useNotification } from './Notification';
import { ArticleRender } from 'src/article-render';
import { usePluginStore } from 'src/store/PluginStore';
import { useRenderStore } from 'src/store/RenderStore';
import { ConfigStore, createConfigStore, ConfigContext, useConfigContext } from 'src/store/ConfigStore'
import { uevent } from 'src/utils';
import { Loading } from './Loading';

import styles from './Wechat.module.css';
import { NMPSettings } from 'src/settings';
import { error } from 'console';

const WechatInternal: React.FC = () => {
  const { notify } = useNotification();
  const app = usePluginStore((s) => s.app);
  const activeNote = useRenderStore.use.note();
  const renderVersion = useRenderStore.use.renderVersion();

  const appid = useConfigContext(s=>s.appid);
  const cover = useConfigContext(s=>s.cover);
  const theme = useConfigContext(s=>s.theme);
  const highlight = useConfigContext(s=>s.highlight);

  const styleRef = useRef<HTMLStyleElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const renderRef = useRef<ArticleRender>(new ArticleRender(app));

  const [cssContent, setCSSContent] = useState('');
  const [loading, setLoading] = useState(false);

  const isMember = NMPSettings.getInstance().isAuthKeyVaild();

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

  useEffect(()=> {
    if (!activeNote) return;
    renderRef.current.getCSS(activeNote, theme, highlight).then(res=>setCSSContent(res)).catch(error=>{
      showErr('设置样式失败：' + error.message); 
    });
  }, [activeNote, theme, highlight]);

  const handleRefresh = async () => {
    if (!activeNote) return;
    setLoading(true);
    try {
      useRenderStore.getState().setRenderVersion();
      const res = await renderRef.current.getCSS(activeNote, theme, highlight);
      setCSSContent(res);
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

  const gotoMP = () => {
    const { shell } = require('electron');
    shell.openExternal('https://mp.weixin.qq.com')
    uevent('open-mp');
  }

  const handlePost = async () => {
    if (!appid) {
      showErr('请先选择一个公众号账号');
      return;
    }

    if (contentRef.current == null) {
      showErr('未初始化！');
      return;
    }

    try {
      setLoading(true);
      await renderRef.current.postArticle(appid, cover, contentRef.current!, cssContent);
      setLoading(false);
      showMsg('发布成功');
    }
    catch(error) {
      setLoading(false);
      showErr('发布失败:' + error.message);
    }
  };

  const handlePostImage = async () => {
    if (!appid) {
      showErr('请先选择一个公众号账号');
      return;
    }

    if (contentRef.current == null) {
      showErr('未初始化！');
      return;
    }

    try {
      setLoading(true);
      await renderRef.current.postImages(appid, contentRef.current!);
      setLoading(false);
      showMsg('发布成功');
    }
    catch(error) {
      setLoading(false);
      showErr('发布失败:' + error.message);
    }
  };

  const handleCopy = async () => {
    if (contentRef.current == null) {
      showErr('未初始化！');
      return;
    }
    try {
      setLoading(true);
      await renderRef.current.copyArticle(contentRef.current!, cssContent, appid);
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

    const handleExport = async () => {
    if (contentRef.current == null) {
      showErr('未初始化！');
      return;
    }

    try {
      setLoading(true);
      await renderRef.current.exportHTML(contentRef.current!, cssContent);
      setLoading(false);
      showMsg('导出成功');
    }
    catch(error) {
      setLoading(false);
      showErr('导出失败:' + error.message);
    }
  };

  return (
    <div className={styles.Root}>
      <div className={styles.Panel}>
        <Cover />
        <div className={styles.PanelRight}>
          <AccountSelect />
          <button onClick={gotoMP}>去公众号后台</button>
          <button onClick={handleRefresh}>刷新</button>
          <div style={{ flexBasis: '100%' }}></div>
          <button onClick={handlePost}>发至草稿箱</button>
          <button onClick={handlePostImage}>图片/文字</button>
          <button onClick={handleCopy}>复制</button>
          <ThemeList />
          { isMember ? 
            (<button onClick={handleExport}>导出</button>) :
            (<button onClick={onHelpClick}>帮助</button>)
          }
        </div>
      </div>
      <div className={styles.RenderWrapper}>
        <div className={styles.RenderRoot}>
          <style ref={styleRef}>{cssContent}</style>
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

// 保持 Wechat 组件作为 Provider 的包装器
export function Wechat() {
  const storeRef = useRef<ConfigStore>(null);
  if (!storeRef.current) {
    storeRef.current = createConfigStore();
  }

  return (
    <ConfigContext.Provider value={storeRef.current}>
      <WechatInternal />
    </ConfigContext.Provider>
  )
}