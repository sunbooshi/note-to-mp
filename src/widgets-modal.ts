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

import { App, Modal, MarkdownView } from "obsidian";
import { uevent } from "./utils";

export class WidgetsModal extends Modal {
  listener: any = null;
  url: string = 'https://widgets.dualhue.cn';
  constructor(app: App) {
    super(app);
  }

  insertMarkdown(markdown: string) {
    const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) return;
    editor.replaceSelection(markdown);
    editor.exec("goRight");
    uevent('insert-widgets');
  }

  onOpen() {
    let { contentEl, modalEl } = this;
    modalEl.style.width = '640px';
    modalEl.style.height = '500px';
    const iframe = contentEl.createEl('iframe', {
      attr: {
        src: this.url,
        width: '100%',
        height: '100%',
        allow: 'clipboard-read; clipboard-write',
      },
    });

    iframe.style.border = 'none';

    this.listener = this.handleMessage.bind(this);
    window.addEventListener('message', this.listener);
    uevent('open-widgets');
  }

  handleMessage(event: MessageEvent) {
    if (event.origin === this.url) {
      const { type, data } = event.data;
      if (type === 'cmd') {
        this.insertMarkdown(data);
      }
    }
  }

  onClose() {
    if (this.listener) {
      window.removeEventListener('message', this.listener);
    }
    let { contentEl } = this;
    contentEl.empty();
  }
}