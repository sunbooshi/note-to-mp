import { App, PluginManifest, Notice, requestUrl } from "obsidian";
import * as zip from "@zip.js/zip.js";
import DefaultTheme from "default-theme";

export interface Theme {
    name: string
    className: string
    desc: string
    author: string
    css: string
}

export default class ThemesManager {
    app: App;
    defaultTheme: Theme = DefaultTheme;
    manifest: PluginManifest;
    themes: Theme[];
    assetsPath = '.obsidian/plugins/note-to-mp/assets/';
    themesPath = this.assetsPath + 'themes/';
    hilightPath = this.assetsPath + 'hilights/';

    constructor(app: App, manifest: PluginManifest) {
        this.app = app;
        this.manifest = manifest;
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
                this.themes = [this.defaultTheme, ... JSON.parse(data)];
                await this.loadCSS();
            }
        } catch (error) {
            new Notice('themes.json解析失败！');
        }
    }

    async loadCSS() {
        try {
            for (const theme of this.themes) {
                if (theme.className === this.defaultTheme.className) continue;
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

    getTheme(themeName: string) { 
        for (const theme of this.themes) {
            if (theme.name === themeName) {
                return theme;
            }
        }
    }

    getThemeURL() {
        const version = this.manifest.version;
        return `https://github.com/sunbooshi/note-to-mp/releases/download/${version}/assets.zip`;
        // return 'https://github.com/sunbooshi/note-to-mp/releases/download/1.0.3/note-to-mp.zip';
    }

    async downloadThemes() {
        try {
            console.log('下载主题');
            if (await this.app.vault.adapter.exists(this.assetsPath)) {
                new Notice('主题资源已存在！')
                return;
            }
            const res = await requestUrl(this.getThemeURL());
            const data = res.arrayBuffer;
            console.log('下载成功');
            await this.unzip(new Blob([data]));
            await this.loadThemes();
            new Notice('主题下载完成！');
        } catch (error) {
            console.log('下载失败');
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
                console.log(entry.filename);
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
                this.loadThemes();
            }
            new Notice('清空完成！');
        } catch (error) {
            console.error(error);
            new Notice('清空主题失败！');
        }
    }
}