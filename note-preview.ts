import { EventRef, ItemView, Workspace, WorkspaceLeaf, Notice } from 'obsidian';
import { copy } from 'clipboard';
import { CSSProcess, markedParse, ParseOptions } from 'utils';
import { PreviewSetting } from 'settings';
import ThemesManager from 'themes';
import { uploadLocalImage, replaceImages, uploadCover } from 'img-extension';
import { wxGetToken, wxAddDraft, wxBatchGetMaterial } from 'weixin-api';

export const VIEW_TYPE_NOTE_PREVIEW = 'note-preview';

const FRONT_MATTER_REGEX = /^(---)$.+?^(---)$.+?/ims;


export class NotePreview extends ItemView {
    workspace: Workspace;
    mainDiv: HTMLDivElement;
    toolbar: HTMLDivElement;
    renderDiv: HTMLDivElement;
    renderSection: HTMLElement;
    styleEl: HTMLElement;
    coverEl: HTMLInputElement;
    useDefaultCover: HTMLInputElement;
    useLocalCover: HTMLInputElement;
    msgView: HTMLDivElement;
    listeners: EventRef[];
    container: Element;
    settings: PreviewSetting;
    themeManager: ThemesManager;
    title: string;
    currentTheme: string;
    currentHighlight: string;

    constructor(leaf: WorkspaceLeaf, settings: PreviewSetting, themeManager: ThemesManager) {
        super(leaf);
        this.workspace = this.app.workspace;
        this.settings = settings
        this.themeManager = themeManager;
        this.currentTheme = this.settings.defaultStyle;
        this.currentHighlight = this.settings.defaultHighlight;
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
        + '错误信息：<br/>'
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
            this.styleEl.innerHTML = this.getCSS();
            const op: ParseOptions = {
                lineNumber: this.settings.lineNumber,
                linkStyle: this.settings.linkStyle as 'footnote' | 'inline',
            }
            this.renderSection.innerHTML = await markedParse(md, op, this.app);
        }
        catch (e) {
            console.error(e);
            this.renderSection.innerHTML = this.errorContent(e);
        }
    }

    getCSS() {
        try {
            const theme = this.themeManager.getTheme(this.currentTheme);
            const highlight = this.themeManager.getHighlight(this.currentHighlight);
            return `${theme!.css}\n\n${highlight!.css}`;
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
        // 复制，刷新，带图片复制，发草稿箱
        const copyBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('复制');
        })

        copyBtn.onclick = async () => {
            copy(this.renderDiv);
            new Notice('复制成功，请到公众号编辑器粘贴。');
        }

        const uploadImgBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('上传图片');
        })

        uploadImgBtn.onclick = async () => {
            this.uploadImages();
        }

        const postBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('发草稿');
        })

        postBtn.onclick = async () => {
            this.postArticle();
        }

        const refreshBtn = lineDiv.createEl('button', { cls: 'refresh-button' }, async (button) => {
            button.setText('刷新');
        })

        refreshBtn.onclick = async () => {
            this.renderMarkdown();
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
                this.coverEl.setAttr('style', 'visibility:hidden;');
            }
            else {
                this.coverEl.setAttr('style', 'visibility:visible;');
            }
        }
        const defaultLable = lineDiv.createEl('label');
        defaultLable.innerText = '默认封面';
        defaultLable.setAttr('for', 'default-cover');

        this.useLocalCover = lineDiv.createEl('input', { cls: 'input-style' });
        this.useLocalCover.setAttr('type', 'radio');
        this.useLocalCover.setAttr('name', 'cover');
        this.useLocalCover.setAttr('value', 'local');
        this.useLocalCover.id = 'local-cover';
        this.useLocalCover.setAttr('style', 'margin-left:20px;');
        this.useLocalCover.onchange = async () => {
            if (this.useLocalCover.checked) {
                this.coverEl.setAttr('style', 'visibility:visible;');
            }
            else {
                this.coverEl.setAttr('style', 'visibility:hidden;');
            }
        }

        const localLabel = lineDiv.createEl('label');
        localLabel.setAttr('for', 'local-cover');
        localLabel.innerText = '上传封面';

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
            console.log(selectBtn.value);
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
            console.log(highlightStyleBtn.value);
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

        this.renderSection = this.renderDiv.createEl('section', { cls: this.settings.defaultStyle });
        // 加入1个高度为0的section，确保复制到公众号编辑器中是section元素，这样才能把背景颜色带过去
        let dummySection = this.renderDiv.createEl('section');
        dummySection.innerHTML="&nbsp;&nbsp;"
        dummySection.setAttr('style', 'height:0px;');
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
        this.styleEl.innerHTML = this.getCSS();
        this.renderSection.setAttribute('class', this.currentTheme);
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

        return await uploadCover(file, token);
    }

    async getDefaultCover(token: string) {
        const res = await wxBatchGetMaterial(token, 'image');
        if (res.item_count > 0) {
            return res.item[0].media_id;
        }
        return '';
    }

    async uploadImages() {
        if (!this.settings.authKey) {
            this.showMsg('请先设置授权key');
            return;
        }
        this.showLoading('上传图片中...');
        // 获取token
        const token = await wxGetToken(this.settings.authKey); 
        // 上传图片
        await uploadLocalImage(this.app.vault, token);
        // 替换图片链接
        this.renderDiv.innerHTML = replaceImages(this.renderDiv.innerHTML);

        copy(this.renderDiv);
        this.showMsg('图片已上传，并且已复制，请到公众号编辑器粘贴。');
    }

    async postArticle() {
        if (!this.settings.authKey) {
            this.showMsg('请先设置授权key');
            return;
        }
        this.showLoading('上传中...');
        // 获取token
        const token = await wxGetToken(this.settings.authKey);

        //上传图片
        await uploadLocalImage(this.app.vault, token);
        // 替换图片链接
        this.renderDiv.innerHTML = replaceImages(this.renderDiv.innerHTML);
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

        const originContent = this.renderDiv.innerHTML;
        CSSProcess(this.renderDiv);
        const content = this.renderDiv.innerHTML;
        this.renderDiv.innerHTML = originContent;

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
    }
}