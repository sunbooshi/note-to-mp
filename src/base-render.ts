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
import { applyCSS } from './core/csstools';
import { NMPSettings } from './settings';
import AssetsManager from './assets';
import { MDRendererCallback } from './core/markdown/extension';
import { MarkedParser } from './core/markdown/parser';
import { LocalImageManager, LocalFile } from './core/markdown/local-file';
import { debounce, removeFrontMatter } from './utils';
import { getMetadata } from './weixin-api';
import { toPng } from 'html-to-image';
import { ImageToShot } from './imagelib';


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
    const base = container.getElementsByClassName('note-to-mp-base');
    let content = base.length == 0 ? container.innerHTML : base[0].innerHTML;

    if (!this.settings.isAuthKeyVaild()) {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([content], { type: 'text/html' })
      })]);
      return;
    }

    await this.imageManager.uploadToOSS(container, this.settings.authKey, this.app.vault);

    content = base.length == 0 ? container.innerHTML : base[0].innerHTML;
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([content], { type: 'text/html' })
    })]);
  }

  async exportHTML(container: HTMLElement, css: string) {
    await this.cachedElementsToImages(container);
    const lm = this.imageManager;
    const content = await lm.embleImages(container, this.app.vault);
    const html = applyCSS(content, css);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.title + '.html';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  async copyHTML(container: HTMLElement) {
    await this.cachedElementsToImages(container);
    const base = container.getElementsByClassName('note-to-mp-base');
    const root = base.length == 0 ? container : base[0] as HTMLElement;
    const lm = this.imageManager;
    const content = await lm.embleImages(root, this.app.vault);
    const blob = new Blob([content], { type: 'text/html' });

    await navigator.clipboard.write([new ClipboardItem({
      'text/html': blob
    })]);
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

    const metadata = getMetadata(this.app, this.note!);
    
    if (this.settings.extraSettings
        && this.settings.extraSettings.imageFrame
        && !metadata.disable_image_background
        && this.settings.isAuthKeyVaild()) {
      const img = root.querySelectorAll('img');
      img.forEach((img) => {
        if (img.getAttribute('data-source') !== 'note') return;
        if (img.closest('shot-render')) return;
        const shotRender = ImageToShot(img);
        if (shotRender) {
          img.replaceWith(shotRender);
        }
      });
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

    // 处理shot-render
    const shotRenders = root.querySelectorAll('shot-render');
    for (const shotRender of shotRenders) {
      await this.replaceShotRenderWithImage(root, shotRender as HTMLElement);
    }
  }

  private async replaceShotRenderWithImage(container: HTMLElement, shotRender: HTMLElement) {
    // 复制节点并创建一个临时隐藏容器
    const clone = shotRender.cloneNode(true) as HTMLElement;
    const tempContainer = document.createElement('div');
    
    // 必须将容器加入 DOM 才能正确测量和渲染，设置为 fixed 且移出视口
    // 注意：不能使用 visibility: hidden，否则 toPng 可能会渲染出空白图片
    tempContainer.style.cssText = `
      position: fixed;
      left: -10000px;
      top: 0;
      width: 1280px;
      height: auto;
      z-index: -1;
    `;
    
    document.body.appendChild(tempContainer);
    tempContainer.appendChild(clone);

    // 设置克隆节点的样式，限制最大宽度为 1280px
    clone.style.maxWidth = '1280px';
    clone.style.width = 'fit-content';
    clone.style.margin = '0';
    clone.style.display = 'block';

    try {
      // 等待 Web Component 内部渲染完成（主要是 Shadow DOM 内容）
      await new Promise(resolve => setTimeout(resolve, 200));

      // 等待内部图片加载完成
      const images = Array.from(clone.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        if ((img as HTMLImageElement).complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const width = clone.offsetWidth;
      const height = clone.offsetHeight;

      if (width === 0 || height === 0) {
        console.warn('shot-render clone has 0 size');
        return;
      }

      const pngDataUrl = await toPng(clone, { 
        width: width,
        height: height,
        pixelRatio: 1, 
        cacheBust: false, 
        skipFonts: true,
        style: {
          margin: '0',
          maxWidth: '1280px',
        }
      });

      if (pngDataUrl && pngDataUrl.length > 100) {
        const img = document.createElement('img');
        img.src = pngDataUrl;

        const imgId = shotRender.getAttribute('data-img-id');
        if (imgId) {
          img.setAttribute('data-img-id', imgId);
        }

        const style = shotRender.getAttribute('style');
        if (style) {
          img.setAttribute('style', style);
        }

        shotRender.replaceWith(img);
      }
    } catch (error) {
      console.warn('Failed to render shot-render clone:', error);
    } finally {
      // 移除临时容器
      document.body.removeChild(tempContainer);
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