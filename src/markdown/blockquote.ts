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
import { Extension, MDRendererCallback } from "./extension";
import { NMPSettings } from "src/settings";
import { App, Vault } from "obsidian";
import AssetsManager from "../assets";
import { CalloutRenderer } from "./callouts";
import { WidgetBox } from "./widget-box";

export class Blockquote extends Extension {
  callout: CalloutRenderer;
  box: WidgetBox;

  constructor(app: App, settings: NMPSettings, assetsManager: AssetsManager, callback: MDRendererCallback) {
    super(app, settings, assetsManager, callback);
    this.callout = new CalloutRenderer(app, settings, assetsManager, callback);
    if (settings.isAuthKeyVaild()) {
      this.box = new WidgetBox(app, settings, assetsManager, callback);
    }
  }

  async prepare() { 
    if (!this.marked) {
      console.error("marked is not ready");
      return;
    }
    if (this.callout) this.callout.marked = this.marked;
    if (this.box) this.box.marked = this.marked;
    return;
  }

  async renderer(token: Tokens.Blockquote) {
    if (this.callout.matched(token.text)) {
      return await this.callout.renderer(token);
    }

    if (this.box && this.box.matched(token.text)) {
      return await this.box.renderer(token);
    }

    const body = await this.marked.parse(token.text);
    return `<blockquote>${body}</blockquote>`;
  }

  markedExtension(): MarkedExtension {
    return {
      async: true,
      walkTokens: async (token: Tokens.Generic) => {
        if (token.type !== 'blockquote') {
          return;
        }
        token.html = await this.renderer(token as Tokens.Blockquote);
      },
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