import { App, Modal, Setting, MarkdownView } from "obsidian";

export class WidgetsModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onSubmit() {
    console.log('result');
    const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) return;
    editor.replaceSelection('selectText');
    editor.exec("goRight");
    // @ts-ignore
    this.app.commands.executeCommandById("editor:focus");
  }

  onOpen() {
    let { contentEl, modalEl } = this;
    modalEl.style.width = '640px';
    modalEl.style.height = '480px';
    contentEl.setText("Look at me, I'm a modal! 👀");
    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Submit")
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit();
          }));

          const iframe = contentEl.createEl('iframe', {
            attr: {
              src: 'http://localhost:4000',
              width: '100%',
              height: '100%',
            },
          });
      
          // 将 iframe 添加到 Modal 中
          iframe.style.border = 'none';
      
          // 监听从 iframe 发来的消息
          window.addEventListener('message', this.handleMessage);
      
          // 向 iframe 发送消息
          iframe.onload = () => {
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'hello', text: 'Hello from Obsidian' }, '*');
            }
          };
  }

  handleMessage(event: MessageEvent) {
    if (event.origin === 'http://localhost:4000') {
      console.log('Message from iframe:', event.data);
      // 可以在这里处理来自 iframe 的消息
    }
  }

  onClose() {
    window.removeEventListener('message', this.handleMessage);
    let { contentEl } = this;
    contentEl.empty();
  }
}