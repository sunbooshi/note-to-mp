import { App, DropdownComponent, PluginSettingTab, Setting } from 'obsidian';
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
                const styles = this.plugin.themesManager.themes;
                for (let s of styles) {
				    dropdown.addOption(s.className, s.name);
                }
				dropdown.setValue(this.plugin.settings.defaultStyle);
                dropdown.onChange(async (value) => {
					this.plugin.settings.defaultStyle = value;
					await this.plugin.saveSettings();
                });
			});

		new Setting(containerEl)
			.setName('代码高亮')
			.addDropdown(dropdown => {
                const styles = this.plugin.themesManager.highlights;
                for (let s of styles) {
				    dropdown.addOption(s.name, s.name);
                }
				dropdown.setValue(this.plugin.settings.defaultHighlight);
                dropdown.onChange(async (value) => {
					this.plugin.settings.defaultHighlight = value;
					await this.plugin.saveSettings();
                });
			});

		new Setting(containerEl)
			.setName('链接展示样式')
			.addDropdown(dropdown => {
				dropdown.addOption('inline', '内嵌');
			    dropdown.addOption('footnote', '脚注');
				dropdown.setValue(this.plugin.settings.linkStyle);
				dropdown.onChange(async (value) => {
				    this.plugin.settings.linkStyle = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('显示代码行号')
			.addToggle(toggle => {
			    toggle.setValue(this.plugin.settings.lineNumber);
				toggle.onChange(async (value) => {
				    this.plugin.settings.lineNumber = value;
					await this.plugin.saveSettings();
				});
			})

		new Setting(containerEl)
			.setName('获取更多主题')
			.addButton(button => {
			    button.setButtonText('下载');
				button.onClick(async () => {
					button.setButtonText('下载中...');
					await this.plugin.themesManager.downloadThemes();
					button.setButtonText('下载完成');
				});
			})

		new Setting(containerEl)
			.setName('清空主题')
			.addButton(button => {
			    button.setButtonText('清空');
				button.onClick(async () => {
					await this.plugin.themesManager.removeThemes();
					this.plugin.settings.resetStyelAndHighlight();
					await this.plugin.saveSettings();
				});
			})
	}
}
