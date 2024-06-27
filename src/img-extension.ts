import { Token, Tokens, Marked, options, Lexer} from "marked";
import { App, Vault, request, requestUrl, getBlobArrayBuffer, RequestUrlParam } from "obsidian";
import { wxUploadImage } from "./weixin-api";

declare module 'obsidian' {
    interface Vault {
        config: {
            attachmentFolderPath: string;
        };
    }
}

const LocalImageRegex = /!\[\[(.*?)\]\]/;

interface ImageInfo {
    resUrl: string;
    filePath: string;
    url: string | null;
}

const AllImages = new Map<string, ImageInfo>();

function resolvePath(basePath: string, relativePath: string): string {
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

function getActiveFileDir(app: App) {
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

function getImgPath(path: string, vault: Vault) {
    const attachmentFolderPath = vault.config.attachmentFolderPath || '';
    let localPath = path;
    let file = vault.getFileByPath(path);
    if (file == null) {
        localPath = attachmentFolderPath + '/' + path;
        file = vault.getFileByPath(localPath);
    }
    if (file == null) {
        console.error('cant read image: ' + path);
        return '';
    }

    const resPath = vault.getResourcePath(file);
    if (!AllImages.has(resPath)) {
        AllImages.set(resPath, {
            resUrl: resPath,
            filePath: localPath,
            url: null
        })
    }
    return resPath;
}

function isImage(file: string) {
    file = file.toLowerCase();
    return file.endsWith('.png')
            || file.endsWith('.jpg')
            || file.endsWith('.jpeg')
            || file.endsWith('.gif')
            || file.endsWith('.bmp')
            || file.endsWith('.webp');
  }

export function LocalImageExtension(app: App) {
    AllImages.clear();
    return {
        name: 'LocalImage',
        level: 'inline',
        start(src: string) {
            const index = src.indexOf('![[')
            if (index === -1) return
            return index
        },
        tokenizer(src: string, tokens: Token[]) {
            const matches = src.match(LocalImageRegex);
            if (matches == null) return;
            if (!isImage(matches[1])) return;
            const token: Token = {
                type: 'LocalImage',
                raw: matches[0],
                href: matches[1],
                text: matches[1]
            };
            return token
        },
        renderer(img: Tokens.Image) {
            // 渲染本地图片
            const basePath = getActiveFileDir(app);
            let imgPath = '';
            if (img.href.startsWith('.')) {
                imgPath = resolvePath(basePath, img.href);
            }
            else {
                imgPath = img.href;
            }
            const src = getImgPath(imgPath, app.vault);
            return `<img src="${src}" alt="${img.text}" />`;
        }
    }
}

export async function uploadLocalImage(vault: Vault, token: string) {
    const keys = AllImages.keys();
    for (let key of keys) {
        const value = AllImages.get(key);
        if (value == null) continue;
        if (value.url != null) continue;
        const file = vault.getFileByPath(value.filePath);
        if (file == null) continue;
        const fileData = await vault.readBinary(file);
        const url = await wxUploadImage(new Blob([fileData]), file.name, token);
        value.url = url.url;
    }
}

export function replaceImages(root: HTMLElement) {
    const images = root.getElementsByTagName('img');
    const keys = AllImages.keys();
    for (let key of keys) {
        const value = AllImages.get(key);
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

export async function uploadCover(file: File, token: string) {
    const res = await wxUploadImage(file, file.name, token, 'image');
    if (res.media_id) {
        return res.media_id;
    }
    console.error('upload cover fail: ' + res.errmsg);
}