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

import { EventRef, ItemView, Workspace, WorkspaceLeaf, TFile, Plugin } from 'obsidian';
import { uevent } from './utils';
import { LocalFile } from './markdown/local-file';
import { useRenderStore } from './store/RenderStore';
import { createPreview } from './ui/preview';
import * as ReactDOM from 'react-dom/client';


export const VIEW_TYPE_NOTE_PREVIEW = 'note-preview';

export class NotePreview extends ItemView {
    preview: ReactDOM.Root | null = null;
    workspace: Workspace;
    plugin: Plugin;
    listeners?: EventRef[];


    constructor(leaf: WorkspaceLeaf, plugin: Plugin) {
        super(leaf);
        this.workspace = this.app.workspace;
        this.plugin = plugin;
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
        useRenderStore.getState().setNote(this.app.workspace.getActiveFile());
        this.listeners = [
            this.workspace.on('file-open', (file) => {
                useRenderStore.getState().setNote(file);
            }),
            this.app.vault.on("modify", (file) => {
                useRenderStore.getState().triggerRender(file as TFile);
            }),
        ];
        this.preview = createPreview(this.containerEl.children[1] as HTMLElement);
        uevent('open');
    }

    async onClose() {
        this.listeners?.forEach(listener => this.workspace.offref(listener));
        LocalFile.fileCache.clear();
        this.preview?.unmount();
        this.preview = null;
        uevent('close');
    }
}
