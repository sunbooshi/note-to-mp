import { EventRef, ItemView, Workspace, WorkspaceLeaf, Notice } from 'obsidian';
import { copy } from 'clipboard';
import { markedParse, ParseOptions } from 'utils';
import { PreviewSetting } from 'settings';
import ThemesManager from 'themes';

export const VIEW_TYPE_NOTE_PREVIEW = 'note-preview';

const FRONT_MATTER_REGEX = /^(---)$.+?^(---)$.+?/ims;


export class NotePreview extends ItemView {
    workspace: Workspace;
    mainDiv: HTMLDivElement;
    toolbar: HTMLDivElement;
    renderDiv: HTMLDivElement;
    renderSection: HTMLElement;
    styleEl: HTMLElement;
    listeners: EventRef[];
    container: Element;
    settings: PreviewSetting;
    themeManager: ThemesManager;
    currentTheme: string;

    constructor(leaf: WorkspaceLeaf, settings: PreviewSetting, themeManager: ThemesManager) {
        super(leaf);
        this.workspace = this.app.workspace;
        this.settings = settings
        this.themeManager = themeManager;
        this.currentTheme = this.settings.defaultStyle;
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
            this.renderSection.innerHTML = await markedParse(md, op);
        }
        catch (e) {
            console.error(e);
            this.renderSection.innerHTML = this.errorContent(e);
        }
    }

    getCSS() {
        for (let s of this.themeManager.themes) {
            if (s.className == this.currentTheme) {
                return s.css;
            }
        }
        return '';
    }

    buildToolbar(parent: HTMLDivElement) {
        this.toolbar = parent.createDiv({ cls: 'preview-toolbar' });

        const copyBtn = this.toolbar.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('复制');
        })

        copyBtn.onclick = async () => {
            copy(this.renderDiv);
            new Notice('复制成功，请到公众号编辑器粘贴。');
        }

        const refreshBtn = this.toolbar.createEl('button', { cls: 'refresh-button' }, async (button) => {
            button.setText('刷新');
        })

        refreshBtn.onclick = async () => {
            this.renderMarkdown();
        }

        const cssStyle = this.toolbar.createDiv({ cls: 'style-label' });
        cssStyle.innerText = '样式:';

        const selectBtn = this.toolbar.createEl('select', { cls: 'style-select' }, async (sel) => {

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

        this.renderSection = this.renderDiv.createEl('section', { cls: this.settings.defaultStyle });
        // 加入1个高度为0的section，确保复制到公众号编辑器中是section元素，这样才能把背景颜色带过去
        let dummySection = this.renderDiv.createEl('section');
        dummySection.innerHTML="&nbsp;&nbsp;"
        dummySection.setAttr('style', 'height:0px;');
    }

    updateStyle(styleName: string) {
        this.currentTheme = styleName;
        this.styleEl.innerHTML = this.getCSS();
        this.renderSection.setAttribute('class', styleName);
    }
}