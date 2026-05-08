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

import { App, Modal, Notice } from "obsidian";
import { uevent } from "./utils";
import { NMPSettings } from "./settings";

export interface ImageBGModalPlugin {
  saveSettings(): Promise<void>;
}

export class ImageBGModal extends Modal {
  listener: any = null;
  plugin: ImageBGModalPlugin;
  url: string = 'https://widgets.dualhue.cn/background';
  constructor(app: App, plugin: ImageBGModalPlugin) {
    super(app);
    this.plugin = plugin;
  }

  saveConfig(config: any) {
    const settings = NMPSettings.getInstance();
    if (!settings.isAuthKeyVaild()) {
      new Notice('请先设置注册码', 5000);
      return;
    }
    if (!settings.extraSettings) {
      settings.extraSettings = { imageFrame: config };
    } else {
      settings.extraSettings.imageFrame = config;
    }
    this.plugin.saveSettings();
    new Notice('保存成功!', 2000);
  }

  clearConfig() {
    const settings = NMPSettings.getInstance();
    if (!settings.extraSettings) {
      return;
    }
    settings.extraSettings.imageFrame = null;
    this.plugin.saveSettings();
    new Notice('清空配置成功!', 2000);
  }

  onOpen() {
    let { contentEl, modalEl } = this;
    modalEl.style.width = '1024px';
    modalEl.style.height = '720px';
    const iframe = contentEl.createEl('iframe', {
      attr: {
        src: this.url,
        width: '100%',
        height: '100%',
        allow: 'clipboard-read; clipboard-write; local-fonts',
      },
    });

    iframe.style.border = 'none';

    this.listener = this.handleMessage.bind(this);
    window.addEventListener('message', this.listener);
    uevent('open-image');
  }

  handleMessage(event: MessageEvent) {
    console.log('handleMessage', event);
    console.log('origin', event.origin);
    if (this.url.startsWith(event.origin)) {
      const { type, settings } = event.data;
      console.log('type', type);
      if (type === 'gradify-save-config') {
        this.saveConfig(settings);
      }
      else if ( type === 'gradify-clear-config') {
        this.clearConfig();
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