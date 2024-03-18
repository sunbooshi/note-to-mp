import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteToMpPlugin from 'main';

export class NoteToMpSettingTab extends PluginSettingTab {
	plugin: NoteToMpPlugin;

	constructor(app: App, plugin: NoteToMpPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('默认样式')
			.addDropdown(dropdown => {
                const styles = this.plugin.settings.styles;
                for (let s of styles) {
				    dropdown.addOption(s.className, s.name);
                }
                dropdown.onChange(async (value) => {
					this.plugin.settings.defaultStyle = value;
					await this.plugin.saveSettings();
                })
			});
	}
}
