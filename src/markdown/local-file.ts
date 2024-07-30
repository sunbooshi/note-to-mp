import { Token, Tokens, MarkedExtension } from "marked";
import { Notice, TAbstractFile, TFile, Vault } from "obsidian";
import { wxUploadImage } from "../weixin-api";
import { Extension } from "./extension";

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

    async uploadLocalImage(token: string, vault: Vault) {
        const keys = this.images.keys();
        for (let key of keys) {
            const value = this.images.get(key);
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
        const keys = this.images.keys();
        for (let key of keys) {
            const value = this.images.get(key);
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

    async cleanup() {
        this.images.clear(); 
    }
}

  
export class LocalFile extends Extension{
    index: number = 0;

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
        const info = {
            resUrl: resPath,
            filePath: file.path,
            url: null
        };
        LocalImageManager.getInstance().setImage(resPath, info);
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
        const body = await this.marked.parse(content);
        this.callback.updateElementByID(id, body);
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
                else {
                    const id = this.generateId();
                    this.renderFile(token.href, id);
                    const tag = this.callback.settings.embedStyle === 'quote' ? 'blockquote' : 'section';
                    return `<${tag} class="note-embed-file" id="${id}">渲染中</${tag}>`
                }
            }
        }]};
    }
}