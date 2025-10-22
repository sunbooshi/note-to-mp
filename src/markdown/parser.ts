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

import { Marked } from "marked";
import { NMPSettings } from "src/settings";
import { App, Vault } from "obsidian";
import AssetsManager from "../assets";
import { Extension, MDRendererCallback } from "./extension";
import { Blockquote} from "./blockquote";
import { CodeRenderer } from "./code";
import { EmbedBlockMark } from "./embed-block-mark";
import { SVGIcon } from "./icons";
import { LinkRenderer } from "./link";
import { LocalFile, LocalImageManager } from "./local-file";
import { MathRenderer } from "./math";
import { TextHighlight } from "./text-highlight";
import { Comment } from "./commnet";
import { Topic } from "./topic";
import { HeadingRenderer } from "./heading";
import { FootnoteRenderer } from "./footnote";
import { EmptyLineRenderer } from "./empty-line";
import { cleanUrl } from "../utils";


const markedOptiones = {
    gfm: true,
    breaks: true,
};

const customRenderer = {
	hr(): string {
		return '<hr>';
	},
	list(body: string, ordered: boolean, start: number | ''): string {
		const type = ordered ? 'ol' : 'ul';
		const startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
		return '<' + type + startatt + ' class="list-paddingleft-1">' + body + '</' + type + '>';
	},
	listitem(text: string, task: boolean, checked: boolean): string {
		return `<li><section>${text}</section></li>`;
	},
	image(href: string, title: string | null, text: string): string {
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return text;
    }
    href = cleanHref;

		if (!href.startsWith('http')) {
			const res = AssetsManager.getInstance().getResourcePath(decodeURI(href));
			if (res) {
				href = res.resUrl;
				const info = {
					resUrl: res.resUrl,
					filePath: res.filePath,
					media_id: null,
					url: null
				};
				LocalImageManager.getInstance().setImage(res.resUrl, info);	
			}
		}
		let out = '';
		if (NMPSettings.getInstance().useFigcaption) {
			out = `<figure style="display: flex; flex-direction: column; align-items: center;"><img src="${href}" alt="${text}"`;
			if (title) {
				out += ` title="${title}"`;
			}
			if (text.length > 0) {
				out += `><figcaption>${text}</figcaption></figure>`;
			}
			else {
				out += '></figure>'
			}
		}
		else {
			out = `<img src="${href}" alt="${text}"`;
			if (title) {
				out += ` title="${title}"`;
			}
			out += '>';
		}
    return out;
  }
};

export class MarkedParser {
	extensions: Extension[] = [];
	marked: Marked;
	app: App;
	vault: Vault;

	constructor(app: App, callback: MDRendererCallback) {
		this.app = app;
		this.vault = app.vault;

		const settings = NMPSettings.getInstance();
		const assetsManager = AssetsManager.getInstance();

		this.extensions.push(new LocalFile(app, settings, assetsManager, callback));
		this.extensions.push(new Blockquote(app, settings, assetsManager, callback));
		this.extensions.push(new EmbedBlockMark(app, settings, assetsManager, callback));
		this.extensions.push(new SVGIcon(app, settings, assetsManager, callback));
		this.extensions.push(new LinkRenderer(app, settings, assetsManager, callback));
		this.extensions.push(new TextHighlight(app, settings, assetsManager, callback));
		this.extensions.push(new CodeRenderer(app, settings, assetsManager, callback));
		this.extensions.push(new Comment(app, settings, assetsManager, callback));
		this.extensions.push(new Topic(app, settings, assetsManager, callback));
		this.extensions.push(new HeadingRenderer(app, settings, assetsManager, callback));
		this.extensions.push(new FootnoteRenderer(app, settings, assetsManager, callback));
		if (settings.enableEmptyLine) {
			this.extensions.push(new EmptyLineRenderer(app, settings, assetsManager, callback));
		}
		if (settings.isAuthKeyVaild()) {
			this.extensions.push(new MathRenderer(app, settings, assetsManager, callback));
		}
	}

	async buildMarked() {
	  this.marked = new Marked();
		this.marked.use(markedOptiones);
		for (const ext of this.extensions) {
			this.marked.use(ext.markedExtension());
			ext.marked = this.marked;
			await ext.prepare();
		}
		this.marked.use({renderer: customRenderer});
	}

	async prepare() {
	  this.extensions.forEach(async ext => await ext.prepare());
	}

	async postprocess(html: string) {
		let result = html;
		for (let ext of this.extensions) {
			result = await ext.postprocess(result);
		}
		return result;
	}

	async parse(content: string) {
		if (!this.marked) await this.buildMarked();
		await this.prepare();
		let html = await this.marked.parse(content);	
		html = await this.postprocess(html);
		return html;
	}
}
