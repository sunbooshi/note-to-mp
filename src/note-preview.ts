/*
 * Copyright (c) 2024 Sun Booshi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { EventRef, ItemView, Workspace, WorkspaceLeaf, Notice, sanitizeHTMLToDom, apiVersion, TFile, Platform } from 'obsidian';
import { applyCSS } from './utils';
import { wxUploadImage } from './weixin-api';
import { NMPSettings } from './settings';
import AssetsManager from './assets';
import InlineCSS from './inline-css';
import { wxGetToken, wxAddDraft, wxBatchGetMaterial, DraftArticle } from './weixin-api';
import { MDRendererCallback } from './markdown/extension';
import { MarkedParser } from './markdown/parser';
import { LocalImageManager } from './markdown/local-file';
import { CardDataManager } from './markdown/code';

export const VIEW_TYPE_NOTE_PREVIEW = 'note-preview';

const FRONT_MATTER_REGEX = /^(---)$.+?^(---)$.+?/ims;


export class NotePreview extends ItemView implements MDRendererCallback {
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
    settings: NMPSettings;
    assetsManager: AssetsManager;
    articleHTML: string;
    title: string;
    currentTheme: string;
    currentHighlight: string;
    currentAppId: string;
    markedParser: MarkedParser;


    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.workspace = this.app.workspace;
        this.settings = NMPSettings.getInstance();
        this.assetsManager = AssetsManager.getInstance();
        this.currentTheme = this.settings.defaultStyle;
        this.currentHighlight = this.settings.defaultHighlight;
        this.markedParser = new MarkedParser(this.app, this);
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

    onAppIdChanged() {
        // 清理上传过的图片
        LocalImageManager.getInstance().cleanup();
        CardDataManager.getInstance().cleanup();
    }

    async update() {
        LocalImageManager.getInstance().cleanup();
        CardDataManager.getInstance().cleanup();
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
            if (af && af.extension.toLocaleLowerCase() === 'md') {
                md = await this.app.vault.adapter.read(af.path);
                this.title = af.basename;
            }
            else {
                md = '没有可渲染的笔记或文件不支持渲染';
            }
            if (md.startsWith('---')) {
                md = md.replace(FRONT_MATTER_REGEX, '');
            }

            this.articleHTML = await this.markedParser.parse(md);

            this.setArticle(this.articleHTML);
        }
        catch (e) {
            console.error(e);
            this.setArticle(this.errorContent(e));
        }
    }

    isOldTheme() {
        const theme = this.assetsManager.getTheme(this.currentTheme);
        if (theme) {
            return theme.css.indexOf('.note-to-mp') < 0;
        }
        return false;
    }

    setArticle(article: string) {
        this.articleDiv.empty();
        let className = 'note-to-mp';
        // 兼容旧版本样式
        if (this.isOldTheme()) {
            className = this.currentTheme;
        }
        const html = `<section class="${className}" id="article-section">${article}</section>`;
        const doc = sanitizeHTMLToDom(html);
        if (doc.firstChild) {
            this.articleDiv.appendChild(doc.firstChild);
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
        const content = this.articleDiv.innerHTML;
        const html = applyCSS(content, this.getCSS());
        return CardDataManager.getInstance().restoreCard(html);
    }

    getCSS() {
        try {
            const theme = this.assetsManager.getTheme(this.currentTheme);
            const highlight = this.assetsManager.getHighlight(this.currentHighlight);
            const customCSS = this.settings.useCustomCss ? this.assetsManager.customCSS : '';
            return `${InlineCSS}\n\n${highlight!.css}\n\n${theme!.css}\n\n${customCSS}`;
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
        let lineDiv;

        // 公众号
        if (this.settings.wxInfo.length > 1 || Platform.isDesktop) {
            lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' });
            lineDiv.createDiv({ cls: 'style-label' }).innerText = '公众号:';
            const wxSelect = lineDiv.createEl('select', { cls: 'style-select' })
            wxSelect.setAttr('style', 'width: 200px');
            wxSelect.onchange = async () => {
                this.currentAppId = wxSelect.value;
                this.onAppIdChanged();
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
        }
        else if (this.settings.wxInfo.length > 0) {
            this.currentAppId = this.settings.wxInfo[0].appid;
        }

        // 复制，刷新，带图片复制，发草稿箱
        lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' });
        if (Platform.isDesktop) {
            const copyBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
                button.setText('复制');
            })

            copyBtn.onclick = async() => {
                await this.copyArticle();
                new Notice('复制成功，请到公众号编辑器粘贴。');
            }
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
            this.setStyle(this.getCSS());
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
        if (this.settings.showStyleUI) {
            lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' }); 
            const cssStyle = lineDiv.createDiv({ cls: 'style-label' });
            cssStyle.innerText = '样式:';

            const selectBtn = lineDiv.createEl('select', { cls: 'style-select' }, async (sel) => {

            })

            selectBtn.onchange = async () => {
                this.updateStyle(selectBtn.value);
            }

            for (let s of this.assetsManager.themes) {
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

            for (let s of this.assetsManager.highlights) {
                const op = highlightStyleBtn.createEl('option');
                op.value = s.name;
                op.text = s.name;
                op.selected = s.name == this.settings.defaultHighlight;
            }
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
        this.renderDiv.setAttribute('style', '-webkit-user-select: text; user-select: text;');
        this.styleEl = this.renderDiv.createEl('style');
        this.styleEl.setAttr('title', 'note-to-mp-style');
        this.setStyle(this.getCSS());
        this.articleDiv = this.renderDiv.createEl('div');
    }

    updateStyle(styleName: string) {
        this.currentTheme = styleName;
        this.setStyle(this.getCSS());
    }

    updateHighLight(styleName: string) {
        this.currentHighlight = styleName;
        this.setStyle(this.getCSS());
    }

    getMetadata() {
        let res: DraftArticle = {
            title: '',
            author: undefined,
            digest: undefined,
            content: '',
            content_source_url: undefined,
            cover: undefined,
            thumb_media_id: '',
            need_open_comment: undefined,
            only_fans_can_comment: undefined,
            pic_crop_235_1: undefined,
            pic_crop_1_1: undefined
        }
        const file = this.app.workspace.getActiveFile();
        if (!file) return res;
        const metadata = this.app.metadataCache.getFileCache(file); 
        if (metadata?.frontmatter) {
            const frontmatter = metadata.frontmatter;
            res.title = frontmatter['标题'];
            res.author = frontmatter['作者'];
            res.digest = frontmatter['摘要'];
            res.content_source_url = frontmatter['原文地址'];
            res.cover = frontmatter['封面'];
            res.thumb_media_id = frontmatter['封面素材ID'];
            res.need_open_comment = frontmatter['打开评论'] ? 1 : undefined;
            res.only_fans_can_comment = frontmatter['仅粉丝可评论'] ? 1 : undefined;
            if (frontmatter['封面裁剪']) {
                res.pic_crop_235_1 = '0_0_1_0.5';
                res.pic_crop_1_1 = '0_0.525_0.404_1';
            }
        }
        return res;
    }

    async uploadVaultCover(name: string, token: string) {
        const LocalFileRegex = /^!\[\[(.*?)\]\]/;
        const matches = name.match(LocalFileRegex);
        let fileName = '';
        if (matches && matches.length > 1) {
            fileName = matches[1];
        }
        else {
            fileName = name;
        }
        const vault = this.app.vault;
        const file = this.assetsManager.searchFile(fileName) as TFile;
        if (!file) {
            throw new Error('找不到封面文件: ' + fileName);
        }
        const fileData = await vault.readBinary(file);
        
        return await this.uploadCover(new Blob([fileData]), file.name, token);
    }

    async uploadLocalCover(token: string) {
        const fileInput = this.coverEl;
        if (!fileInput.files || fileInput.files.length === 0) {
            throw new Error('请选择封面文件');
        }
        const file = fileInput.files[0];
        if (!file) {
            throw new Error('请选择封面文件');
        }

        return await this.uploadCover(file, file.name, token);
    }

    async uploadCover(data: Blob, filename: string, token: string,) {
        const res = await wxUploadImage(data, filename, token, 'image');
        if (res.media_id) {
            return res.media_id;
        }
        console.error('upload cover fail: ' + res.errmsg);
        throw new Error('上传封面失败: ' + res.errmsg);
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
            this.showMsg('获取token失败: ' + res.json.message);
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

        const lm = LocalImageManager.getInstance();
        // 上传图片
        await lm.uploadLocalImage(token, this.app.vault);
        // 替换图片链接
        lm.replaceImages(this.articleDiv);

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
                this.showMsg('获取token失败,请检查网络链接!');
                return;
            }
            let metadata = this.getMetadata();
            const lm = LocalImageManager.getInstance();
            // 上传图片
            await lm.uploadLocalImage(token, this.app.vault);
            // 替换图片链接
            lm.replaceImages(this.articleDiv);
            // 上传封面
            let mediaId = metadata.thumb_media_id;
            if (!mediaId) {
                if (metadata.cover) {
                    // 上传仓库里的图片
                    mediaId = await this.uploadVaultCover(metadata.cover, token);
                }
                else if (this.useLocalCover.checked) {
                    mediaId = await this.uploadLocalCover(token);
                }
                else {
                    mediaId = await this.getDefaultCover(token);
                }
            }

            if (mediaId === '') {
                this.showMsg('请先上传图片或者设置默认封面');
                return;
            }

            metadata.title = metadata.title || this.title;
            metadata.content = this.getArticleContent();
            metadata.thumb_media_id = mediaId;

            // 创建草稿
            const res = await wxAddDraft(token, metadata);

            if (res.status != 200) {
                console.error(res.text);
                this.showMsg(`创建草稿失败, https状态码: ${res.status} 可能是文章包含异常内容，请尝试手动复制到公众号编辑器！`);
                return;
            }

            const draft = res.json;
            if (draft.media_id) {
                this.showMsg('发布成功!');
            }
            else {
                console.error(JSON.stringify(draft));
                this.showMsg('发布失败!'+draft.errmsg);
            }
        } catch (error) {
            this.showMsg('发布失败!'+error.message);
        }
    }

    updateElementByID(id:string, html:string):void {
        const item = this.articleDiv.querySelector('#'+id) as HTMLElement;
        if (!item) return;
        const doc = sanitizeHTMLToDom(html);
        item.empty();
        if (doc.childElementCount > 0) {
            for (const child of doc.children) {
                item.appendChild(child.cloneNode(true)); // 使用 cloneNode 复制节点以避免移动它
            }
        }
        else {
            item.innerText = '渲染失败';
        } 
    }
}