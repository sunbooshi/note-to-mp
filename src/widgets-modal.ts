import { App, Modal, MarkdownView } from "obsidian";
import { uevent } from "./utils";

export class WidgetsModal extends Modal {
  listener: any = null;
  url: string = 'https://widgets.sunboshi.tech';
  constructor(app: App) {
    super(app);
  }

  insertMarkdown(markdown: string) {
    const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) return;
    editor.replaceSelection(markdown);
    editor.exec("goRight");
    uevent('insert-widgets');
  }

  onOpen() {
    let { contentEl, modalEl } = this;
    modalEl.style.width = '640px';
    modalEl.style.height = '500px';
    const iframe = contentEl.createEl('iframe', {
      attr: {
        src: this.url,
        width: '100%',
        height: '100%',
        allow: 'clipboard-read; clipboard-write',
      },
    });

    iframe.style.border = 'none';

    this.listener = this.handleMessage.bind(this);
    window.addEventListener('message', this.listener);
    uevent('open-widgets');
  }

  handleMessage(event: MessageEvent) {
    if (event.origin === this.url) {
      const { type, data } = event.data;
      if (type === 'cmd') {
        this.insertMarkdown(data);
      }
    }
  }

  onClose() {
    if (this.listener) {
      window.removeEventListener('message', this.listener);
    }
    let { contentEl } = this;
    contentEl.empty();
  }
}