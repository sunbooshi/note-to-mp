import { Plugin, WorkspaceLeaf } from 'obsidian';
import { NotePreview, VIEW_TYPE_NOTE_PREVIEW } from 'note-preview';
import { PreviewSetting } from 'settings';
import { NoteToMpSettingTab } from 'setting-tab';


export default class NoteToMpPlugin extends Plugin {
	settings: PreviewSetting;

	async onload() {
		console.log('Loading Note to MP');
		await this.loadSettings();
		this.registerView(
			VIEW_TYPE_NOTE_PREVIEW,
			(leaf) => new NotePreview(leaf, this.settings)
		);

		const ribbonIconEl = this.addRibbonIcon('clipboard-paste', '复制到公众号', (evt: MouseEvent) => {
			this.activateView();
		});
		ribbonIconEl.addClass('note-to-mp-plugin-ribbon-class');

		this.addCommand({
			id: 'open-note-preview',
			name: '复制到公众号',
			callback: () => {
				this.activateView();
			}
		});

		this.addSettingTab(new NoteToMpSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = new PreviewSetting(this.app);
		await this.settings.loadStyles();
		this.settings.loadSetting(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings.allSettings());
	}

	async activateView() {
		const { workspace } = this.app;
	
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_NOTE_PREVIEW);
	
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
		  	leaf = workspace.getRightLeaf(false);
		  	await leaf?.setViewState({ type: VIEW_TYPE_NOTE_PREVIEW, active: true });
		}
	
		if (leaf) workspace.revealLeaf(leaf);
	}
}
