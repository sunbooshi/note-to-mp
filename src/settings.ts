import { App } from 'obsidian';
import { wxKeyInfo } from './weixin-api';

export class PreviewSetting {
    defaultStyle: string;
    defaultHighlight: string;
    showStyleUI: boolean;
    linkStyle: string;
    embedStyle: string;
    lineNumber: boolean;
    authKey: string;
    useCustomCss: boolean;
    wxInfo: {name:string, appid:string, secret:string}[];
    app: App;
    math: string;
    expireat: Date | null = null;

    constructor(app: App) {
        this.app = app;
        this.defaultStyle = 'obsidian-light';
        this.defaultHighlight = '默认';
        this.showStyleUI = true;
        this.linkStyle = 'inline';
        this.embedStyle = 'quote';
        this.lineNumber = true;
        this.useCustomCss = false;
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
            embedStyle,
            showStyleUI,
            lineNumber,
            defaultHighlight,
            authKey,
            wxInfo,
            math,
            useCustomCss,
        } = data;

        if (defaultStyle) {
            this.defaultStyle = defaultStyle;
        }
        if (defaultHighlight) {
            this.defaultHighlight = defaultHighlight;
        }
        if (showStyleUI !== undefined) {
            this.showStyleUI = showStyleUI;
        }
        if (linkStyle) {
            this.linkStyle = linkStyle;
        }
        if (embedStyle) {
            this.embedStyle = embedStyle;
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
        if (useCustomCss !== undefined) {
            this.useCustomCss = useCustomCss;
        }
        this.getExpiredDate();
    }

    allSettings() {
        return {
            'defaultStyle': this.defaultStyle,
            'defaultHighlight': this.defaultHighlight,
            'showStyleUI': this.showStyleUI,
            'linkStyle': this.linkStyle,
            'embedStyle': this.embedStyle,
            'lineNumber': this.lineNumber,
            'authKey': this.authKey,
            'wxInfo': this.wxInfo,
            'math': this.math,
            'useCustomCss': this.useCustomCss,
        }
    }

    getExpiredDate() {
        if (this.authKey.length == 0) return;
        wxKeyInfo(this.authKey).then((res) => {
            if (res.status == 200) {
                this.expireat = new Date(res.json.expireat);
            }
        })
    }
}