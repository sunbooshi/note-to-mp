import { App, Notice } from "obsidian";

export interface Theme {
    name: string
    className: string
    desc: string
    author: string
    css: string
}

export default class ThemesManager {
    app: App;
    defaultTheme: string;
    themes: Theme[];

    constructor(app: App) {
        this.app = app;
    }

    async loadThemes() {
        try {
            const data = await this.app.vault.adapter.read('.obsidian/plugins/note-to-mp/themes.json');
            if (data) {
                this.themes = JSON.parse(data);
                if (this.themes.length > 0) {
                    this.defaultTheme = this.themes[0].className;
                }
                await this.loadCSS();
            }
        } catch (error) {
            new Notice('themes.json解析失败！');
        }
    }

    async loadCSS() {
        try {
            const themesPath = '.obsidian/plugins/note-to-mp/themes/';

            for (const theme of this.themes) {
                const cssFile = themesPath + theme.className + '.css';
                const cssContent = await this.app.vault.adapter.read(cssFile);
                if (cssContent) {
                    theme.css = cssContent;
                }
            }

        } catch (error) {
            new Notice('themes.json解析失败！');
        }
    }

    getTheme(themeName: string) { 
        for (const theme of this.themes) {
            if (theme.name === themeName) {
                return theme;
            }
        }
    }
}