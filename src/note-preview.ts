import { EventRef, ItemView, Workspace, WorkspaceLeaf, Notice, sanitizeHTMLToDom, apiVersion } from 'obsidian';
import { CSSProcess, markedParse, ParseOptions } from './utils';
import { PreviewSetting } from './settings';
import ThemesManager from './themes';
import CalloutsCSS from './callouts-css';
import { LocalImageRenderer } from './img-extension';
import { wxGetToken, wxAddDraft, wxBatchGetMaterial } from './weixin-api';
import { MathRenderer, MathRendererCallback } from './math';

export const VIEW_TYPE_NOTE_PREVIEW = 'note-preview';

const FRONT_MATTER_REGEX = /^(---)$.+?^(---)$.+?/ims;


export class NotePreview extends ItemView implements MathRendererCallback {
    workspace: Workspace;
    mainDiv: HTMLDivElement;
    toolbar: HTMLDivElement;
    renderDiv: HTMLDivElement;
    articleDiv: HTMLDivElement;
    styleEl: HTMLElement;
    coverEl: HTMLInputElement;
    useDefaultCover: HTMLInputElement;
    useLocalCover: HTMLInputElement;
    msgView: HTMLDivElement;
    listeners: EventRef[];
    container: Element;
    settings: PreviewSetting;
    themeManager: ThemesManager;
    articleHTML: string;
    title: string;
    currentTheme: string;
    currentHighlight: string;
    currentAppId: string;
    mathRenderer: MathRenderer;
    imageRenderer: LocalImageRenderer;

    constructor(leaf: WorkspaceLeaf, settings: PreviewSetting, themeManager: ThemesManager) {
        super(leaf);
        this.workspace = this.app.workspace;
        this.settings = settings
        this.themeManager = themeManager;
        this.currentTheme = this.settings.defaultStyle;
        this.currentHighlight = this.settings.defaultHighlight;
        this.mathRenderer = new MathRenderer(this, settings);
        this.imageRenderer = new LocalImageRenderer(this.app);
    }

    getViewType() {
        return VIEW_TYPE_NOTE_PREVIEW;
    }

    getIcon() {
        return 'clipboard-paste';
    }

    getDisplayText() {
        return '笔记预览';
    }

    async onOpen() {
        this.buildUI();
        this.listeners = [
            this.workspace.on('active-leaf-change', () => this.update())
        ];

        this.renderMarkdown();
    }

    async onClose() {
        this.listeners.forEach(listener => this.workspace.offref(listener));
    }

    async update() {
        this.renderMarkdown();
    }

    errorContent(error: any) {
        return '<h1>渲染失败!</h1><br/>'
        + '如需帮助请前往&nbsp;&nbsp;<a href="https://github.com/sunbooshi/note-to-mp/issues">https://github.com/sunbooshi/note-to-mp/issues</a>&nbsp;&nbsp;反馈<br/><br/>'
        + '如果方便，请提供引发错误的完整Markdown内容。<br/><br/>'
        + '<br/>Obsidian版本：' + apiVersion
        + '<br/>错误信息：<br/>'
        + `${error}`;
    }

    async renderMarkdown() {
        try {
            const af = this.app.workspace.getActiveFile();
            let md = '';
            if (af) {
                md = await this.app.vault.adapter.read(af.path);
                this.title = af.basename;
            }
            else {
                md = '没有可渲染的笔记';
            }
            if (md.startsWith('---')) {
                md = md.replace(FRONT_MATTER_REGEX, '');
            }
            const op: ParseOptions = {
                lineNumber: this.settings.lineNumber,
                linkStyle: this.settings.linkStyle as 'footnote' | 'inline',
            }
            this.articleHTML = await markedParse(md, op, [
                this.mathRenderer.blockMath(),
                this.mathRenderer.inlineMath(),
                this.imageRenderer.localImageExtension(),
            ]);

            this.setArticle(this.articleHTML);
            this.updateCss();
        }
        catch (e) {
            console.error(e);
            this.setArticle(this.errorContent(e));
        }
    }

