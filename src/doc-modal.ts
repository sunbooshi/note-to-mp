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

import { App, Modal, sanitizeHTMLToDom } from "obsidian";

export class DocModal extends Modal {
  url: string = '';
  title: string = '提示';
  content: string = '';

  constructor(app: App, title: string = "提示", content: string = "", url: string = "") {
    super(app);
    this.title = title;
    this.content = content;
    this.url = url;
  }

  onOpen() {
    let { contentEl, modalEl } = this;
    modalEl.style.width = '640px';
    modalEl.style.height = '720px';
    contentEl.style.display = 'flex';
    contentEl.style.flexDirection = 'column';

    const titleEl = contentEl.createEl('h2', { text: this.title });
    titleEl.style.marginTop = '0.5em';
    const content = contentEl.createEl('div');
    content.setAttr('style', 'margin-bottom:1em;-webkit-user-select: text; user-select: text;');
    content.appendChild(sanitizeHTMLToDom(this.content));

    const iframe = contentEl.createEl('iframe', {
      attr: {
        src: this.url,
        width: '100%',
        allow: 'clipboard-read; clipboard-write',
      },
    });

    iframe.style.flex = '1';
  }

  onClose() {

    let { contentEl } = this;
    contentEl.empty();
  }
}