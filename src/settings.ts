import { wxKeyInfo } from './weixin-api';

export class NMPSettings {
    defaultStyle: string;
    defaultHighlight: string;
    showStyleUI: boolean;
    linkStyle: string;
    embedStyle: string;
    lineNumber: boolean;
    authKey: string;
    useCustomCss: boolean;
    wxInfo: {name:string, appid:string, secret:string}[];
    math: string;
    expireat: Date | null = null;

    private static instance: NMPSettings;

    // 静态方法，用于获取实例
    public static getInstance(): NMPSettings {
        if (!NMPSettings.instance) {
            NMPSettings.instance = new NMPSettings();
        }
        return NMPSettings.instance;
    }

    private constructor() {
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

    public static loadSettings(data: any) {
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

        const settings = NMPSettings.getInstance();
        if (defaultStyle) {
            settings.defaultStyle = defaultStyle;
        }
        if (defaultHighlight) {
            settings.defaultHighlight = defaultHighlight;
        }
        if (showStyleUI !== undefined) {
            settings.showStyleUI = showStyleUI;
        }
        if (linkStyle) {
            settings.linkStyle = linkStyle;
        }
        if (embedStyle) {
            settings.embedStyle = embedStyle;
        }
        if (lineNumber !== undefined) {
            settings.lineNumber = lineNumber;
        }
        if (authKey) {
            settings.authKey = authKey;
        }
        if (wxInfo) {
            settings.wxInfo = wxInfo;
        }
        if (math) {
            settings.math = math;
        }
        if (useCustomCss !== undefined) {
            settings.useCustomCss = useCustomCss;
        }
        settings.getExpiredDate();
    }

    public static allSettings() {
        const settings = NMPSettings.getInstance();
        return {
            'defaultStyle': settings.defaultStyle,
            'defaultHighlight': settings.defaultHighlight,
            'showStyleUI': settings.showStyleUI,
            'linkStyle': settings.linkStyle,
            'embedStyle': settings.embedStyle,
            'lineNumber': settings.lineNumber,
            'authKey': settings.authKey,
            'wxInfo': settings.wxInfo,
            'math': settings.math,
            'useCustomCss': settings.useCustomCss,
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

    isAuthKeyVaild() {
        if (this.authKey.length == 0) return false;
        if (this.expireat == null) return false;
        return this.expireat > new Date();
    }
}