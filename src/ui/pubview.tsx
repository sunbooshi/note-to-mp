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

import { useEffect, useRef, useState } from "react";
import { Modal, TFile } from "obsidian";
import * as ReactDOM from 'react-dom/client';
import { ArticleRender } from "src/article-render";
import { usePluginStore } from 'src/store/PluginStore';
import { NMPSettings } from "src/settings";
import { DraftArticle, wxAddDrafts } from "src/weixin-api";
import { PageLoading, LoadingOrb } from "./components/Loading";
import NoteList, { NoteItem, NoteItemStatus } from './components/NoteList';
import { BellIcon } from "@radix-ui/react-icons"
import { ConfigStore, createConfigStore, ConfigContext, useConfigContext } from 'src/store/ConfigStore'
import AccountSelect from "src/ui/components/AccountSelect";

import styles from "./pubview.module.css";

function defaultTheme() {
  return NMPSettings.getInstance().defaultStyle;
}

function defaultHighlight() {
  return NMPSettings.getInstance().defaultHighlight;
}

export function Pubview({ modal, notes }: { modal: Modal, notes: TFile[] }) {
  const app = usePluginStore(s => s.app);
  const isReourceLoaded = usePluginStore(s => s.isReourceLoaded);
  const appid = useConfigContext(s=>s.appid);

  const styleRef = useRef<HTMLStyleElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const renderRef = useRef<ArticleRender>(new ArticleRender(app));

  const [message, setMessage] = useState('');
  const [cssContent, setCSSContent] = useState('');
  const [canceled, setCanceled] = useState(false);
  const [disableSelect, setDisableSelect] = useState(false);

  const onCancel = () => {
    setCanceled(true);
    modal.close();
  }

  const renderNote = async (note: TFile) => {
    const noteCSS = await renderRef.current.getCSS(note, defaultTheme(), defaultHighlight());
    setCSSContent(noteCSS);
    if (!contentRef.current) return '';
    await renderRef.current.renderMarkdown(contentRef.current!, note);
    return noteCSS;
  };

  const pubNote = async (index: number, css: string) => {
    if (canceled) {
      setMessage('发布已取消!');
      setTimeout(() => {
        modal.close();
      }, 2000);
      return;
    }
    if (!contentRef.current) return;
    const note = notes[index];
    setMessage('发布中：' + note.basename);
    await renderRef.current.postArticle(appid!, undefined, contentRef.current!, css);
    prepare(index + 1);
  };

  const prepare = async (index: number) => {
    if (canceled) {
      setMessage('发布已取消!');
      setTimeout(() => {
        modal.close();
      }, 2000);
      return;
    }
    if (index >= notes.length) {
      setMessage('发布完成!');
      setTimeout(() => {
        modal.close();
      }, 2000);
      return;
    }
    const note = notes[index];
    try {
      setMessage('即将发布：' + note.basename);
      contentRef.current?.empty();
      const css = await renderNote(note);
      setTimeout(() => {
        pubNote(index, css);
      }, 5000);
    }
    catch (error) {
      setMessage(note.basename + ' 渲染失败：' + error.message);
    }
  }

  useEffect(() => {
    if (!isReourceLoaded) return;
    if (!styleRef.current) return;
    if (!contentRef.current) return;

    if (!appid) {
      setMessage('请先设置公众号');
      return;
    }
    if (notes.length == 0) {
      setMessage('没有需要发布的笔记');
      return;
    }
    
    // 实现10秒倒计时
    let countdown = 10;
    setMessage(`发布准备中！${countdown}s`);
    
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        setMessage(`发布准备中！${countdown}s`);
      } else {
        clearInterval(countdownInterval);
        setDisableSelect(true);
        prepare(0);
      }
    }, 1000);

    // 清理函数，组件卸载时清除定时器
    return () => {
      clearInterval(countdownInterval);
    };
  }, [notes, isReourceLoaded, styleRef, contentRef]);


  if (!isReourceLoaded) {
    return <PageLoading />;
  }

  return (
    <div>
      <div className={styles.Header}>
        <LoadingOrb></LoadingOrb>
        <div className={styles.Message}>{message}</div>
      </div>
      <div className={styles.Content}>
        <style ref={styleRef}>{cssContent}</style>
        <div ref={contentRef}></div>
      </div>
      <div className={styles.Footer}>
        <AccountSelect disabled={disableSelect} />
        <button onClick={onCancel}>取消发布</button>
      </div>
    </div>
  );
}

