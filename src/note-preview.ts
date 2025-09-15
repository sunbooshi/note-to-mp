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

import { EventRef, ItemView, Workspace, WorkspaceLeaf, Notice, Platform, TFile, TFolder, TAbstractFile, Plugin } from 'obsidian';
import { uevent, debounce, waitForLayoutReady } from './utils';
import { NMPSettings } from './settings';
import AssetsManager from './assets';
import { MarkedParser } from './markdown/parser';
import { LocalImageManager, LocalFile } from './markdown/local-file';
import { CardDataManager } from './markdown/code';
import { ArticleRender } from './article-render';


export const VIEW_TYPE_NOTE_PREVIEW = 'note-preview';

export class NotePreview extends ItemView {
    workspace: Workspace;
    plugin: Plugin;
    mainDiv: HTMLDivElement;
    toolbar: HTMLDivElement;
    renderDiv: HTMLDivElement;
    articleDiv: HTMLDivElement;
    styleEl: HTMLElement;
    coverEl: HTMLInputElement;
    useDefaultCover: HTMLInputElement;
    useLocalCover: HTMLInputElement;
    msgView: HTMLDivElement;
    wechatSelect: HTMLSelectElement;
    themeSelect: HTMLSelectElement;
    highlightSelect: HTMLSelectElement;
    listeners?: EventRef[];
    container: Element;
    settings: NMPSettings;
    assetsManager: AssetsManager;
    articleHTML: string;
    title: string;
    currentFile?: TFile;
    currentTheme: string;
    currentHighlight: string;
    currentAppId: string;
    markedParser: MarkedParser;
    cachedElements: Map<string, string> = new Map();
    _articleRender: ArticleRender | null = null;
    isCancelUpload: boolean = false;
    isBatchRuning: boolean = false;


