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

import { Plugin, WorkspaceLeaf, App, PluginManifest, Notice, TAbstractFile, TFile, TFolder, normalizePath } from 'obsidian';
import { NotePreview, VIEW_TYPE_NOTE_PREVIEW } from './note-preview';
import { NMPSettings } from './settings';
import { NoteToMpSettingTab } from './setting-tab';
import AssetsManager from './assets';
import { setVersion, uevent } from './utils';
import { WidgetsModal } from './widgets-modal';
import { NotePubModal } from './note-pub';
import { usePluginStore } from './store/PluginStore';
import './styles.css';


export default class NoteToMpPlugin extends Plugin {
	settings: NMPSettings;
	assetsManager: AssetsManager;
	constructor(app: App, manifest: PluginManifest) {
	    super(app, manifest);
			AssetsManager.setup(app, manifest);
	    this.assetsManager = AssetsManager.getInstance();
	}

	async loadResource() {
		await this.loadSettings();
		await this.assetsManager.loadAssets();
		usePluginStore.getState().setResourceLoaded(true);
	}

	async onload() {
		console.log('Loading NoteToMP');
		usePluginStore.getState().setApp(this.app);
		usePluginStore.getState().setPlugin(this);
		setVersion(this.manifest.version);
		this.app.workspace.onLayoutReady(()=>{
			this.loadResource();
		})

		this.registerView(
			VIEW_TYPE_NOTE_PREVIEW,
			(leaf) => new NotePreview(leaf, this)
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
				const file = this.app.workspace.getActiveFile();
				if (!(file instanceof TFile)) {
					new Notice('请先打开要发布的笔记再执行发布');
					return;
				}
				if (file.extension.toLocaleLowerCase() !== 'md') {
					new Notice('只能发布 Markdown 文件');
					return;
				}
				new NotePubModal(this.app, [file]).open();
			}
		});

		// 监听右键菜单
		this.registerEvents();
		uevent('load');
	}

	onunload() {

	}

	registerEvents() {
		const clickOnFile = (file: TAbstractFile, merge: boolean) => {
			if (file instanceof TFile) {
				if (file.extension.toLowerCase() !== 'md') {
					new Notice('只能发布 Markdown 文件');
					return;
				}
				new NotePubModal(this.app, [file], merge).open();
			} else if (file instanceof TFolder) {
				const files: TFile[] = [];
				file.children.forEach((child) => {
					if (child instanceof TFile && child.extension.toLocaleLowerCase() === "md") {
						files.push(child);
					}
				});
				new NotePubModal(this.app, files, merge).open();
			}
		}

		const clickOnFiles = (files: TAbstractFile[], merge: boolean) => {
			const notes: TFile[] = [];
			files.forEach((child) => {
				if (child instanceof TFile && child.extension.toLocaleLowerCase() === "md") {
					notes.push(child);
				}
			});

			new NotePubModal(this.app, notes, merge).open();
		};

		// 监听右键菜单
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        menu.addItem((item) => {
          item
            .setTitle('发布到公众号')
            .setIcon('lucide-send')
            .onClick(async () => {
              clickOnFile(file, false);
            });
        });
      })
    );

		this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        menu.addItem((item) => {
          item
            .setTitle('合并发布到公众号')
            .setIcon('lucide-send')
            .onClick(async () => {
              clickOnFile(file, true);
            });
        });
      })
    );

		this.registerEvent(
      this.app.workspace.on('files-menu', (menu, files, source) => {
        menu.addItem((item) => {
          item
            .setTitle('发布到公众号')
            .setIcon('lucide-send')
            .onClick(() => {
							clickOnFiles(files, false);
            });
        });
      })
    );

		this.registerEvent(
      this.app.workspace.on('files-menu', (menu, files, source) => {
        menu.addItem((item) => {
          item
            .setTitle('合并发布到公众号')
            .setIcon('lucide-send')
            .onClick(() => {
							clickOnFiles(files, true);
            });
        });
      })
    );
	}

	async loadSettings() {
		NMPSettings.loadSettings(await this.loadData());
		NMPSettings.getInstance().updateKeyInfo().then(updated => {
			if (updated) {
				this.saveSettings();
			}
		});
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

	getNotePreview(): NotePreview | null {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTE_PREVIEW);
		if (leaves.length > 0) {
			const leaf = leaves[0];
			return leaf.view as NotePreview;
		}
		return null;
	}
}
