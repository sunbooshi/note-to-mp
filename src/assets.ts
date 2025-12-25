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

import { App, PluginManifest, Notice, requestUrl, FileSystemAdapter, TAbstractFile, TFile, TFolder } from "obsidian";
import * as zip from "@zip.js/zip.js";
import DefaultTheme from "./default-theme";
import DefaultHighlight from "./default-highlight";
import { NMPSettings } from "./settings";
import { ExpertSettings, defaultExpertSettings, expertSettingsFromString } from "./expert-settings";


export interface Theme {
    name: string
    className: string
    desc: string
    author: string
    css: string
}

export interface Highlight {
    name: string
    url: string
    css: string
}

export default class AssetsManager {
    app: App;
    defaultTheme: Theme = DefaultTheme;
    manifest: PluginManifest;
    themes: Theme[];
    highlights: Highlight[];
    assetsPath: string;
    themesPath: string;
    hilightPath: string;
    customCSS: string = '';
    themeCfg: string;
    hilightCfg: string;
    iconsPath: string;
    wasmPath: string;
    expertSettings: ExpertSettings;
    isLoaded: boolean = false;

    private static instance: AssetsManager;

    // 静态方法，用于获取实例
    public static getInstance(): AssetsManager {
        if (!AssetsManager.instance) {
            AssetsManager.instance = new AssetsManager();
        }
        return AssetsManager.instance;
    }

    public static setup(app: App, manifest: PluginManifest) {
        AssetsManager.getInstance()._setup(app, manifest);
    }

    private _setup(app: App, manifest: PluginManifest) {
        this.app = app;
        this.manifest = manifest;
        this.assetsPath = this.app.vault.configDir + '/plugins/' + this.manifest.id + '/assets/';
        this.themesPath = this.assetsPath + 'themes/';
        this.hilightPath = this.assetsPath + 'highlights/';
        this.themeCfg = this.assetsPath + 'themes.json';
        this.hilightCfg = this.assetsPath + 'highlights.json';
        this.iconsPath = this.assetsPath + 'icons/';
        this.wasmPath = this.assetsPath + 'lib.wasm';
    }

    private constructor() {

    }

    async loadAssets() {
        await this.loadThemes();
        await this.loadHighlights();
        await this.loadCustomCSS();
        await this.loadExpertSettings();
        this.isLoaded = true;
    }

    async loadThemes() {
        try {
            if (!await this.app.vault.adapter.exists(this.themeCfg)) {
                new Notice('主题资源未下载，请前往设置下载！');
                this.themes = [this.defaultTheme];
                return;
            }
            const data = await this.app.vault.adapter.read(this.themeCfg);
            if (data) {
                const themes = JSON.parse(data);
                await this.loadCSS(themes);
                this.themes = [this.defaultTheme, ... themes];
            }
        } catch (error) {
            console.error(error);
            new Notice('themes.json解析失败！');
        }
    }

    async loadCSS(themes: Theme[]) {
        try {
            for (const theme of themes) {
                const cssFile = this.themesPath + theme.className + '.css';
                const cssContent = await this.app.vault.adapter.read(cssFile);
                if (cssContent) {
                    theme.css = cssContent;
                }
            }
        } catch (error) {
            console.error(error);
            new Notice('读取CSS失败！');
        }
    }

    async loadCustomCSS() {
        try {
            const customCSSNote = NMPSettings.getInstance().customCSSNote;
            if (customCSSNote != '') {
                const css = await this.loadCSSFromNote(customCSSNote);
                if (css != null) {
                    this.customCSS = css;
                }
                else {
                    new Notice(customCSSNote + '自定义CSS文件不存在！');
                }
                return;
            }
        } catch (error) {
            console.error(error);
            new Notice('读取CSS失败！');
        }
    }

    async loadCSSFromNote(note: string) {
        const file = this.searchFile(note);
        if (file) {
            const cssContent = await this.app.vault.adapter.read(file.path);
            if (cssContent) {
                return cssContent.replace(/```css/gi, '').replace(/```/g, '');
            }
        }
        return null;
    }

