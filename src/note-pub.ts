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

import { App, Modal, Notice, TFile } from "obsidian";
import { createPubview, createMergePubview } from "./ui/pubview";
import * as ReactDOM from 'react-dom/client';
import { NMPSettings } from "./settings";

/**
 * 把「公众号」属性值解析为 appid。
 * 支持直接填写 appid（wx 开头）或填写公众号名称，与笔记属性中的解析规则一致。
 *
 * @returns 未配置时返回 undefined（使用默认公众号），找不到对应公众号时返回 null
 */
export function resolveAccountAppid(account?: string): string | null | undefined {
  const value = (account ?? '').trim();
  if (!value) {
    return undefined;
  }
  if (value.startsWith('wx')) {
    return value;
  }
  const wx = NMPSettings.getInstance().wxInfo?.find(item => item.name === value);
  return wx ? wx.appid : null;
}

export class NotePubModal extends Modal {
  pubview: ReactDOM.Root | null = null;
  notes: TFile[];
  merge: boolean = false;
  /** 「公众号」属性的原始值，为空表示使用默认公众号 */
  account: string = '';
  /** 解析后的公众号 appid */
  appid?: string;

  /**
   * @param account 要发布到的公众号，可以是公众号名称或 appid，留空则使用设置中的第一个公众号
   */
  constructor(app: App, notes: TFile[], merge?:boolean, account?: string) {
    super(app);
    this.notes = notes;
    if (merge !== undefined) {
      this.merge = merge;
    }
    this.account = (account ?? '').trim();
    this.appid = resolveAccountAppid(this.account) || undefined;
  }

  open() {
    // 指定了公众号却找不到时直接提示，避免发布到其它公众号
    if (this.account && !this.appid) {
      new Notice(`未找到公众号「${this.account}」，请检查公众号名称是否正确`);
      return;
    }
    super.open();
  }

  onOpen() {
    let { contentEl } = this;
    if (this.merge) {
      this.pubview = createMergePubview(contentEl, this, this.notes, this.appid);
    }
    else {
      this.pubview = createPubview(contentEl, this, this.notes, this.appid);
    }
  }

  onClose() {
    let { contentEl } = this;
    this.pubview?.unmount();
    this.pubview = null;
    contentEl.empty();
  }
}