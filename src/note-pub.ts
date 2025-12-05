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

import { App, Modal, TFolder, TFile } from "obsidian";
import { createPubview } from "./ui/pubview";
import * as ReactDOM from 'react-dom/client';

export class NotePubModal extends Modal {
  pubview: ReactDOM.Root | null = null;
  folder?: TFolder;
  note?: TFile;

  constructor(app: App, folder?: TFolder, note?: TFile) {
    super(app);
    this.folder = folder;
    this.note = note;
  }

  onOpen() {
    console.log(this);
    let { contentEl } = this;
    const notes: TFile[] = [];
    if (this.folder) {
      this.folder.children.forEach((child) => {
        if (child instanceof TFile && child.extension === "md") {
          notes.push(child);
        }
      });
    }
    else if (this.note) {
      notes.push(this.note);
    }
    this.pubview = createPubview(contentEl, this, notes);
  }

  onClose() {
    let { contentEl } = this;
    this.pubview?.unmount();
    this.pubview = null;
    contentEl.empty();
  }
}