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

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, createRef } from "react";
import { Modal, TFile } from "obsidian";
import * as ReactDOM from 'react-dom/client';
import { PageLoading, LoadingOrb } from "./components/Loading";
import { ArticleRender } from "src/article-render";
import { usePluginStore } from 'src/store/PluginStore';
import { NMPSettings } from "src/settings";

import styles from "./pubview.module.css";

function defaultAppId() {
  const settings = NMPSettings.getInstance();
  return settings.wxInfo.length > 0 ? settings.wxInfo[0].appid : null;
}

function defaultTheme() {
  return NMPSettings.getInstance().defaultStyle;
}

function defaultHighlight() {
  return NMPSettings.getInstance().defaultHighlight;
}

export function Pubview({modal, notes}: {modal: Modal, notes: TFile[]}) {
  const app = usePluginStore(s=>s.app);
  const isReourceLoaded = usePluginStore(s=>s.isReourceLoaded);

  const styleRef = useRef<HTMLStyleElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const renderRef = useRef<ArticleRender>(new ArticleRender(app));

  const [buttonTitle, setButtonTitle] = useState("取消发布");
  const [message, setMessage] = useState('');
  const [cssContent, setCSSContent] = useState('');
  const [canceled, setCanceled] = useState(false);

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
    await renderRef.current.postArticle(defaultAppId()!, undefined, contentRef.current!, css);
    prepare(index+1);
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
    catch(error) {
      setMessage(note.basename + ' 渲染失败：' + error.message);
    }
  }

  useEffect(() => {
    if (!isReourceLoaded) return;
    if (!styleRef.current) return;
    if (!contentRef.current) return;

    const appid = defaultAppId();
    if (!appid) {
      setMessage('请先设置公众号');
      return;
    }
    if (notes.length == 0) {
      setMessage('没有需要发布的笔记');
      return;
    }
    prepare(0);
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
        <button onClick={onCancel}>取消发布</button>
      </div>
    </div>
  );
}

export function createPubview(conatainer: HTMLElement, modal: Modal, notes: TFile[]) {
  const root = ReactDOM.createRoot(conatainer);
  root.render(<Pubview modal={modal} notes={notes} />);
  return root;
}