function MergePubview({ modal, notes }: { modal: Modal, notes: TFile[] }) {
  const app = usePluginStore(s => s.app);
  const isReourceLoaded = usePluginStore(s => s.isReourceLoaded);

  const appid = useConfigContext(s=>s.appid);
  const styleRef = useRef<HTMLStyleElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const renderRef = useRef<ArticleRender>(new ArticleRender(app));
  const articlesRef = useRef<DraftArticle[]>([]);

  const [message, setMessage] = useState('拖动笔记可以调整顺序');
  const [cssContent, setCSSContent] = useState('');
  const [canceled, setCanceled] = useState(false);
  const [disableDrag, setDisabeDrag] = useState(false);
  const [disableSelect, setDisableSelect] = useState(false);

  const [noteItems, setNoteItems] = useState<NoteItem[]>(
    notes.map(n => {
      return {
        note: n,
        id: n.basename,
        title: n.basename,
        status: NoteItemStatus.Init,
      }
    })
  );

  const onCancel = () => {
    setCanceled(true);
    modal.close();
  }

  const onPublish = () => {
    if (!isReourceLoaded || !styleRef.current || !contentRef.current) {
      setMessage('请等待初始化完成！')
      return;
    }

    if (!appid) {
      setMessage('请先设置公众号');
      return;
    }
    if (notes.length == 0) {
      setMessage('没有需要发布的笔记');
      return;
    }

    setDisabeDrag(true);
    setDisableSelect(true);
    articlesRef.current = [];
    prepare(0);
  }

  const updateItemStatus = (index: number, status: NoteItemStatus) => {
    setNoteItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, status } : item
      )
    );
  }

  const renderNote = async (note: TFile) => {
    const noteCSS = await renderRef.current.getCSS(note, defaultTheme(), defaultHighlight());
    setCSSContent(noteCSS);
    if (!contentRef.current) return '';
    await renderRef.current.renderMarkdown(contentRef.current!, note);
    return noteCSS;
  };

  const prepareNote = async (index: number, css: string) => {
    if (canceled) {
      setMessage('发布已取消!');
      setTimeout(() => {
        modal.close();
      }, 2000);
      return;
    }
    if (!contentRef.current) return;
    const { token, metadata } = await renderRef.current.prepareArticle(appid!, undefined, contentRef.current!, css);
    articlesRef.current.push(metadata);
    if (index + 1 == notes.length) {
      await publish(token)
      updateItemStatus(index, NoteItemStatus.Done)
    }
    else {
      updateItemStatus(index, NoteItemStatus.Done)
    }
    prepare(index + 1);
  };

  const publish = async (token: string) => {
    const res = await wxAddDrafts(token, articlesRef.current);

    if (res.status != 200) {
      console.error(res.text);
      setMessage(`创建草稿失败, https状态码: ${res.status} 可能是文章包含异常内容，请尝试手动复制到公众号编辑器！`);
    }
    setDisabeDrag(false);
    setMessage('发布成功！');
    setTimeout(() => {
      modal.close();
    }, 2000);
  }

  const prepare = async (index: number) => {
    if (canceled) {
      setMessage('发布已取消!');
      setTimeout(() => {
        modal.close();
      }, 2000);
      return;
    }
    if (index >= noteItems.length) {
      setMessage('发布完成!');
      setTimeout(() => {
        modal.close();
      }, 2000);
      return;
    }
    const noteItem = noteItems[index];
    try {
      contentRef.current?.empty();
      updateItemStatus(index, NoteItemStatus.Rendering);
      const css = await renderNote(noteItem.note);
      setTimeout(() => {
        prepareNote(index, css);
      }, 5000);
    }
    catch (error) {
      setMessage(noteItem.note.basename + ' 渲染失败：' + error.message);
    }
  }

  if (!isReourceLoaded) {
    return <PageLoading />;
  }

  return (
    <div>
      <div className={styles.Header}>
        <div className={styles.Message}>{message}</div>
      </div>
      <div className={styles.List}>
        <NoteList items={noteItems} setItems={setNoteItems} disable={disableDrag} />
      </div>
      <div className={styles.Content}>
        <style ref={styleRef}>{cssContent}</style>
        <div ref={contentRef}></div>
      </div>
      <div className={styles.Footer}>
        <div className={styles.Tips}><BellIcon style={{ marginRight: 5 }} /><span>最多8篇笔记</span></div>
        <AccountSelect disabled={disableSelect} />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={onPublish} style={{ width: 80 }}>发布</button>
          <div style={{ width: 20 }}></div>
          <button onClick={onCancel} style={{ width: 80 }}>取消</button>
        </div>
      </div>
    </div>
  );
}

function PubContent({ modal, notes }: { modal: Modal, notes: TFile[] }) {
  const storeRef = useRef<ConfigStore>(null);
  if (!storeRef.current) {
    storeRef.current = createConfigStore();
  }
  return (
    <ConfigContext.Provider value={storeRef.current}>
      <Pubview modal={modal} notes={notes} />
    </ConfigContext.Provider>
  );
}

function MergeContent({ modal, notes }: { modal: Modal, notes: TFile[] }) {
  const storeRef = useRef<ConfigStore>(null);
  if (!storeRef.current) {
    storeRef.current = createConfigStore();
  }
  return (
    <ConfigContext.Provider value={storeRef.current}>
      <MergePubview modal={modal} notes={notes} />
    </ConfigContext.Provider>
  );
}

export function createPubview(conatainer: HTMLElement, modal: Modal, notes: TFile[]) {
  const root = ReactDOM.createRoot(conatainer);
  root.render(<PubContent modal={modal} notes={notes} />);
  return root;
}

export function createMergePubview(conatainer: HTMLElement, modal: Modal, notes: TFile[]) {
  const root = ReactDOM.createRoot(conatainer);
  root.render(<MergeContent modal={modal} notes={notes} />);
  return root;
}