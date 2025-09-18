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

import { Tokens, MarkedExtension } from "marked";
import { Extension } from "./extension";
import { NMPSettings } from "src/settings";
import { uevent } from "src/utils";
import { wxWidget } from "src/weixin-api";

const widgetCache = new Map<string, string>();

export function cleanWidgetCache() {
  widgetCache.clear();
}

export class WidgetBox extends Extension {
  mapToString(map: Map<string, string>): string {
    if (map.size === 0) return "";
    
    return Array.from(map.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join("&"); // 用 "&" 连接键值对，可换成其他分隔符
  }

  calcKey(id: string, title: string, style: Map<string, string>, content: string) {
    const styleStr = this.mapToString(style);
    const key = `${id}-${title}-${styleStr}-${content}`;
    return key; 
  }

  cacheWidget(id: string, title: string, style: Map<string, string>, content: string, result: string) {
    const key = this.calcKey(id, title, style, content);
    widgetCache.set(key, result);
  }

  getWidget(id: string, title: string, style: Map<string, string>, content: string) {
    const key = this.calcKey(id, title, style, content);
    if (!widgetCache.has(key)) {
      return null;
    }
    return widgetCache.get(key);  
  }

  getBoxTitle(text: string) {
    let start = text.indexOf(']') + 1;
    let end = text.indexOf('\n');
    if (end === -1)  end = text.length;
    if (start >= end)  return '';
    return text.slice(start, end).trim();
  }

  getBoxId(text: string) {
    const regex = /\[#(.*?)\]/g;
    let m;
    if( m = regex.exec(text)) {
      return m[1];
    }
    return "";
  }
  matched(text: string) {
    return this.getBoxId(text) != "";
  }

  parseStyle(text: string) {
    const style = text.split(':').map((s) => s.trim());
    if (style.length != 2)  return null;
    const key = style[0];
    const value = style[1];
    return {key, value};
  }

  parseBox(text: string) {
    const lines = text.split('\n');
    let style = new Map<string, string>();
    let content = [];
    let isStyle = false;
    for (let line of lines) {
      if (line === '===') {
        isStyle = !isStyle;
        continue;
      }
      if (isStyle) {
        const s = this.parseStyle(line);
        if (s) style.set(s.key, s.value);
      } else {
        content.push(line);
      }
    }
    const contentStr = content.join('\n');
    return { style, contentStr };
  }

  async reqContent(id: string, title: string, style: Map<string, string>, content: string) {
    const params = JSON.stringify({
      id,
      title,
      style: Object.fromEntries(style),
      content
    });
    return wxWidget(NMPSettings.getInstance().authKey, params)
  }

  processColor(style: Map<string, string>) {
    const keys = style.keys();
    for (let key of keys) {
      if (key.includes('color')) {
        const value = style.get(key);
        if (!value)  continue;
        if (value.startsWith('rgb') || value.startsWith('#')) {
          continue;
        }
        style.set(key, '#' + value);
      }
    }
  }

  async renderer(token: Tokens.Blockquote) {
    let boxId = this.getBoxId(token.text);
    if (boxId == '') {
      const body = this.marked.parser(token.tokens);
      return `<blockquote>${body}</blockquote>`;;
    }

    const title = this.getBoxTitle(token.text);
    let style = new Map<string, string>();
    let content = '';
    const index = token.text.indexOf('\n');
    if (index > 0) {
      const pared = this.parseBox(token.text.slice(index + 1))
      style = pared.style;
      content = await this.marked.parse(pared.contentStr);
    }

    this.processColor(style);

    const cached = this.getWidget(boxId, title, style, content);
    if (cached) {
      uevent('render-widgets-cached');
      return cached;
    }
    else {
      const reqContent = await this.reqContent(boxId, title, style, content);
      this.cacheWidget(boxId, title, style, content, reqContent);
      uevent('render-widgets');
      return reqContent; 
    }
  }

  markedExtension(): MarkedExtension {
    return {
      extensions: [{
        name: 'blockquote',
        level: 'block',
        renderer: (token: Tokens.Generic) => {
          return token.html;
        },
      }]
    }
  }
}