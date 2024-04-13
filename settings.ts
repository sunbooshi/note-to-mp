import { App } from 'obsidian';


export class PreviewSetting {
    defaultStyle: string;
    linkStyle: string;
    lineNumber: boolean;
    app: App;

    constructor(app: App) {
        this.app = app;
        this.defaultStyle = 'obsidian-light';
        this.linkStyle = 'inline'
        this.lineNumber = true;
    }

    loadSetting(data: any) {
        if (!data) {
            return
        }
        const { defaultStyle, linkStyle, lineNumber } = data;
        if (defaultStyle) {
            this.defaultStyle = defaultStyle;
        }
        if (linkStyle) {
            this.linkStyle = linkStyle;
        }
        if (lineNumber !== undefined) {
            this.lineNumber = lineNumber;
        }
    }

    allSettings() {
        return {
            'defaultStyle': this.defaultStyle,
            'linkStyle': this.linkStyle,
            'lineNumber': this.lineNumber,
        }
    }
}