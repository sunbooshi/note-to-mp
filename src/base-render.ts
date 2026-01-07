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

import { App, Notice, sanitizeHTMLToDom, apiVersion, TFile, MarkdownRenderer, Component } from 'obsidian';
import { applyCSS } from './utils';
import { NMPSettings } from './settings';
import AssetsManager from './assets';
import { MDRendererCallback } from './markdown/extension';
import { MarkedParser } from './markdown/parser';
import { LocalImageManager, LocalFile } from './markdown/local-file';
import { debounce, removeFrontMatter } from './utils';
import { toPng } from 'html-to-image';


export class BaseRender implements MDRendererCallback {
  app: App;
  note: TFile | null = null;
  settings: NMPSettings;
  assetsManager: AssetsManager;
  articleHTML: string;
  title: string;
  markedParser: MarkedParser;
  cachedElements: Map<string, string> = new Map();
  imageManager: LocalImageManager;
  debouncedRenderMarkdown: (...args: any[]) => void;

  constructor(app: App) {
    this.app = app;
    this.settings = NMPSettings.getInstance();
    this.assetsManager = AssetsManager.getInstance();
    this.articleHTML = '';
    this.title = '';
    this.imageManager = new LocalImageManager();
    this.markedParser = new MarkedParser(app, this);
    this.debouncedRenderMarkdown = debounce(this.renderMarkdown.bind(this), 1000);
  }

  setArticle(container:HTMLElement, article: string) {
    container.empty();
    const html = `<section class="note-to-mp-base">${article}</section>`;
    const doc = sanitizeHTMLToDom(html);
    if (doc.firstChild) {
      container.appendChild(doc.firstChild);
    }
  }

  getArticleText(container: HTMLElement) {
    return container.innerText.trimStart();
  }

  errorContent(error: any) {
    return '<h1>渲染失败!</h1><br/>'
      + '如需帮助请前往&nbsp;&nbsp;<a href="https://github.com/sunbooshi/note-to-mp/issues">https://github.com/sunbooshi/note-to-mp/issues</a>&nbsp;&nbsp;反馈<br/><br/>'
      + '如果方便，请提供引发错误的完整Markdown内容。<br/><br/>'
      + '<br/>Obsidian版本：' + apiVersion
      + '<br/>错误信息：<br/>'
      + `${error}`;
  }

  async renderMarkdown(contianer:HTMLElement, af: TFile) {
    try {
      let md = '';
      if (af.extension.toLocaleLowerCase() === 'md') {
        md = await this.app.vault.cachedRead(af);
        this.title = af.basename;
      }
      else {
        md = '没有可渲染的笔记或文件不支持渲染';
      }
      md = removeFrontMatter(md);

      if (this.note && this.note.path !== af.path) {
        this.imageManager.cleanup();
      }

      this.note = af;

      this.articleHTML = await this.markedParser.parse(md, af);
      this.setArticle(contianer, this.articleHTML);
      await this.processCachedElements(contianer);
    }
    catch (e) {
      console.error(e);
      this.setArticle(contianer, this.errorContent(e));
    }
  }

  async copyWithoutCSS(container: HTMLElement) {
    await this.cachedElementsToImages(container);
    if (!this.settings.isAuthKeyVaild()) {
      const content = container.innerHTML;
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([content], { type: 'text/html' })
      })]);
      return;
    }

    await this.imageManager.uploadToOSS(container, this.settings.authKey, this.app.vault);

    const content = container.innerHTML;
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([content], { type: 'text/html' })
    })]);
  }

  async exportHTML(container: HTMLElement, css: string) {
    await this.cachedElementsToImages(container);
    const lm = this.imageManager;
    const content = await lm.embleImages(container, this.app.vault);
    const globalStyle = await this.assetsManager.getStyle();
    const html = applyCSS(content, css + globalStyle);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.title + '.html';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  async processCachedElements(root: HTMLElement) {
    const af = this.note;
    if (!af) {
      console.error('当前没有打开文件，无法处理缓存元素');
      return;
    }
    const component = new Component();
    component.load();
    for (const [key, value] of this.cachedElements) {
      const [category, id] = key.split(':');
      if (category === 'mermaid' || category === 'excalidraw') {
        const container = root.querySelector('#' + id) as HTMLElement;
        if (container) {
          await MarkdownRenderer.render(this.app, value, container, af.path, component);
        }
      }
    }
    component.unload();
  }

  async cachedElementsToImages(root: HTMLElement) {
    for (const [key, cached] of this.cachedElements) {
      const [category, elementId] = key.split(':');
      const container = root.querySelector(`#${elementId}`) as HTMLElement;
      if (!container) continue;

      if (category === 'mermaid') {
        await this.replaceMermaidWithImage(container, elementId);
      } else if (category === 'excalidraw') {
        await this.replaceExcalidrawWithImage(container, elementId);
      }
    }
  }

  private async replaceMermaidWithImage(container: HTMLElement, id: string) {
    const mermaidContainer = container.querySelector('.mermaid') as HTMLElement;
    if (!mermaidContainer || !mermaidContainer.children.length) return;

    const svg = mermaidContainer.querySelector('svg');
    if (!svg) return;

    try {
      const pngDataUrl = await toPng(mermaidContainer.firstElementChild as HTMLElement, { pixelRatio: 2, style: { margin: "0"} });
      const img = document.createElement('img');
      img.id = `img-${id}`;
      img.src = pngDataUrl;
      img.style.width = `${svg.clientWidth}px`;
      img.style.height = 'auto';

      container.replaceChild(img, mermaidContainer);
    } catch (error) {
      console.warn(`Failed to render Mermaid diagram: ${id}`, error);
    }
  }

  private async replaceExcalidrawWithImage(container: HTMLElement, id: string) {
    const innerDiv = container.querySelector('div') as HTMLElement;
    if (!innerDiv) return;

    if (NMPSettings.getInstance().excalidrawToPNG) {
      const originalImg = container.querySelector('img') as HTMLImageElement;
      if (!originalImg) return;

      const style = originalImg.getAttribute('style') || '';
      try {
        const pngDataUrl = await toPng(originalImg, { pixelRatio: 2, style: { margin: "0"} });

        const img = document.createElement('img');
        img.id = `img-${id}`;
        img.src = pngDataUrl;
        img.setAttribute('style', style);

        container.replaceChild(img, container.firstChild!);
      } catch (error) {
        console.warn(`Failed to render Excalidraw image: ${id}`, error);
      }
    } else {
      const svg = await LocalFile.renderExcalidraw(innerDiv.innerHTML);
      this.updateElementByID(container, id, svg);
    }
  }

  updateElementByID(container:HTMLElement, id: string, html: string): void {
    const item = container.querySelector('#' + id) as HTMLElement;
    if (!item) return;
    const doc = sanitizeHTMLToDom(html);
    item.empty();
    if (doc.childElementCount > 0) {
      for (const child of doc.children) {
        item.appendChild(child.cloneNode(true)); // 使用 cloneNode 复制节点以避免移动它
      }
    }
    else {
      item.innerText = '渲染失败';
    }
  }

  cacheElement(category: string, id: string, data: string): void {
    const key = category + ':' + id;
    this.cachedElements.set(key, data);
  }

  cacheImage(resUrl: string, filePath: string): void {
    const info = {
      resUrl: resUrl,
      filePath: filePath,
      media_id: null,
      url: null,
      id: this.imageManager.getImageId(),
    };
    this.imageManager.setImage(resUrl, info);
  }

  isWechat(): boolean {
    return false;
  }
}