    constructor(leaf: WorkspaceLeaf, plugin: Plugin) {
        super(leaf);
        this.workspace = this.app.workspace;
        this.plugin = plugin;
        this.settings = NMPSettings.getInstance();
        this.assetsManager = AssetsManager.getInstance();
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

    get render() {
        if (!this._articleRender) {
            this._articleRender = new ArticleRender(this.app, this, this.styleEl, this.articleDiv);
            this._articleRender.currentTheme = this.currentTheme;
            this._articleRender.currentHighlight = this.currentHighlight;
        }
        return this._articleRender;
    }

    async onOpen() {
        this.viewLoading();
        this.setup();
        uevent('open');
    }

    async setup() {
        await waitForLayoutReady(this.app);

        if (!this.settings.isLoaded) {
            const data = await this.plugin.loadData();
            NMPSettings.loadSettings(data);
        }
        if (!this.assetsManager.isLoaded) {
            await this.assetsManager.loadAssets();
        }

        this.buildUI();
        this.listeners = [
            this.workspace.on('file-open', () => {
                this.update();
            }),
            this.app.vault.on("modify", (file) => {
                if (this.currentFile?.path == file.path) {
                    this.renderMarkdown();
                }
            } ) 
        ];

        this.renderMarkdown();
    }

    async onClose() {
        this.listeners?.forEach(listener => this.workspace.offref(listener));
        LocalFile.fileCache.clear();
        uevent('close');
    }

    onAppIdChanged() {
        // 清理上传过的图片
        this.cleanArticleData();
    }

    async update() {
        if (this.isBatchRuning) {
            return;
        }
        this.cleanArticleData();
        this.renderMarkdown();
    }

    cleanArticleData() {
        LocalImageManager.getInstance().cleanup();
        CardDataManager.getInstance().cleanup();
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
        const cancelBtn = this.msgView.createEl('button', { cls: 'msg-ok-btn' }, async (button) => {
        });
        cancelBtn.id = 'msg-cancel-btn';
        cancelBtn.innerText = '取消';
        cancelBtn.onclick = async () => {
            this.isCancelUpload = true;
            this.msgView.setAttr('style', 'display: none;');
        }
    }

    showLoading(msg: string, cancelable: boolean = false) {
        const title = this.msgView.querySelector('#msg-title') as HTMLElement;
        title!.innerText = msg;
        const btn = this.msgView.querySelector('#msg-ok-btn') as HTMLElement;
        btn.setAttr('style', 'display: none;');
        this.msgView.setAttr('style', 'display: flex;');
        const cancelBtn = this.msgView.querySelector('#msg-cancel-btn') as HTMLElement;
        cancelBtn.setAttr('style', cancelable ? 'display: block;': 'display: none;');
        this.msgView.setAttr('style', 'display: flex;');
    }

    showMsg(msg: string) {
        const title = this.msgView.querySelector('#msg-title') as HTMLElement;
        title!.innerText = msg;
        const btn = this.msgView.querySelector('#msg-ok-btn') as HTMLElement;
        btn.setAttr('style', 'display: block;');
        this.msgView.setAttr('style', 'display: flex;');
        const cancelBtn = this.msgView.querySelector('#msg-cancel-btn') as HTMLElement;
        cancelBtn.setAttr('style', 'display: none;');
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
            this.wechatSelect = wxSelect;

            if (Platform.isDesktop) {
                const openBtn = lineDiv.createEl('button', { cls: 'refresh-button' }, async (button) => {
                    button.setText('去公众号后台');
                })

                openBtn.onclick = async () => {
                    const { shell } = require('electron');
                    shell.openExternal('https://mp.weixin.qq.com')
                    uevent('open-mp');
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
            await this.assetsManager.loadCustomCSS();
            await this.assetsManager.loadExpertSettings();
            this.render.reloadStyle();
            await this.renderMarkdown();
            uevent('refresh');
        }
        if (Platform.isDesktop) {
            const copyBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
                button.setText('复制');
            })

            copyBtn.onclick = async() => {
                try {
                    await this.render.copyArticle();
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

        if (Platform.isDesktop && this.settings.isAuthKeyVaild()) {
            const htmlBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
                button.setText('导出HTML');
            })

            htmlBtn.onclick = async() => {
                await this.exportHTML();
                uevent('export-html');
            }
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
                this.currentTheme = selectBtn.value;
                this.render.updateStyle(selectBtn.value);
            }

            for (let s of this.assetsManager.themes) {
                const op = selectBtn.createEl('option');
                op.value = s.className;
                op.text = s.name;
                op.selected = s.className == this.settings.defaultStyle;
            }

            this.themeSelect = selectBtn;

            const highlightStyle = lineDiv.createDiv({ cls: 'style-label' });
            highlightStyle.innerText = '代码高亮:';

            const highlightStyleBtn = lineDiv.createEl('select', { cls: 'style-select' }, async (sel) => {

            })

            highlightStyleBtn.onchange = async () => {
                this.currentHighlight = highlightStyleBtn.value;
                this.render.updateHighLight(highlightStyleBtn.value);
            }

            for (let s of this.assetsManager.highlights) {
                const op = highlightStyleBtn.createEl('option');
                op.value = s.name;
                op.text = s.name;
                op.selected = s.name == this.settings.defaultHighlight;
            }

            this.highlightSelect = highlightStyleBtn;
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
        this.articleDiv = this.renderDiv.createEl('div');
    }

    async viewLoading() {
        const container = this.containerEl.children[1]
        container.empty();
        const loading = container.createDiv({cls: 'loading-wrapper'})
        loading.createDiv({cls: 'loading-spinner'})
    }

    async renderMarkdown(af: TFile | null = null) {
        if (!af) {
            af = this.app.workspace.getActiveFile();
        }
        if (!af || af.extension.toLocaleLowerCase() !== 'md') {
            return;
        }
        this.currentFile = af;
        await this.render.renderMarkdown(af);
        const metadata = this.render.getMetadata();
        if (metadata.appid) {
            this.wechatSelect.value = metadata.appid;
        }
        else {
            this.wechatSelect.value = this.currentAppId;
        }

        if (metadata.theme) {
            this.assetsManager.themes.forEach(theme => {
                if (theme.name === metadata.theme) { 
                    this.themeSelect.value = theme.className;
                }
            });
        }
        else {
            this.themeSelect.value = this.currentTheme;
        }

        if (metadata.highlight) {
            this.highlightSelect.value = this.render.currentHighlight;
        }
        else {
            this.highlightSelect.value = this.currentHighlight;
        }
    }

    async uploadImages() {
        this.showLoading('图片上传中...');
        try {
            await this.render.uploadImages(this.currentAppId);
            this.showMsg('图片上传成功，并且文章内容已复制，请到公众号编辑器粘贴。');
        } catch (error) {
            this.showMsg('图片上传失败: ' + error.message);
        }
    }

    async postArticle() {
        let localCover = null;
        if (this.useLocalCover.checked) {
            const fileInput = this.coverEl;
            if (!fileInput.files || fileInput.files.length === 0) {
                this.showMsg('请选择封面文件');
                return;
            }
            localCover = fileInput.files[0];
            if (!localCover) {
                this.showMsg('请选择封面文件');
                return;
            }
        }
        this.showLoading('发布中...');
        try {
            await this.render.postArticle(this.currentAppId, localCover);
            this.showMsg('发布成功');
        }
        catch (error) {
            this.showMsg('发布失败: ' + error.message);
        }
    }

    async postImages() {
        this.showLoading('发布图片中...');
        try {
            await this.render.postImages(this.currentAppId);
            this.showMsg('图片发布成功');
        } catch (error) {
            this.showMsg('图片发布失败: ' + error.message);
        }
    }

    async exportHTML() {
        this.showLoading('导出HTML中...');
        try {
            await this.render.exportHTML();
            this.showMsg('HTML导出成功');
        } catch (error) {
            this.showMsg('HTML导出失败: ' + error.message);
        }
    }

    async batchPost(folder: TFolder) {
        const files = folder.children.filter((child: TAbstractFile) => child.path.toLocaleLowerCase().endsWith('.md'));
        if (!files) {
            new Notice('没有可渲染的笔记或文件不支持渲染');
            return;
        }

        this.isCancelUpload = false;
        this.isBatchRuning = true;

        try {
            for (let file of files) {
                this.showLoading(`即将发布: ${file.name}`, true);
                await sleep(5000);
                if (this.isCancelUpload) {
                    break;
                }
                this.cleanArticleData();
                await this.renderMarkdown(file as TFile);
                await this.postArticle();
            }

            if (!this.isCancelUpload) {
                this.showMsg(`批量发布完成：成功发布 ${files.length} 篇笔记`);
            }
        }
        catch (e) {
            console.error(e);
            new Notice('批量发布失败: ' + e.message);
        }
        finally {
            this.isBatchRuning = false;
            this.isCancelUpload = false;
        }
    }
}