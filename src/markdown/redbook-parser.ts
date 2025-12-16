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
import { LocalFile } from "./local-file";
import { TextHighlight } from "./text-highlight";
import { Comment } from "./commnet";
import { Topic } from "./topic";


const markedOptions = {
    gfm: true,
    breaks: true,
};

interface RedBookOptions {
    heading: string[];
    listStyle: string;
    orderedListStyle: string[];
    taskListStyle: string[];
    hr: string;
}

export const defaultRedBookOptions: RedBookOptions = {
    heading: ['🔷', '💠', '🔹'],
    listStyle: '🔸',
    orderedListStyle: ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
    taskListStyle: ['🔲', '✅'],
    hr: '---------------------',
};

function getEmojiNum(index: number) {
    return defaultRedBookOptions.orderedListStyle[index] || `{index}`;
}

const customRenderer = {
    heading(text: string, level: number): string {
        const emoji = defaultRedBookOptions.heading[level - 1] || '';
        return `${emoji} ${text}\n`;
    },

    strong(text: string): string {
        return `${text}`;
    },

    em(text: string): string {
        return `${text}`;
    },

    codespan(text: string): string {
        return `${text}`;
    },

    code(code: string, infostring: string | undefined): string {
        const lang = infostring || '';
        return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
    },

    blockquote(text: string): string {
        const lines = text.split('<br>');
        return `\n\n${lines.map(line => '    ' + line.trim()).join('\n')}\n\n`;
    },

    hr(): string {
        return `\n${defaultRedBookOptions.hr}\n`;
    },

    list(body: string, ordered: boolean, start: number | ''): string {
        const uncheckChar = defaultRedBookOptions.taskListStyle[0] || '🔲';
        const checkedChar = defaultRedBookOptions.taskListStyle[1] || '✅';
        const lines = body.split('\n');
        let res = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '') continue;
            if (ordered) {
                const num = i + 1;
                const li = getEmojiNum(num) + ' ' + line;
                res += `${li}\n`;
            } 
            else if (line.startsWith(uncheckChar) || line.startsWith(checkedChar)) {
                res += line + '\n';
            }
            else {
                res += `${defaultRedBookOptions.listStyle} ${line}\n`;
            }
        }
        return `\n${res}\n`;
    },

    listitem(text: string, task: boolean, checked: boolean): string {
        const uncheckChar = defaultRedBookOptions.taskListStyle[0] || '🔲';
        const checkedChar = defaultRedBookOptions.taskListStyle[1] || '✅';
        const checkbox = task ? (checked ? checkedChar : uncheckChar) : '';
        return `${checkbox}${text}\n`;
    },

    image(href: string, title: string | null, text: string): string {
        return '\n'
    },

    link(href: string, title: string | null, text: string): string {
        return text;
    }
};

export class RedBookParser {
    extensions: Extension[] = [];
    marked: Marked;
    app: App;
    vault: Vault;

    constructor(app: App, callback: MDRendererCallback) {
        this.app = app;
        this.vault = app.vault;

        const settings = NMPSettings.getInstance();
        const assetsManager = AssetsManager.getInstance();

        // Add extensions relevant for Xiaohongshu
        this.extensions.push(new LocalFile(app, settings, assetsManager, callback));
        this.extensions.push(new TextHighlight(app, settings, assetsManager, callback));
        this.extensions.push(new Comment(app, settings, assetsManager, callback));
        this.extensions.push(new Topic(app, settings, assetsManager, callback));
    }

    async buildMarked() {
        this.marked = new Marked();
        this.marked.use(markedOptions);
        
        for (const ext of this.extensions) {
            this.marked.use(ext.markedExtension());
            ext.marked = this.marked;
            await ext.prepare();
        }
        
        this.marked.use({ renderer: customRenderer });
    }

    async prepare() {
        this.extensions.forEach(async ext => await ext.prepare());
    }

    async postprocess(text: string) {
        let result = text;
        
        result = result.replace(/\n{2,}/g, '\n\n');
        
        for (let ext of this.extensions) {
            result = await ext.postprocess(result);
        }
        
        return result;
    }

    async parse(content: string): Promise<string> {
        if (!this.marked) await this.buildMarked();
        await this.prepare();
        
        let text = await this.marked.parse(content);
        
        text = await this.postprocess(text);
        
        text = text.replace(/<\/?[^>]+(>|$)/g, "");
        return `${text}`;
    }
}