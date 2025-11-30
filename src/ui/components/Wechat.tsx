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
import { WechatContextProvider, useWechatContext } from '../context/WechatContext';
import { useNotification } from './Notification';
import { RenderContainer, RenderContainerRef } from './RenderContainer'; // 导入新组件
import { ArticleRender } from '../../article-render'; // 导入 ArticleRender
import { useObsidian } from '../context/ObsidianContext'; // 需要 app 和 settings
import { uevent } from 'src/utils';

import styles from './Wechat.module.css';

// 内部组件，以便能访问 WechatContext
const WechatInternal: React.FC = () => {
  const { notify } = useNotification();
  const { app, itemView, activeFile, renderVersion } = useObsidian(); // 从 Context 获取状态
  const { selectedAccount, theme, highlight } = useWechatContext();
  const renderContainerRef = useRef<RenderContainerRef>(null);
  const [articleRender, setArticleRender] = useState<ArticleRender | null>(null);

  // 初始化 ArticleRender
  useEffect(() => {
    if (app && itemView && renderContainerRef.current?.styleEl && renderContainerRef.current?.contentEl) {
      const renderer = new ArticleRender(
        app,
        itemView,
        renderContainerRef.current.styleEl,
        renderContainerRef.current.contentEl
      );
      setArticleRender(renderer);
    }
  }, [app, itemView]); // 依赖 app 和 settings

  // 渲染逻辑现在依赖于 renderVersion 和主题/高亮的变化
  useEffect(() => {
    const render = async () => {
      if (!articleRender || !activeFile) {
        if (!activeFile) {
            notify({ type: 'error', title: '没有活动的 Markdown 文件' });
        }
        return;
      }
      
      console.log(`Rendering due to version change: ${renderVersion}`);
      await articleRender.updateStyle(theme);
      await articleRender.updateHighLight(highlight);
      await articleRender.renderMarkdown(activeFile);
      notify({ type: 'success', title: '渲染完成' });
    };

    render();
  }, [articleRender, activeFile, renderVersion, theme, highlight]); // 依赖 renderVersion！

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

  const handleRefresh = () => {
    // 触发重新渲染
    if (articleRender) {
      const activeFile = app.workspace.getActiveFile();
      if (activeFile && activeFile.extension === 'md') {
        app.vault.cachedRead(activeFile).then(md => {
          articleRender.renderMarkdown(activeFile);
          notify({ type: 'success', title: '刷新成功' });
        });
      }
    }
  };

  const handlePost = async () => {
    if (!selectedAccount) {
      notify({ type: 'error', title: '请先选择一个公众号账号' });
      return;
    }
    try {
      await articleRender?.postArticle(selectedAccount.appid);
      notify({ type: 'success', title: '文章已成功发布到草稿箱' });
    } catch (error) {
      notify({ type: 'error', title: '发布文章失败', description: String(error) });
    }
  }

  const handlePostImage = async () => {
    if (!selectedAccount) {
      notify({ type: 'error', title: '请先选择一个公众号账号' });
      return;
    }
    try {
      await articleRender?.postImages(selectedAccount.appid);
      notify({ type: 'success', title: '成功发布到草稿箱' });
    } catch (error) {
      notify({ type: 'error', title: '发布失败', description: String(error) });
    }
  }

  const handleCopy = () => {
    if (renderContainerRef.current?.contentEl) {
      articleRender?.copyArticle().then(() => {
        notify({ type: 'success', title: '内容已复制到剪贴板' });
      });
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
          <button onClick={onHelpClick}>帮助</button>
        </div>
      </div>
      {/* Wrap RenderContainer in a dedicated div for robust height control */}
      <div className={styles.RenderWrapper}>
        <RenderContainer ref={renderContainerRef} /> 
      </div>
    </div>
  );
};

// 保持 Wechat 组件作为 Provider 的包装器
export function Wechat() {
  return (
    <WechatContextProvider>
      {/* ObsidianContext 也应该在上层提供 */}
      <WechatInternal />
    </WechatContextProvider>
  );
}