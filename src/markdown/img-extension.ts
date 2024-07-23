import { Token, Tokens, Parser, Lexer } from "marked";
import { App, Notice, TAbstractFile, TFile } from "obsidian";
import { wxUploadImage } from "../weixin-api";
import { MDRendererCallback } from "./callback";

declare module 'obsidian' {
    interface Vault {
        config: {
            attachmentFolderPath: string;
            newLinkFormat: string;
            useMarkdownLinks: boolean;
        };
    }
}


const LocalImageRegex = /^!\[\[(.*?)\]\]/;

interface ImageInfo {
    resUrl: string;
    filePath: string;
    url: string | null;
}

export class LocalImageRenderer {
    allImages = new Map<string, ImageInfo>();
    app: App;
    index: number = 0;
    callback: MDRendererCallback

    constructor(app: App, callback: MDRendererCallback) {
        this.app = app;
        this.callback = callback;
    }

    generateId() {
        this.index += 1;
        return `fid-${this.index}`;
    }

    getImagePath(path: string) {
        const file = this.searchFile(path);

        if (file == null) {
            console.error('找不到文件：' + path);
            return '';
        }

        const resPath = this.app.vault.getResourcePath(file as TFile);
        if (!this.allImages.has(resPath)) {
            this.allImages.set(resPath, {
                resUrl: resPath,
                filePath: file.path,
                url: null
            })
        }
        return resPath;
    }

    searchFile(originPath: string): TAbstractFile | null {
        const resolvedPath = this.resolvePath(originPath);
        const vault= this.app.vault;
        const attachmentFolderPath = vault.config.attachmentFolderPath || '';
        let localPath = resolvedPath;
        let file = null;

        // 然后从根目录查找
        file = vault.getFileByPath(resolvedPath);
        if (file) {
            return file; 
        }

        file = vault.getFileByPath(originPath);
        if (file) {
            return file; 
        }

        // 先从附件文件夹查找
        if (attachmentFolderPath != '') {
            localPath = attachmentFolderPath + '/' + originPath;
            file = vault.getFileByPath(localPath)
            if (file) {
                return file;
            }

            localPath = attachmentFolderPath + '/' + resolvedPath;
            file = vault.getFileByPath(localPath)
            if (file) {
                return file;
            }
        }

        // 最后查找所有文件
        const files = vault.getAllLoadedFiles();
        for (let f of files) {
            if (f.path.includes(originPath)) {
                return f;
            }
        }

        return null;
    }

    resolvePath(relativePath: string): string {
        const basePath = this.getActiveFileDir();
        if (!relativePath.includes('/')) {
            return relativePath;
        }
        const stack = basePath.split("/");
        const parts = relativePath.split("/");
      
        stack.pop(); // Remove the current file name (or empty string)
    
        for (const part of parts) {
            if (part === ".") continue;
            if (part === "..") stack.pop();
            else stack.push(part);
        }
        return stack.join("/");
    }

    getActiveFileDir() {
        const af = this.app.workspace.getActiveFile();
        if (af == null) {
            return '';
        }
        const parts = af.path.split('/');
        parts.pop();
        if (parts.length == 0) {
            return '';
        }
        return parts.join('/');
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
            file = this.searchFile(path);
        }

        if (file == null) {
            const msg = '找不到文件：' + path;
            console.error(msg)
            this.callback.updateElementByID(id, msg);
            return;
        }

        const content = await this.getFileContent(file, header, block);
        const markedOptiones = {
            gfm: true,
            breaks: true,
        };
        const lexer = new Lexer(markedOptiones);
        const tokens = lexer.lex(content);
        const parser = new Parser(markedOptiones);
        const body = parser.parse(tokens);
        this.callback.updateElementByID(id, body);
    }

    localImageExtension() {
        this.allImages.clear();
        return {
            name: 'LocalImage',
            level: 'inline',
            start: (src: string) => {
                const index = src.indexOf('![[')
                if (index === -1) return
                return index
            },
            tokenizer: (src: string, tokens: Token[]) => {
                const matches = src.match(LocalImageRegex);
                if (matches == null) return;
                const token: Token = {
                    type: 'LocalImage',
                    raw: matches[0],
                    href: matches[1],
                    text: matches[1]
                };
                return token
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
                else {
                    const id = this.generateId();
                    this.renderFile(token.href, id);
                    return `<blockquote class="note-embed-file" id="${id}">渲染中</blockquote>`
                }
            }
        }
    }

    async uploadLocalImage(token: string) {
        const vault = this.app.vault;
        const keys = this.allImages.keys();
        for (let key of keys) {
            const value = this.allImages.get(key);
            if (value == null) continue;
            if (value.url != null) continue;
            const file = vault.getFileByPath(value.filePath);
            if (file == null) continue;
            const fileData = await vault.readBinary(file);
            const res = await wxUploadImage(new Blob([fileData]), file.name, token);
            if (res.errcode != 0) {
                const msg = `上传图片失败: ${res.errcode} ${res.errmsg}`;
                new Notice(msg);
                console.error(msg);
            }
            value.url = res.url;
        }
    }

    replaceImages(root: HTMLElement) {
        const images = root.getElementsByTagName('img');
        const keys = this.allImages.keys();
        for (let key of keys) {
            const value = this.allImages.get(key);
            if (value == null) continue;
            if (value.url == null) continue;
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                if (img.src.startsWith('http')) {
                    continue;
                }
                if (img.src === key) {
                    img.setAttribute('src', value.url);
                    break;
                }
            }
        }
    }

    async uploadCover(file: File, token: string) {
        const res = await wxUploadImage(file, file.name, token, 'image');
        if (res.media_id) {
            return res.media_id;
        }
        console.error('upload cover fail: ' + res.errmsg);
    }
}