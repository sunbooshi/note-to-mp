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
import AssetsManager from "src/assets";
import { ExpertSettings } from "src/expert-settings";
import { wxWidget } from "src/weixin-api";

export class HeadingRenderer extends Extension {
  index = [0, 0, 0, 0];
  expertSettings: ExpertSettings;
  headingSettings: any[]

  async prepare() {
    this.index = [0, 0, 0, 0];
    this.expertSettings = AssetsManager.getInstance().expertSettings;
    this.headingSettings = [undefined, undefined, undefined, undefined];
    if (!this.expertSettings.render) {
      return;
    }
    if (this.expertSettings.render.h1) {
      this.headingSettings[1] = this.expertSettings.render.h1;
    }
    if (this.expertSettings.render.h2) {
      this.headingSettings[2] = this.expertSettings.render.h2;
    }
    if (this.expertSettings.render.h3) {
      this.headingSettings[3] = this.expertSettings.render.h3;
    }
  }

  async renderWithTemplate(token: Tokens.Heading, template: string) {
    const content = await this.marked.parseInline(token.text);
    return template.replace('{content}', content);
  }

  async renderWithWidgetId(token: Tokens.Heading, widgetId: number) {
    const authkey = this.settings.authKey;
    const content = await this.marked.parseInline(token.text);
    const params = JSON.stringify({
      id: `${widgetId}`,
      title: content,
    });
    return await wxWidget(authkey, params);
  }

  async renderWithWidget(token: Tokens.Heading, widgetId: number, counter: boolean|undefined, len: number|undefined, style: object|undefined = undefined) {
    const authkey = this.settings.authKey;
    let title = token.text;
    if (counter === undefined) {
      counter = false;
    }
    if (len === undefined) {
      len = 1;
    }
    if (style === undefined) {
      style = new Map<string, string>();
    }
    if (counter) {
      title = `${this.index[token.depth]}`;
      if (title.length < len) {
        title = title.padStart(len, '0');
      }
    }
    const content = await this.marked.parseInline(token.text);
    const params = JSON.stringify({
      id: `${widgetId}`,
      title,
      style,
      content: '<p>' + content + '</p>',
    });
    return await wxWidget(authkey, params);
  }

  markedExtension(): MarkedExtension {
    return {
      async: true,
      walkTokens: async (token: Tokens.Generic) => {
        if (token.type !== 'heading') {
          return;
        }

        const setting = this.headingSettings[token.depth];
        this.index[token.depth] += 1;
        if (setting) {
          if (typeof setting === 'string') {
            token.html = await this.renderWithTemplate(token as Tokens.Heading, setting);
          }
          else if (typeof setting === 'number') {
            token.html = await this.renderWithWidgetId(token as Tokens.Heading, setting);
          }
          else {
            const { id, counter, len, style } = setting;
            token.html = await this.renderWithWidget(token as Tokens.Heading, id, counter, len, style);
          }
          return;
        }

        const body = await this.marked.parseInline(token.text);
        token.html = `<h${token.depth}>${body}</h${token.depth}>`;
      },
      extensions: [{
        name: 'heading',
        level: 'block',
        renderer: (token: Tokens.Generic) => {
          return token.html;
        },
      }]
    }
  }
}