    setArticle(article: string) {
        this.articleDiv.empty();
        const html = `<section class="${this.settings.defaultStyle}" id="article-section">${article}</section>`;
        const doc = sanitizeHTMLToDom(html);
        if (doc.firstChild) {
            this.articleDiv.appendChild(doc.firstChild);
            this.imageRenderer.replaceImages(this.articleDiv);
        }
    }

    setStyle(css: string) {
        this.styleEl.empty();
        this.styleEl.appendChild(document.createTextNode(css));
    }

    getArticleSection() {
        return this.articleDiv.querySelector('#article-section') as HTMLElement;
    }

    getArticleContent() {
        CSSProcess(this.articleDiv);
        const content = this.articleDiv.innerHTML;
        this.setArticle(this.articleHTML);
        this.updateCss();
        return content;
    }

    getCSS() {
        try {
            const theme = this.themeManager.getTheme(this.currentTheme);
            const highlight = this.themeManager.getHighlight(this.currentHighlight);
            return `${theme!.css}\n\n${highlight!.css}\n\n${CalloutsCSS}`;
        } catch (error) {
            console.error(error);
            new Notice(`获取样式失败${this.currentTheme}|${this.currentHighlight}，请检查主题是否正确安装。`);
        }
        return '';
    }

    buildMsgView(parent: HTMLDivElement) {
        this.msgView = parent.createDiv({ cls: 'msg-view' });
        const title = this.msgView.createDiv({ cls: 'msg-title' });
        title.id = 'msg-title';
        title.innerText = '加载中...';
        const okBtn = this.msgView.createEl('button', { cls: 'msg-ok-btn' }, async (button) => {
            
        });
        okBtn.id = 'msg-ok-btn';
        okBtn.innerText = '确定';
        okBtn.onclick = async () => {
            this.msgView.setAttr('style', 'display: none;');
        }
    }

    showLoading(msg: string) {
        const title = this.msgView.querySelector('#msg-title') as HTMLElement;
        title!.innerText = msg;
        const btn = this.msgView.querySelector('#msg-ok-btn') as HTMLElement;
        btn.setAttr('style', 'display: none;');
        this.msgView.setAttr('style', 'display: flex;');
    }

    showMsg(msg: string) {
        const title = this.msgView.querySelector('#msg-title') as HTMLElement;
        title!.innerText = msg;
        const btn = this.msgView.querySelector('#msg-ok-btn') as HTMLElement;
        btn.setAttr('style', 'display: block;');
        this.msgView.setAttr('style', 'display: flex;');
    }

