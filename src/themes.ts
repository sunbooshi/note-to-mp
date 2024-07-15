import { App, PluginManifest, Notice, requestUrl } from "obsidian";
import * as zip from "@zip.js/zip.js";
import DefaultTheme from "./default-theme";
import DefaultHighlight from "./default-highlight";

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

export default class ThemesManager {
    app: App;
    defaultTheme: Theme = DefaultTheme;
    manifest: PluginManifest;
    themes: Theme[];
    highlights: Highlight[];
    assetsPath: string;
    themesPath: string;
    hilightPath: string;
    customCSS: string;

    constructor(app: App, manifest: PluginManifest) {
        this.app = app;
        this.manifest = manifest;
        this.assetsPath = this.app.vault.configDir + '/plugins/' + this.manifest.id + '/assets/';
        this.themesPath = this.assetsPath + 'themes/';
        this.hilightPath = this.assetsPath + 'highlights/';
    }

    async loadAssets() {
        await this.loadThemes();
        await this.loadHighlights();
        await this.loadCustomCSS();
    }

    async loadThemes() {
        try {
            const configFile = this.assetsPath + 'themes.json';
            if (!await this.app.vault.adapter.exists(configFile)) {
                new Notice('主题资源未下载，请前往设置下载！');
                this.themes = [this.defaultTheme];
                return;
            }
            const data = await this.app.vault.adapter.read(configFile);
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
            const configFile = this.assetsPath + 'custom.css';
            const cssContent = await this.app.vault.adapter.read(configFile);
            if (cssContent) {
                this.customCSS = cssContent;
            }
        } catch (error) {
            console.error(error);
            new Notice('读取CSS失败！');
        }
    }

    async loadHighlights() {
        try {
            const configFile = this.assetsPath + 'highlights.json';
            const defaultHighlight = {name: '默认', url: '', css: DefaultHighlight};
            this.highlights = [defaultHighlight];
            if (!await this.app.vault.adapter.exists(configFile)) {
                new Notice('高亮资源未下载，请前往设置下载！');
                return;
            }

            const data = await this.app.vault.adapter.read(configFile);
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

    getTheme(themeName: string) {
        for (const theme of this.themes) {
            if (theme.name === themeName || theme.className === themeName) {
                return theme;
            }
        }
    }

    getHighlight(highlightName: string) {
        for (const highlight of this.highlights) {
            if (highlight.name === highlightName) {
                return highlight;
            }
        }
    }

    getThemeURL() {
        const version = this.manifest.version;
        return `https://github.com/sunbooshi/note-to-mp/releases/download/${version}/assets.zip`;
    }

    async downloadThemes() {
        try {
            if (await this.app.vault.adapter.exists(this.assetsPath)) {
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

        this.app.vault.adapter.mkdir(this.assetsPath);

        for (const entry of entries) {
            if (entry.directory) {
                const dirPath = this.assetsPath + entry.filename;
                this.app.vault.adapter.mkdir(dirPath);
            }
            else {
                const filePath = this.assetsPath + entry.filename;
                const textWriter = new zip.TextWriter();
                if (entry.getData) {
                    const data = await entry.getData(textWriter);
                    await this.app.vault.adapter.write(filePath, data);
                }
            }
        }

        await zipReader.close();
    }

    async removeThemes() {
        try {
            if (await this.app.vault.adapter.exists(this.assetsPath)) {
                this.app.vault.adapter.rmdir(this.assetsPath, true);
                this.loadAssets();
            }
            new Notice('清空完成！');
        } catch (error) {
            console.error(error);
            new Notice('清空主题失败！');
        }
    }
}