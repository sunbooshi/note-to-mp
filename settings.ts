import defaultHighlight from 'default-highlight';
import { App } from 'obsidian';


export class PreviewSetting {
    defaultStyle: string;
    defaultHighlight: string;
    linkStyle: string;
    lineNumber: boolean;
    authKey: string;
    app: App;

    constructor(app: App) {
        this.app = app;
        this.defaultStyle = 'obsidian-light';
        this.defaultHighlight = '默认';
        this.linkStyle = 'inline'
        this.lineNumber = true;
        this.authKey = '';
    }

    resetStyelAndHighlight() {
        this.defaultStyle = 'obsidian-light';
        this.defaultHighlight = '默认';
    }

    loadSetting(data: any) {
        if (!data) {
            return
        }
        const { defaultStyle, linkStyle, lineNumber, defaultHighlight, authKey } = data;
        if (defaultStyle) {
            this.defaultStyle = defaultStyle;
        }
        if (defaultHighlight) {
            this.defaultHighlight = defaultHighlight;
        }
        if (linkStyle) {
            this.linkStyle = linkStyle;
        }
        if (lineNumber !== undefined) {
            this.lineNumber = lineNumber;
        }
        if (authKey) {
            this.authKey = authKey;
        }
    }

    allSettings() {
        return {
            'defaultStyle': this.defaultStyle,
            'defaultHighlight': this.defaultHighlight,
            'linkStyle': this.linkStyle,
            'lineNumber': this.lineNumber,
            'authKey': this.authKey,
        }
    }
}