    buildToolbar(parent: HTMLDivElement) {
        this.toolbar = parent.createDiv({ cls: 'preview-toolbar' });

        let lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' });
        // 公众号
        lineDiv.createDiv({ cls: 'style-label' }).innerText = '公众号:';
        const wxSelect = lineDiv.createEl('select', { cls: 'style-select' })
        wxSelect.setAttr('style', 'width: 200px');
        wxSelect.onchange = async () => {
            this.currentAppId = wxSelect.value;
        }
        const defautlOp =wxSelect.createEl('option');
        defautlOp.value = '';
        defautlOp.text = '请在设置里配置公众号';
        for (let i = 0; i < this.settings.wxInfo.length; i++) {
            const op = wxSelect.createEl('option');
            const wx = this.settings.wxInfo[i];
            op.value = wx.appid;
            op.text = wx.name;
            if (i== 0) {
                op.selected = true
                this.currentAppId = wx.appid;
            }
        }

        // 复制，刷新，带图片复制，发草稿箱
        lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' });
        const copyBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('复制');
        })

        copyBtn.onclick = async() => {
            await this.copyArticle();
            new Notice('复制成功，请到公众号编辑器粘贴。');
        }

        const uploadImgBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('上传图片');
        })

        uploadImgBtn.onclick = async() => {
            await this.uploadImages();
        }

        const postBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('发草稿');
        })

        postBtn.onclick = async() => {
            await this.postArticle();
        }

        const refreshBtn = lineDiv.createEl('button', { cls: 'refresh-button' }, async (button) => {
            button.setText('刷新');
        })

        refreshBtn.onclick = async () => {
            await this.renderMarkdown();
        }

        // 封面
        lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' }); 

        const coverTitle = lineDiv.createDiv({ cls: 'style-label' });
        coverTitle.innerText = '封面:';

        this.useDefaultCover = lineDiv.createEl('input', { cls: 'input-style' });
        this.useDefaultCover.setAttr('type', 'radio');
        this.useDefaultCover.setAttr('name', 'cover');
        this.useDefaultCover.setAttr('value', 'default');
        this.useDefaultCover.setAttr('checked', true);
        this.useDefaultCover.id = 'default-cover';
        this.useDefaultCover.onchange = async () => {
            if (this.useDefaultCover.checked) {
                this.coverEl.setAttr('style', 'visibility:hidden;width:0px;');
            }
            else {
                this.coverEl.setAttr('style', 'visibility:visible;width:180px;');
            }
        }
        const defaultLable = lineDiv.createEl('label');
        defaultLable.innerText = '默认';
        defaultLable.setAttr('for', 'default-cover');

        this.useLocalCover = lineDiv.createEl('input', { cls: 'input-style' });
        this.useLocalCover.setAttr('type', 'radio');
        this.useLocalCover.setAttr('name', 'cover');
        this.useLocalCover.setAttr('value', 'local');
        this.useLocalCover.id = 'local-cover';
        this.useLocalCover.setAttr('style', 'margin-left:20px;');
        this.useLocalCover.onchange = async () => {
            if (this.useLocalCover.checked) {
                this.coverEl.setAttr('style', 'visibility:visible;width:180px;');
            }
            else {
                this.coverEl.setAttr('style', 'visibility:hidden;width:0px;');
            }
        }

        const localLabel = lineDiv.createEl('label');
        localLabel.setAttr('for', 'local-cover');
        localLabel.innerText = '上传';

        this.coverEl = lineDiv.createEl('input', { cls: 'upload-input' });
        this.coverEl.setAttr('type', 'file');
        this.coverEl.setAttr('placeholder', '封面图片');
        this.coverEl.setAttr('accept', '.png, .jpg, .jpeg');
        this.coverEl.setAttr('name', 'cover');
        this.coverEl.id = 'cover-input';

        // 样式
        lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' }); 
        const cssStyle = lineDiv.createDiv({ cls: 'style-label' });
        cssStyle.innerText = '样式:';

        const selectBtn = lineDiv.createEl('select', { cls: 'style-select' }, async (sel) => {

        })

        selectBtn.onchange = async () => {
            this.updateStyle(selectBtn.value);
        }

        for (let s of this.themeManager.themes) {
            const op = selectBtn.createEl('option');
            op.value = s.className;
            op.text = s.name;
            op.selected = s.className == this.settings.defaultStyle;
        }

        const highlightStyle = lineDiv.createDiv({ cls: 'style-label' });
        highlightStyle.innerText = '代码高亮:';

        const highlightStyleBtn = lineDiv.createEl('select', { cls: 'style-select' }, async (sel) => {

        })

        highlightStyleBtn.onchange = async () => {
            this.updateHighLight(highlightStyleBtn.value);
        }

        for (let s of this.themeManager.highlights) {
            const op = highlightStyleBtn.createEl('option');
            op.value = s.name;
            op.text = s.name;
            op.selected = s.name == this.settings.defaultHighlight;
        }

        this.buildMsgView(this.toolbar);
    }

    async buildUI() {
        this.container = this.containerEl.children[1];
        this.container.empty();

        this.mainDiv = this.container.createDiv({ cls: 'note-preview' });

        this.buildToolbar(this.mainDiv);

        this.renderDiv = this.mainDiv.createDiv({cls: 'render-div'});
        this.renderDiv.id = 'render-div';
        this.renderDiv.setAttribute('style', '-webkit-user-select: text; user-select: text;')
        this.styleEl = this.renderDiv.createEl('style');
        this.styleEl.setAttr('title', 'note-to-mp-style');
        this.articleDiv = this.renderDiv.createEl('div');
    }

    updateStyle(styleName: string) {
        this.currentTheme = styleName;
        this.updateCss();
    }

    updateHighLight(styleName: string) {
        this.currentHighlight = styleName;
        this.updateCss();
    }

    updateCss() {
        this.setStyle(this.getCSS());
        this.getArticleSection().setAttribute('class', this.currentTheme);
    }

    async uploadLocalCover(token: string) {
        const fileInput = this.coverEl;
        if (!fileInput.files || fileInput.files.length === 0) {
            return '';
        }
        const file = fileInput.files[0];
        if (!file) {
            return '';
        }

        return await this.imageRenderer.uploadCover(file, token);
    }

    async getDefaultCover(token: string) {
        const res = await wxBatchGetMaterial(token, 'image');
        if (res.item_count > 0) {
            return res.item[0].media_id;
        }
        return '';
    }

    async getToken() {
        const res = await wxGetToken(this.settings.authKey, this.currentAppId, this.getSecret());
        if (res.status != 200) {
            const data = res.json;
            this.showMsg('获取token失败: ' + data.message);
            return '';
        }
        const token = res.json.token;
        if (token === '') {
            this.showMsg('获取token失败');
        }
        return token;
    }

    async uploadImages() {
        if (!this.settings.authKey) {
            this.showMsg('请先设置注册码（AuthKey）');
            return;
        }
        if (this.currentAppId === '') {
            this.showMsg('请先选择公众号');
            return;
        }
        this.showLoading('上传图片中...');
        // 获取token
        const token = await this.getToken();
        if (token === '') {
            return;
        }
        // 上传图片
        await this.imageRenderer.uploadLocalImage(token);
        // 替换图片链接
        this.imageRenderer.replaceImages(this.articleDiv);

        await this.copyArticle();
        this.showMsg('图片已上传，并且已复制，请到公众号编辑器粘贴。');
    }

    async copyArticle() {
        const content = this.getArticleContent();
        await navigator.clipboard.write([new ClipboardItem({
            'text/html': new Blob([content], {type: 'text/html'})
        })])
    }

    getSecret() {
        for (const wx of this.settings.wxInfo) {
            if (wx.appid === this.currentAppId) {
                return wx.secret.replace('SECRET', '');
            }
        }
        return '';
    }

    async postArticle() {
        if (!this.settings.authKey) {
            this.showMsg('请先设置注册码（AuthKey）');
            return;
        }
        if (this.currentAppId === '') {
            this.showMsg('请先选择公众号');
            return;
        }
        this.showLoading('上传中...');
        try {
            // 获取token
            const token = await this.getToken();
            if (token === '') {
                this.showMsg('获取token失败');
                return;
            }
            //上传图片
            await this.imageRenderer.uploadLocalImage(token);
            // 替换图片链接
            this.imageRenderer.replaceImages(this.articleDiv);
            // 上传封面
            let mediaId = '';
            if (this.useLocalCover.checked) {
                mediaId = await this.uploadLocalCover(token);
            }
            else {
                mediaId = await this.getDefaultCover(token);
            }

            if (mediaId === '') {
                this.showMsg('请先上传图片或者设置默认封面');
                return;
            }

            const content = this.getArticleContent();

            // 创建草稿
            const draft = await wxAddDraft(token, {
                title: this.title,
                content: content,
                thumb_media_id: mediaId,
            });

            if (draft.media_id) {
                this.showMsg('发布成功!');
            }
            else {
                this.showMsg('发布失败!'+draft.errmsg);
            }
        } catch (error) {
            this.showMsg('发布失败!'+error.message);
        }
    }

    updateMath(id: string, svg: string): void {
        const span = this.articleDiv.querySelector('#'+id) as HTMLElement;
        if (!span) return;
        const doc = sanitizeHTMLToDom(svg);
        span.empty();
        if (doc.firstChild) {
            span.appendChild(doc.firstChild);
        }
        else {
            span.innerText = '渲染失败';
        }
    }
}