    async loadExpertSettings() {
        try {
            const note = NMPSettings.getInstance().expertSettingsNote;
            if (note != '') {
                const file = this.searchFile(note);
                if (file) {
                    let content = await this.app.vault.adapter.read(file.path);
                    if (content) {
                        this.expertSettings = expertSettingsFromString(content);
                    }
                    else {
                        this.expertSettings = defaultExpertSettings;
                        new Notice(note + '专家设置文件内容为空！');
                    }
                }
                else {
                    this.expertSettings = defaultExpertSettings;
                    new Notice(note + '专家设置不存在！');
                }
            }
            else {
                this.expertSettings = defaultExpertSettings;
            }
        } catch (error) {
            console.error(error);
            new Notice('读取专家设置失败！');
        }
    }

    async loadHighlights() {
        try {
            const defaultHighlight = {name: '默认', url: '', css: DefaultHighlight};
            this.highlights = [defaultHighlight];
            if (!await this.app.vault.adapter.exists(this.hilightCfg)) {
                new Notice('高亮资源未下载，请前往设置下载！');
                return;
            }

            const data = await this.app.vault.adapter.read(this.hilightCfg);
            if (data) {
                const items = JSON.parse(data);
                for (const item of items) {
                    const cssFile = this.hilightPath + item.name + '.css';
                    const cssContent = await this.app.vault.adapter.read(cssFile);
                    this.highlights.push({name: item.name, url: item.url, css: cssContent});
                }
            }
        }
        catch (error) {
            console.error(error);
            new Notice('highlights.json解析失败！');
        }
    }

    async loadIcon(name: string) {
        const icon = this.iconsPath + name + '.svg';
        if (!await this.app.vault.adapter.exists(icon)) {
            return '';
        }
        const iconContent = await this.app.vault.adapter.read(icon);
        if (iconContent) {
            return iconContent;
        }
        return '';
    }

    async loadWasm() {
        if (!await this.app.vault.adapter.exists(this.wasmPath)) {
            return null;
        }
        const wasmContent = await this.app.vault.adapter.readBinary(this.wasmPath);
        if (wasmContent) {
            return wasmContent;
        }
        return null;
    }

    getTheme(themeName: string) {
        if (themeName === '') {
            return this.themes[0];
        }

        for (const theme of this.themes) {
            if (theme.name.toLowerCase() === themeName.toLowerCase() || theme.className.toLowerCase() === themeName.toLowerCase()) {
                return theme;
            }
        }
    }

    getHighlight(highlightName: string) {
        if (highlightName === '') {
            return this.highlights[0];
        }

        for (const highlight of this.highlights) {
            if (highlight.name.toLowerCase() === highlightName.toLowerCase()) {
                return highlight;
            }
        }
    }

    getThemeURL() {
        const version = this.manifest.version;
        return `https://github.com/sunbooshi/note-to-mp/releases/download/${version}/assets.zip`;
    }

    async getStyle() {
        const file = this.app.vault.configDir + '/plugins/' + this.manifest.id + '/styles.css';
        if (!await this.app.vault.adapter.exists(file)) {
            return '';
        }
        const data = await this.app.vault.adapter.read(file);
        if (data) {
            return data;
        }
        return '';
    }

    async downloadThemes() {
        try {
            if (await this.app.vault.adapter.exists(this.themeCfg)) {
                new Notice('主题资源已存在！')
                return;
            }
            const res = await requestUrl(this.getThemeURL());
            const data = res.arrayBuffer;
            await this.unzip(new Blob([data]));
            await this.loadAssets();
            new Notice('主题下载完成！');
        } catch (error) {
            console.error(error);
            await this.removeThemes();
            new Notice('主题下载失败, 请检查网络！');
        }
    }

    async unzip(data:Blob) {
        const zipFileReader = new zip.BlobReader(data);
        const zipReader = new zip.ZipReader(zipFileReader);
        const entries = await zipReader.getEntries();

        if (!await this.app.vault.adapter.exists(this.assetsPath)) {
            await this.app.vault.adapter.mkdir(this.assetsPath);
        }

        for (const entry of entries) {
            if (entry.directory) {
                const dirPath = this.assetsPath + entry.filename;
                await this.app.vault.adapter.mkdir(dirPath);
            }
            else {
                const filePath = this.assetsPath + entry.filename;
                const blobWriter = new zip.Uint8ArrayWriter();
                if (entry.getData) {
                    const data = await entry.getData(blobWriter);
                    await this.app.vault.adapter.writeBinary(filePath, data.buffer as ArrayBuffer);
                }
            }
        }

        await zipReader.close();
    }

