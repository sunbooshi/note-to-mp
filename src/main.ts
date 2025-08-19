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

import { Plugin, WorkspaceLeaf, App, PluginManifest, Menu, Notice, TAbstractFile, TFile, TFolder } from 'obsidian';
import { NotePreview, VIEW_TYPE_NOTE_PREVIEW } from './note-preview';
import { NMPSettings } from './settings';
import { NoteToMpSettingTab } from './setting-tab';
import AssetsManager from './assets';
import { setVersion, uevent } from './utils';
import { WidgetsModal } from './widgets-modal';


export default class NoteToMpPlugin extends Plugin {
	settings: NMPSettings;
	assetsManager: AssetsManager;
	constructor(app: App, manifest: PluginManifest) {
	    super(app, manifest);
		AssetsManager.setup(app, manifest);
	    this.assetsManager = AssetsManager.getInstance();
	}

	async onload() {
		console.log('Loading Note to MP');
		setVersion(this.manifest.version);
		uevent('load');
		await this.loadSettings();
		await this.assetsManager.loadAssets();
		this.registerView(
			VIEW_TYPE_NOTE_PREVIEW,
			(leaf) => new NotePreview(leaf)
		);

		const ribbonIconEl = this.addRibbonIcon('clipboard-paste', '复制到公众号', (evt: MouseEvent) => {
			this.activateView();
		});
		ribbonIconEl.addClass('note-to-mp-plugin-ribbon-class');

		this.addCommand({
			id: 'note-to-mp-preview',
			name: '复制到公众号',
			callback: () => {
				this.activateView();
			}
		});

		this.addSettingTab(new NoteToMpSettingTab(this.app, this));

		this.addCommand({
			id: 'note-to-mp-widget',
			name: '插入样式小部件',
			callback: () => {
				new WidgetsModal(this.app).open();
			}
		});

		this.addCommand({
			id: 'note-to-mp-pub',
			name: '发布公众号文章',
			callback: () => {
				this.app.workspace.detachLeavesOfType(VIEW_TYPE_NOTE_PREVIEW);
			}
		});

		// 监听右键菜单
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        menu.addItem((item) => {
          item
            .setTitle('发布到公众号')
            .setIcon('lucide-star') // 可选图标
            .onClick(async () => {
              if (file instanceof TFile) {
                await this.app.vault.read(file).then(data => {
                  console.log('文件内容:', data);
                });
              } else if (file instanceof TFolder) {
                console.log('选中的文件夹:', file.path);
              }
            });
        });
      })
    );
	}

	onunload() {

	}

	async loadSettings() {
		NMPSettings.loadSettings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(NMPSettings.allSettings());
	}

	async activateView() {
		const { workspace } = this.app;
	
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_NOTE_PREVIEW);
	
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
		  	leaf = workspace.getRightLeaf(false);
		  	await leaf?.setViewState({ type: VIEW_TYPE_NOTE_PREVIEW, active: false });
		}
	
		if (leaf) workspace.revealLeaf(leaf);
	}
}
