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
import { PageLoading } from "./components/Loading";
import { ArticleRender } from "src/article-render";
import { usePluginStore } from 'src/store/PluginStore';
import { NMPSettings } from "src/settings";

import styles from "./preview.module.css";

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

  const onCancel = () => {
    modal.close();
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

    for (let note of notes) {
      renderRef.current.getCSS(note, defaultTheme(), defaultHighlight()).then(res=>setCSSContent(res));
      renderRef.current.renderMarkdown(contentRef.current!, note);
    }

  }, [notes, isReourceLoaded, styleRef, contentRef]);


  if (!isReourceLoaded) {
    return <PageLoading />;
  }

  return (
    <div>
      <div className={styles.Header}>{message}</div>
      <div className={styles.Content}>
          <style ref={styleRef}>{cssContent}</style>
          <div ref={contentRef}></div>
      </div> 
      <div className={styles.Footer}>
        <button onClick={onCancel}>{buttonTitle}</button>
      </div>
    </div>
  );
}

export function createPubview(conatainer: HTMLElement, modal: Modal, notes: TFile[]) {
  const root = ReactDOM.createRoot(conatainer);
  root.render(<Pubview modal={modal} notes={notes} />);
  return root;
}