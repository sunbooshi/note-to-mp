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

import { NMPSettings } from "src/settings";
import { Marked, MarkedExtension } from "marked";
import { App, Vault } from "obsidian";
import AssetsManager from "../assets";

export interface MDRendererCallback {
   settings: NMPSettings;
   updateElementByID(id:string, html:string):void; // 改为异步渲染后已废弃
   cacheElement(category: string, id: string, data: string): void;
}

export abstract class Extension {
    app: App;
    vault: Vault;
    assetsManager: AssetsManager
    settings: NMPSettings;
    callback: MDRendererCallback;
    marked: Marked;

    constructor(app: App, settings: NMPSettings, assetsManager: AssetsManager, callback: MDRendererCallback) {
        this.app = app;
        this.vault = app.vault;
        this.settings = settings;
        this.assetsManager = assetsManager;
        this.callback = callback;
    }

    async prepare() { return; }
    async postprocess(html:string) { return html; }
    async beforePublish() { }
    async cleanup() { return; }
    abstract markedExtension(): MarkedExtension
}