    async removeThemes() {
        try {
            const adapter = this.app.vault.adapter;
            if (await adapter.exists(this.themeCfg)) {
                await adapter.remove(this.themeCfg);
            }
            if (await adapter.exists(this.hilightCfg)) {
                await adapter.remove(this.hilightCfg);
            }
            if (await adapter.exists(this.themesPath)) {
                await adapter.rmdir(this.themesPath, true);
            }
            if (await adapter.exists(this.hilightPath)) {
                await adapter.rmdir(this.hilightPath, true);
            }
            await this.loadAssets();
            new Notice('清空完成！');
        } catch (error) {
            console.error(error);
            new Notice('清空主题失败！');
        }
    }

    async openAssets() {
	    const path = require('path');
        const adapter = this.app.vault.adapter as FileSystemAdapter;
		const vaultRoot = adapter.getBasePath();
		const assets = this.assetsPath;
        if (!await adapter.exists(assets)) {
            await adapter.mkdir(assets);
        }
		const dst = path.join(vaultRoot, assets);
		const { shell } = require('electron');
		shell.openPath(dst);
	}

    searchFile(nameOrPath: string, base: TFile|null = null): TAbstractFile | null {
        // 先按相对路径或者当前目录下找
        let file = this.app.metadataCache.getFirstLinkpathDest(nameOrPath, base ? base.path : '');
        if (file) {
            return file;
        }

        const vault= this.app.vault;
        const attachmentFolderPath = vault.config.attachmentFolderPath || '';
        let localPath = nameOrPath;

        // 在根目录查找
        file = vault.getFileByPath(nameOrPath);
        if (file) {
            return file; 
        }

        // 从附件文件夹查找
        if (attachmentFolderPath != '') {
            localPath = attachmentFolderPath + '/' + nameOrPath;
            file = vault.getFileByPath(localPath)
            if (file) {
                return file;
            }
        }

        // 最后查找所有文件，这里只需要判断文件名
        const files = vault.getAllLoadedFiles();
        for (let f of files) {
            if (f instanceof TFolder) continue
            file = f as TFile;
            if (file.basename === nameOrPath || file.name === nameOrPath) {
                return f;
            }
        }

        return null;
    }

    getResourcePath(path: string, base: TFile|null = null): {resUrl:string, filePath:string}|null {
        const file = this.searchFile(path, base) as TFile;
        if (file == null) {
            return null;
        }
        const resUrl = this.app.vault.getResourcePath(file);
        return {resUrl, filePath: file.path};
    }

    resolvePath(relativePath: string, af: TFile|null = null): string {
        // 如果relativePath是绝对路径（以/开头），直接返回
        if (relativePath.startsWith('/')) {
            return relativePath;
        }

        if (!relativePath.includes('/')) {
            return relativePath;
        }
        
        // 如果relativePath不包含任何路径分隔符或相对路径符号，则认为它是同一目录下的文件名
        const isSimpleFilename = !relativePath.includes('/') && !relativePath.includes('./') && !relativePath.includes('../');
        if (isSimpleFilename) {
            const basePath = this.getActiveFileDir(af);
            // 如果没有基础路径，直接返回relativePath
            if (!basePath) {
                return relativePath;
            }
            // 将文件名附加到基础路径
            return basePath + "/" + relativePath;
        }
        
        const basePath = this.getActiveFileDir(af);
        // 如果没有基础路径，无法解析相对路径
        if (!basePath) {
            return relativePath;
        }
        
        // 将基础路径和相对路径组合
        const fullPath = basePath + "/" + relativePath;
        const stack: string[] = [];
        const parts = fullPath.split("/");

        for (const part of parts) {
            if (part === "." || part === "") continue;
            if (part === "..") {
                if (stack.length > 0) {
                    stack.pop();
                }
            } else {
                stack.push(part);
            }
        }
        return stack.join("/");
    }

    getActiveFileDir(af: TFile|null = null) {
        if (!af) {
            console.warn('getActiveFileDir: active file is null');
        }
        af = af || this.app.workspace.getActiveFile();
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

    async readFileBinary(path: string) {
        const vault= this.app.vault;
        const file = this.searchFile(path) as TFile;
        if (file == null) {
            return null;
        }
        return await vault.readBinary(file);
    }
}