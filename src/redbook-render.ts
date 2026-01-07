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

import { App, TFile } from 'obsidian';
import { BaseRender } from './base-render';
import { MDRendererCallback } from './markdown/extension';
import { RedBookParser } from './markdown/redbook-parser';

export class RedBookRender extends BaseRender implements MDRendererCallback {
  redBookParser: RedBookParser;

  constructor(app: App) {
    super(app);
    this.redBookParser = new RedBookParser(app, this);
  }

  setArticle(container: HTMLElement, article: string) {
    container.empty();
    // For Xiaohongshu, we want plain text without HTML wrapper
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-word';
    pre.textContent = article;
    container.appendChild(pre);
  }

  async renderMarkdown(container: HTMLElement, af: TFile) {
    try {
      let md = '';
      if (af.extension.toLocaleLowerCase() === 'md') {
        md = await this.app.vault.cachedRead(af);
        this.title = af.basename;
      } else {
        md = '没有可渲染的笔记或文件不支持渲染';
      }

      this.note = af;
      
      this.articleHTML = await this.redBookParser.parse(md);
      this.setArticle(container, this.articleHTML);
      await this.processCachedElements(container);
    } catch (e) {
      console.error(e);
      this.setArticle(container, this.errorContent(e));
    }
  }

  // Override to provide plain text for clipboard instead of HTML
  async copyWithoutCSS(container: HTMLElement) {
    const text = this.getArticleText(container);
    
    // For Xiaohongshu, we copy plain text to clipboard
    await navigator.clipboard.writeText(text);
  }

  getArticleText(container: HTMLElement) {
    // For Xiaohongshu, we return the plain text content
    const pre = container.querySelector('pre');
    return pre ? pre.textContent || '' : container.innerText.trimStart();
  }

  isWechat(): boolean {
    return false;
  }
}