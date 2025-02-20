/*
 * Copyright (c) 2024 Sun Booshi
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

import { Token, Tokens, MarkedExtension } from "marked";
import { Notice, TAbstractFile, TFile, Vault, MarkdownView, requestUrl, Platform } from "obsidian";
import { wxUploadImage } from "../weixin-api";
import { Extension } from "./extension";
import { NMPSettings } from "../settings";
import { IsWasmReady, LoadWasm, WebpToJPG } from "../wasm/wasm";

declare module 'obsidian' {
    interface Vault {
        config: {
            attachmentFolderPath: string;
            newLinkFormat: string;
            useMarkdownLinks: boolean;
        };
    }
}

const LocalFileRegex = /^!\[\[(.*?)\]\]/;

interface ImageInfo {
    resUrl: string;
    filePath: string;
    url: string | null;
}

export class LocalImageManager {
    private images: Map<string, ImageInfo>;
    private static instance: LocalImageManager;

    private constructor() {
        this.images = new Map<string, ImageInfo>();
    }

    // 静态方法，用于获取实例
    public static getInstance(): LocalImageManager {
        if (!LocalImageManager.instance) {
            LocalImageManager.instance = new LocalImageManager();
        }
        return LocalImageManager.instance;
    }

    public setImage(path: string, info: ImageInfo): void {
        if (!this.images.has(path)) {
            this.images.set(path, info);
        }
    }

    isWebp(file: TFile | string): boolean {
        if (file instanceof TFile) {
            return file.extension.toLowerCase() === 'webp';
        }
        const name = file.toLowerCase();
        return name.endsWith('.webp');
    }

    async uploadLocalImage(token: string, vault: Vault) {
        const keys = this.images.keys();
        await LoadWasm();
        for (let key of keys) {
            const value = this.images.get(key);
            if (value == null) continue;
            if (value.url != null) continue;
            const file = vault.getFileByPath(value.filePath);
            if (file == null) continue;
            let fileData = await vault.readBinary(file);
            let name = file.name;
            if (this.isWebp(file)) {
                if (IsWasmReady()) {
                    fileData = WebpToJPG(fileData);
                    name = name.toLowerCase().replace('.webp', '.jpg');
                }
                else {
                    console.error('wasm not ready for webp');
                }
            }

            const res = await wxUploadImage(new Blob([fileData]), name, token);
            if (res.errcode != 0) {
                const msg = `上传图片失败: ${res.errcode} ${res.errmsg}`;
                new Notice(msg);
                console.error(msg);
            }

            value.url = res.url;
        }
    }

    checkImageExt(filename: string ): boolean {
        const name = filename.toLowerCase();

        if (name.endsWith('.jpg')
            || name.endsWith('.jpeg')
            || name.endsWith('.png')
            || name.endsWith('.gif')
            || name.endsWith('.bmp')
            || name.endsWith('.tiff')
            || name.endsWith('.svg')
            || name.endsWith('.webp')) {
            return true;
        }
        return false;
    }

    getImageNameFromUrl(url: string, type: string): string {
        try {
            // 创建URL对象
            const urlObj = new URL(url);
            // 获取pathname部分
            const pathname = urlObj.pathname;
            // 获取最后一个/后的内容作为文件名
            let filename = pathname.split('/').pop() || '';
            filename = decodeURIComponent(filename);
            if (!this.checkImageExt(filename)) {
                filename = filename + this.getImageExt(type);
            }
            return filename;
        } catch (e) {
            // 如果URL解析失败，尝试简单的字符串处理
            const queryIndex = url.indexOf('?');
            if (queryIndex !== -1) {
                url = url.substring(0, queryIndex);
            }
            return url.split('/').pop() || '';
        }
    }

    getImageExtFromBlob(blob: Blob): string {
        // MIME类型到文件扩展名的映射
        const mimeToExt: { [key: string]: string } = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/bmp': '.bmp',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'image/tiff': '.tiff'
        };
    
        // 获取MIME类型
        const mimeType = blob.type.toLowerCase();
        
        // 返回对应的扩展名，如果找不到则返回空字符串
        return mimeToExt[mimeType] || '';
    }

    async uploadImageFromUrl(url: string, token: string, type: string = '') {
        const rep = await requestUrl(url);

        let data = rep.arrayBuffer;
        let blob = new Blob([data]);

        let filename = this.getImageNameFromUrl(url, rep.headers['content-type']);
        if (filename == '' || filename == null) {
            filename = 'remote_img' + this.getImageExtFromBlob(blob);
        }

        if (this.isWebp(filename)) {
            if (IsWasmReady()) {
                data = WebpToJPG(data);
                blob = new Blob([data]);
                filename = filename.toLowerCase().replace('.webp', '.jpg');
            }
            else {
                console.error('wasm not ready for webp');
            }
        }

        return await wxUploadImage(blob, filename, token, type);
    }

    getImageExt(type: string): string {
        const mimeToExt: { [key: string]: string } = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/bmp': '.bmp',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'image/tiff': '.tiff'
        };
        return mimeToExt[type] || '.jpg';
    }

    async uploadRemoteImage(root: HTMLElement, token: string) {
        const images = root.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (!img.src.startsWith('http')) continue; 
            if (img.src.includes('mmbiz.qpic.cn')) continue;
            // 移动端本地图片不通过src上传
            if (img.src.startsWith('http://localhost/') && Platform.isMobileApp) {
                continue;
            }

            const res = await this.uploadImageFromUrl(img.src, token);
            if (res.errcode != 0) {
                const msg = `上传图片失败: ${img.src} ${res.errcode} ${res.errmsg}`;
                new Notice(msg);
                console.error(msg);
            }

            const info = {
                resUrl: img.src,
                filePath: "",
                url: res.url
            };
            this.images.set(img.src, info);
        }
    }

    replaceImages(root: HTMLElement) {
        const images = root.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const value = this.images.get(img.src);
            if (value == null) continue;
            if (value.url == null) continue;
            img.setAttribute('src', value.url);
        }
    }

    async cleanup() {
        this.images.clear(); 
    }
}

  
export class LocalFile extends Extension{
    index: number = 0;
    public static fileCache: Map<string, string> = new Map<string, string>();

    generateId() {
        this.index += 1;
        return `fid-${this.index}`;
    }

    getImagePath(path: string) {
        const file = this.assetsManager.searchFile(path);

        if (file == null) {
            console.error('找不到文件：' + path);
            return '';
        }

        const resPath = this.app.vault.getResourcePath(file as TFile);
        const info = {
            resUrl: resPath,
            filePath: file.path,
            url: null
        };
        LocalImageManager.getInstance().setImage(resPath, info);
        return resPath;
    }

    isImage(file: string) {
        file = file.toLowerCase();
        return file.endsWith('.png')
                || file.endsWith('.jpg')
                || file.endsWith('.jpeg')
                || file.endsWith('.gif')
                || file.endsWith('.bmp')
                || file.endsWith('.webp');
    }

    parseImageLink(link: string) {
        if (link.includes('|')) {
            const parts = link.split('|');
            const path = parts[0];
            if (!this.isImage(path)) return null;

            let width = null;
            let height = null;
            if (parts.length == 2) {
                const size = parts[1].toLowerCase().split('x');
                width = parseInt(size[0]);
                if (size.length == 2 && size[1] != '') {
                    height = parseInt(size[1]);
                }
            }
            return { path, width, height };
        }
        if (this.isImage(link)) {
            return { path: link, width: null, height: null };
        }
        return null;
    }

    getHeaderLevel(line: string) {
        const match = line.trimStart().match(/^#{1,6}/);
        if (match) {
            return match[0].length;
        }
        return 0;
    }

    async getFileContent(file: TAbstractFile, header: string | null, block: string | null) {
        const content = await this.app.vault.adapter.read(file.path);
        if (header == null && block == null) {
            return content;
        }

        let result = '';
        const lines = content.split('\n');
        if (header) {
            let level = 0;
            let append = false;
            for (let line of lines) {
                if (append) {
                    if (level == this.getHeaderLevel(line)) {
                        break;
                    }
                    result += line + '\n';
                    continue;
                }
                if (!line.trim().startsWith('#')) continue;
                const items = line.trim().split(' ');
                if (items.length != 2) continue;
                if (header.trim() != items[1].trim()) continue;
                if (this.getHeaderLevel(line)) {
                    result += line + '\n';
                    level = this.getHeaderLevel(line);
                    append = true;
                }
            }
        }

        if (block) {
            let preline = '';
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.indexOf(block) >= 0) {
                    result = line.replace(block, '');
                    if (result.trim() == '') {
                        for (let j = i - 1; j >= 0; j--) {
                            const l = lines[j];
                            if (l.trim()!= '') {
                                result = l;
                                break;
                            }
                        }
                    }
                    break;
                }
                preline = line;
            }
        }

        return result;
    }

    parseFileLink(link: string) {
        const info = link.split('|')[0];
        const items = info.split('#');
        let path = items[0];
        let header = null;
        let block = null;
        if (items.length == 2) {
            if (items[1].startsWith('^')) {
                block = items[1];
            } else {
                header = items[1];
            }
        }
        return { path, head: header, block };
    }

    async renderFile(link: string, id: string) {
        let { path, head: header, block} = this.parseFileLink(link);
        let file = null;
        if (path === '') {
            file = this.app.workspace.getActiveFile();
        }
        else {
            if (!path.endsWith('.md')) {
                path = path + '.md';
            }
            file = this.assetsManager.searchFile(path);
        }

        if (file == null) {
            const msg = '找不到文件：' + path;
            console.error(msg)
            this.callback.updateElementByID(id, msg);
            return;
        }

        const content = await this.getFileContent(file, header, block);
        const body = await this.marked.parse(content);
        this.callback.updateElementByID(id, body);
    }

    async readBlob(src: string) {
        return await fetch(src).then(response => response.blob())
    }

    async getExcalidrawUrl(data: string) {
        const url = 'https://obplugin.sunboshi.tech/math/excalidraw';
        const req = await requestUrl({
            url,
            method: 'POST',
            contentType: 'application/json',
            headers: {
                authkey: NMPSettings.getInstance().authKey
            },
            body: JSON.stringify({ data })
        });

        if (req.status != 200) {
            console.error(req.status);
            return null;
        }
        return req.json.url;
    }

    parseLinkStyle(link: string) {
        let filename = '';
        let style = 'style="width:100%;height:100%"';
        let postion = 'left';
        const postions = ['left', 'center', 'right'];
        if (link.includes('|')) {
            const items = link.split('|');
            filename = items[0];
            let size = '';
            if (items.length == 2) {
                if (postions.includes(items[1])) {
                    postion = items[1];
                }
                else {
                    size = items[1];
                }
            }
            else if (items.length == 3) {
                size = items[1];
                if (postions.includes(items[1])) {
                    size = items[2];
                    postion = items[1];
                }
                else {
                    size = items[1];
                    postion = items[2];
                }
            }
            if (size != '') {
                const sizes = size.split('x');
                if (sizes.length == 2) {
                    style = `style="width:${sizes[0]}px;height:${sizes[1]}px;"`
                }
                else {
                    style = `style="width:${sizes[0]}px;"`
                }
            }
        }
        else {
            filename = link;
        }
        return { filename, style, postion };
    }

    parseExcalidrawLink(link: string) {
        let classname = 'note-embed-excalidraw-left';
        const postions = new Map<string, string>([
            ['left', 'note-embed-excalidraw-left'],
            ['center', 'note-embed-excalidraw-center'],
            ['right', 'note-embed-excalidraw-right']
        ])

        let {filename, style, postion} = this.parseLinkStyle(link);
        classname = postions.get(postion) || classname;

        if(filename.endsWith('excalidraw') || filename.endsWith('excalidraw.md')) {
            return { filename, style, classname };
        }

        return null;
    }

    async renderExcalidraw(name: string, id: string) {
        try {
            let container: HTMLElement | null = null;
            const currentFile = this.app.workspace.getActiveFile();
            const leaves = this.app.workspace.getLeavesOfType('markdown');
            for (let leaf of leaves) {
                const markdownView = leaf.view as MarkdownView;
                if (markdownView.file?.path === currentFile?.path) {
                    container = markdownView.containerEl;
                }
            }
            if (container) {
                const containers = container.querySelectorAll('.internal-embed');
                for (let container of containers) {
                    if (name !== container.getAttribute('src')) {
                        continue;
                    }

                    const src = await this.getExcalidrawUrl(container.innerHTML);
                    let svg = '';
                    if (src === '') {
                        svg = '渲染失败';
                        console.log('Failed to get Excalidraw URL');
                    }
                    else {
                        const blob = await this.readBlob(src);
                        if (blob.type === 'image/svg+xml') {
                            svg = await blob.text();
                            LocalFile.fileCache.set(name, svg);
                        }
                        else {
                            svg = '暂不支持' + blob.type;
                        }
                    }
                    this.callback.updateElementByID(id, svg);
                }
            } else {
                console.error('container is null ' + name);
                this.callback.updateElementByID(id, '渲染失败');
            }
        } catch (error) {
            console.error(error.message);
            this.callback.updateElementByID(id, '渲染失败:' + error.message);
        }
    }

    parseSVGLink(link: string) {
        let classname = 'note-embed-svg-left';
        const postions = new Map<string, string>([
            ['left', 'note-embed-svg-left'],
            ['center', 'note-embed-svg-center'],
            ['right', 'note-embed-svg-right']
        ])

        let {filename, style, postion} = this.parseLinkStyle(link);
        classname = postions.get(postion) || classname;

        return { filename, style, classname };
    }

    async renderSVGFile(filename: string, id: string) {
        const file = this.assetsManager.searchFile(filename);

        if (file == null) {
            const msg = '找不到文件：' + file;
            console.error(msg)
            this.callback.updateElementByID(id, msg);
            return;
        }

        const content = await this.getFileContent(file, null, null);
        LocalFile.fileCache.set(filename, content);
        this.callback.updateElementByID(id, content);
    }

    markedExtension(): MarkedExtension {
        return {extensions:[{
            name: 'LocalImage',
            level: 'inline',
            start: (src: string) => {
                const index = src.indexOf('![[');
                if (index === -1) return;
                return index;
            },
            tokenizer: (src: string) => {
                const matches = src.match(LocalFileRegex);
                if (matches == null) return;
                const token: Token = {
                    type: 'LocalImage',
                    raw: matches[0],
                    href: matches[1],
                    text: matches[1]
                };
                return token;
            },
            renderer: (token: Tokens.Image) => {
                // 渲染本地图片
                let item = this.parseImageLink(token.href);
                if (item) {
                    const src = this.getImagePath(item.path);
                    const width = item.width ? `width="${item.width}"` : '';
                    const height = item.height? `height="${item.height}"` : '';
                    return `<img src="${src}" alt="${token.text}" ${width} ${height} />`;
                }

                const info = this.parseExcalidrawLink(token.href);
                if (info) {
                    const id = this.generateId();
                    let svg = '渲染中';
                    if (LocalFile.fileCache.has(info.filename)) {
                        svg = LocalFile.fileCache.get(info.filename) || '渲染失败';
                    }
                    else {
                        this.renderExcalidraw(info.filename, id);
                    }
                    return `<span class="${info.classname}"><span class="note-embed-excalidraw" id="${id}" ${info.style}>${svg}</span></span>`
                }

                if (token.href.endsWith('.svg') || token.href.includes('.svg|')) {
                    const info = this.parseSVGLink(token.href);
                    const id = this.generateId();
                    let svg = '渲染中';
                    if (LocalFile.fileCache.has(info.filename)) {
                        svg = LocalFile.fileCache.get(info.filename) || '渲染失败';
                    }
                    else {
                        this.renderSVGFile(info.filename, id);
                    }
                    return `<span class="${info.classname}"><span class="note-embed-svg" id="${id}" ${info.style}>${svg}</span></span>`
                }

                const id = this.generateId();
                this.renderFile(token.href, id);
                const tag = this.callback.settings.embedStyle === 'quote' ? 'blockquote' : 'section';
                return `<${tag} class="note-embed-file" id="${id}">渲染中</${tag}>`
            }
        }]};
    }
}