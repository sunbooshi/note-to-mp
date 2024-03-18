import { App, Notice } from 'obsidian';

export interface CSSStyle {
    name: string
    className: string
    desc: string
    author: string
}

export class PreviewSetting {
    defaultStyle: string;
    styles: CSSStyle[];
    app: App;

    constructor(app: App) {
        this.app = app;
        this.defaultStyle = '';
    }

    loadSetting(data: any) {
        if (!data) {
            return
        }
        const { defaultStyle } = data;
        if (defaultStyle) {
            this.defaultStyle = defaultStyle;
        }
    }

    allSettings() {
        return {
            'defaultStyle': this.defaultStyle
        }
    }

    async loadStyles() {
        try {
          const data = await this.app.vault.adapter.read('.obsidian/plugins/note-to-mp/styles.json');
          if (data) {
            this.styles = JSON.parse(data);
            if (this.styles.length > 0) {
                this.defaultStyle = this.styles[0].className;
            }
          }
        } catch (error) {
          new Notice('styles.json解析失败！');
        }
    }
}