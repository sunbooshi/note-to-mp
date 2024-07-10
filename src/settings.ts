import defaultHighlight from './default-highlight';
import { App } from 'obsidian';


export class PreviewSetting {
    defaultStyle: string;
    defaultHighlight: string;
    linkStyle: string;
    lineNumber: boolean;
    authKey: string;
    wxInfo: {name:string, appid:string, secret:string}[];
    app: App;
    math: string;

    constructor(app: App) {
        this.app = app;
        this.defaultStyle = 'obsidian-light';
        this.defaultHighlight = '默认';
        this.linkStyle = 'inline'
        this.lineNumber = true;
        this.authKey = '';
        this.wxInfo = [];
        this.math = 'latex';
    }

    resetStyelAndHighlight() {
        this.defaultStyle = 'obsidian-light';
        this.defaultHighlight = '默认';
    }

    loadSetting(data: any) {
        if (!data) {
            return
        }
        const {
            defaultStyle,
            linkStyle,
            lineNumber,
            defaultHighlight,
            authKey,
            wxInfo,
            math,
        } = data;

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
        if (wxInfo) {
            this.wxInfo = wxInfo;
        }
        if (math) {
            this.math = math;
        }
    }

    allSettings() {
        return {
            'defaultStyle': this.defaultStyle,
            'defaultHighlight': this.defaultHighlight,
            'linkStyle': this.linkStyle,
            'lineNumber': this.lineNumber,
            'authKey': this.authKey,
            'wxInfo': this.wxInfo,
            'math': this.math,
        }
    }
}