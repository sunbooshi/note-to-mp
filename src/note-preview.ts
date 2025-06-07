/*
 * Copyright (c) 2024-2025 Sun Booshi
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

import { EventRef, ItemView, Workspace, WorkspaceLeaf, Notice, sanitizeHTMLToDom, apiVersion, TFile, Platform, Editor, MarkdownView, MarkdownFileInfo } from 'obsidian';
import { EditorView } from "@codemirror/view";
import { applyCSS, uevent } from './utils';
import { UploadImageToWx } from './imagelib';
import { NMPSettings } from './settings';
import AssetsManager from './assets';
import InlineCSS from './inline-css';
import { wxGetToken, wxAddDraft, wxBatchGetMaterial, DraftArticle, DraftImageMediaId, DraftImages, wxAddDraftImages } from './weixin-api';
import { MDRendererCallback } from './markdown/extension';
import { MarkedParser } from './markdown/parser';
import { LocalImageManager, LocalFile } from './markdown/local-file';
import { CardDataManager, CodeRenderer } from './markdown/code';
import { debounce } from './utils';
import { PrepareImageLib, IsImageLibReady, WebpToJPG } from './imagelib';

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
    _currentTheme: string;
    _currentHighlight: string;
    _currentAppId: string;
    markedParser: MarkedParser;
    observer: MutationObserver | null = null;
    editorView: EditorView | null = null;
    debouncedRenderMarkdown: (...args: any[]) => void;


    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.workspace = this.app.workspace;
        this.settings = NMPSettings.getInstance();
        this.assetsManager = AssetsManager.getInstance();
        this.currentTheme = this.settings.defaultStyle;
        this.currentHighlight = this.settings.defaultHighlight;
        this.markedParser = new MarkedParser(this.app, this);
        this.debouncedRenderMarkdown = debounce(this.renderMarkdown.bind(this), 1000);
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

        this.setupMutationObserver();
        this.renderMarkdown();
        uevent('open');
    }

    async onClose() {
        this.listeners.forEach(listener => this.workspace.offref(listener));
        this.releaseMutationObserver();
        LocalFile.fileCache.clear();
        uevent('close');
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
        this.setupMutationObserver();
    }

    setupMutationObserver() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        // @ts-expect-error, not typed
        const editorView = view?.editor?.cm as EditorView;
        if (!editorView) return;

        if (this.editorView === editorView) {
            return;
        }
        
        this.releaseMutationObserver();
        this.editorView = editorView;
        const targetElement = editorView.dom;

        const renderIfExcalidraw = (target: HTMLElement) => {
            if (target.getAttribute('src')?.includes('.excalidraw')) {
                const name = target.getAttribute('src') || '';
                if (LocalFile.fileCache.has(name)) {
                    return;
                }
                this.debouncedRenderMarkdown();
            }
        };
        this.observer = new MutationObserver((mutationsList) => {
            mutationsList.forEach((mutation) => {
                try {
                    const target = mutation.target as HTMLElement;
                    if (target.classList.contains('internal-embed')){
                        renderIfExcalidraw(target);
                    }
                    else {
                        const items = target.getElementsByClassName('internal-embed');
                        for (let i = 0; i < items.length; i++) {
                            renderIfExcalidraw(items[i] as HTMLElement);
                        };
                    }
                } catch (error) {
                    console.error(error);
                }
            });
        });

        // 开始监听目标元素的 DOM 变化
        this.observer.observe(targetElement, {
            attributes: true,       // 监听属性变化
            childList: true,        // 监听子节点的变化
            subtree: true,          // 监听子树中的节点变化
        });
    }

    releaseMutationObserver() {
        this.observer?.disconnect();
        this.observer = null;
        this.editorView = null;
    }

    errorContent(error: any) {
        return '<h1>渲染失败!</h1><br/>'
        + '如需帮助请前往&nbsp;&nbsp;<a href="https://github.com/sunbooshi/note-to-mp/issues">https://github.com/sunbooshi/note-to-mp/issues</a>&nbsp;&nbsp;反馈<br/><br/>'
        + '如果方便，请提供引发错误的完整Markdown内容。<br/><br/>'
        + '<br/>Obsidian版本：' + apiVersion
        + '<br/>错误信息：<br/>'
        + `${error}`;
    }

    set currentTheme(value: string) {
        this._currentTheme = value;
    }

    get currentTheme() {
        const { theme } = this.getMetadata();
        if (theme) {
            return theme;
        }
        return this._currentTheme;
    }

    set currentHighlight(value: string) {
        this._currentHighlight = value;
    }

    get currentHighlight() {
        const { highlight } = this.getMetadata();
        if (highlight) {
            return highlight;
        }
        return this._currentHighlight;
    }
    
    set currentAppId(value: string) {
        this._currentAppId = value;
    }

    get currentAppId() {
        const { appid } = this.getMetadata();
        if (appid) {
            if (appid.startsWith('wx')) {
                return appid;
            }
            else {
                return this.settings.wxInfo.find(wx => wx.name === appid)?.appid || '';
            }
        }
        return this._currentAppId;
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

    getArticleText() {
       return this.articleDiv.innerText.trimStart();
    }

    getCSS() {
        try {
            const theme = this.assetsManager.getTheme(this.currentTheme);
            const highlight = this.assetsManager.getHighlight(this.currentHighlight);
            const customCSS = this.settings.useCustomCss ? this.assetsManager.customCSS : '';
            const baseCSS = this.settings.baseCSS ? `.note-to-mp {${this.settings.baseCSS}}` : '';
            return `${InlineCSS}\n\n${highlight!.css}\n\n${theme!.css}\n\n${baseCSS}\n\n${customCSS}`;
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
        const refreshBtn = lineDiv.createEl('button', { cls: 'refresh-button' }, async (button) => {
            button.setText('刷新');
        })

        refreshBtn.onclick = async () => {
            this.setStyle(this.getCSS());
            await this.renderMarkdown();
            uevent('refresh');
        }
        if (Platform.isDesktop) {
            const copyBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
                button.setText('复制');
            })

            copyBtn.onclick = async() => {
                try {
                    await this.copyArticle();
                    new Notice('复制成功，请到公众号编辑器粘贴。');
                    uevent('copy');
                } catch (error) {
                    console.error(error);
                    new Notice('复制失败: ' + error);
                }
            }
        }

        const uploadImgBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('上传图片');
        })

        uploadImgBtn.onclick = async() => {
            await this.uploadImages();
            uevent('upload');
        }

        const postBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('发草稿');
        })

        postBtn.onclick = async() => {
            await this.postArticle();
            uevent('pub');
        }

        const imagesBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('图片/文字');
        })

        imagesBtn.onclick = async() => {
            await this.postImages();
            uevent('pub-images');
        }

        const htmlBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('导出HTML');
        })

        htmlBtn.onclick = async() => {
            await this.exportHTML();
            uevent('export-html');
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
            pic_crop_1_1: undefined,
            appid: undefined,
            theme: undefined,
            highlight: undefined,
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
            res.appid = frontmatter['公众号'];
            res.theme = frontmatter['样式'];
            res.highlight = frontmatter['代码高亮'];
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

    async uploadCover(data: Blob, filename: string, token: string) {
        if (filename.toLowerCase().endsWith('.webp')) {
            await PrepareImageLib();
            if (IsImageLibReady()) {
                data = new Blob([WebpToJPG(await data.arrayBuffer())]);
                filename = filename.toLowerCase().replace('.webp', '.jpg');
            }
        }

        const res = await UploadImageToWx(data, filename, token, 'image');
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

        try {
            // 获取token
            const token = await this.getToken();
            if (token === '') {
                return;
            }

            const lm = LocalImageManager.getInstance();
            // 上传图片
            await lm.uploadLocalImage(token, this.app.vault);
            // 上传图床图片
            await lm.uploadRemoteImage(this.articleDiv, token);
            // 替换图片链接
            lm.replaceImages(this.articleDiv);
            // 上传Mermaid图片
            await CodeRenderer.uploadMermaidImages(this.articleDiv, token);

            await this.copyArticle();
            this.showMsg('图片已上传，并且已复制，请到公众号编辑器粘贴。');
        } catch (error) {
            console.error(error);
            this.showMsg('上传图片失败: ' + error.message);
        }
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
            // 上传图床图片
            await lm.uploadRemoteImage(this.articleDiv, token);
            // 替换图片链接
            lm.replaceImages(this.articleDiv);
            // 上传Mermaid图片
            await CodeRenderer.uploadMermaidImages(this.articleDiv, token);
            // 上传封面
            let mediaId = metadata.thumb_media_id;
            if (!mediaId) {
                if (metadata.cover) {
                    // 上传仓库里的图片
                    if (metadata.cover.startsWith('http')) {
                        const res = await LocalImageManager.getInstance().uploadImageFromUrl(metadata.cover, token, 'image');
                        if (res.media_id) {
                            mediaId = res.media_id;
                        }
                        else {
                            throw new Error('上传封面失败:' + res.errmsg);
                        }
                    }
                    else {
                        mediaId = await this.uploadVaultCover(metadata.cover, token);
                    }
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
            console.error(error);
            this.showMsg('发布失败!'+error.message);
        }
    }

    async postImages() {
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
            const imageList:DraftImageMediaId[] = [];
            const lm = LocalImageManager.getInstance();
            // 上传图片
            const localImages = await lm.uploadLocalImage(token, this.app.vault, 'image');
            for (const image of localImages) {
                imageList.push({
                    image_media_id: image.media_id,
                }); 
            }
            // 上传图床图片
            const remoteImages = await lm.uploadRemoteImage(this.articleDiv, token, 'image');
            for (const image of remoteImages) {
                imageList.push({
                    image_media_id: image.media_id,
                }); 
            }

            const content = this.getArticleText();

            if (imageList.length === 0) {
                this.showMsg('没有图片需要发布!');
                return; 
            }
            
            const imagesData: DraftImages = {
                article_type: 'newspic',
                title: metadata.title || this.title,
                content: content, 
                need_open_commnet: metadata.need_open_comment || 0,
                only_fans_can_comment: metadata.only_fans_can_comment || 0,
                image_info: {
                    image_list: imageList, 
                }
            }
            // 创建草稿
            const res = await wxAddDraftImages(token, imagesData);

            if (res.status != 200) {
                console.error(res.text);
                this.showMsg(`创建图片/文字失败, https状态码: ${res.status}  ${res.text}！`);
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
            console.error(error);
            this.showMsg('发布失败!'+error.message);
        }
    }

    async exportHTML() {
        const lm = LocalImageManager.getInstance();
        const content = await lm.embleImages(this.articleDiv, this.app.vault);
        const globalStyle = await this.assetsManager.getStyle();
        console.log(globalStyle);
        const html = applyCSS(content, this.getCSS() + globalStyle);
        const blob = new Blob([html], {type: 'text/html'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.title + '.html';
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        this.showMsg('导出成功!');
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