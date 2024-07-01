import { App, TextAreaComponent, PluginSettingTab, Setting, Notice } from 'obsidian';
import NoteToMpPlugin from './main';
import { wxGetToken,wxEncrypt } from './weixin-api';

export class NoteToMpSettingTab extends PluginSettingTab {
	plugin: NoteToMpPlugin;
	wxInfo: string;
	wxTextArea: TextAreaComponent|null;

	constructor(app: App, plugin: NoteToMpPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.wxInfo = this.parseWXInfo();
	}

	displayWXInfo(txt:string) {
	    this.wxTextArea?.setValue(txt);
	}

	parseWXInfo() {
	    const wxInfo = this.plugin.settings.wxInfo;
		if (wxInfo.length == 0) {
			return '';
		}

		let res = '';
		for (let wx of wxInfo) {
		    res += `${wx.name}|${wx.appid}|********\n`;
		}
		return res;
	}

	async testWXInfo() {
		const authKey = this.plugin.settings.authKey;
		if (authKey.length == 0) {
		    new Notice('请先设置authKey');
		    return;
		}
	    const wxInfo = this.plugin.settings.wxInfo;
		if (wxInfo.length == 0) {
		    new Notice('请先设置公众号信息');
			return;
		}
		try {
			for (let wx of wxInfo) {
				const res = await wxGetToken(authKey, wx.appid, wx.secret.replace('SECRET', ''));
				if (res.status != 200) {
					const data = res.json;
					new Notice(`${wx.name}|${wx.appid} 测试失败：${data.message}`);
					break
				}

				const data = res.json;
				if (data.token.length == 0) {
					new Notice(`${wx.name}|${wx.appid} 测试失败`);
					break
				}
				new Notice(`${wx.name} 测试通过`);
			}
		} catch (error) {
			new Notice(`测试失败：${error}`);
		}
	}

	async encrypt() {
	    if (this.wxInfo.length == 0) {
			new Notice('请输入内容');
			return false;
		}

		if (this.plugin.settings.wxInfo.length > 0) {
		    new Notice('已经加密过了，请先清除！');
		    return false;
		}

		const wechat = [];
		const lines = this.wxInfo.split('\n');
		for (let line of lines) {
			line = line.trim();
			if (line.length == 0) {
			    continue;
			}
			const items = line.split('|');
			if (items.length != 3) {
				new Notice('格式错误，请检查');
				return false;
			}
			const name = items[0];
			const appid = items[1];
			const secret = items[2];
			wechat.push({name, appid, secret});
		}

		if (wechat.length == 0) {
		    return false;
		}

		try {
			const res = await wxEncrypt(this.plugin.settings.authKey, wechat);
			if (res.status != 200) {
				const data = res.json;
				new Notice(`${data.message}`);
				return false;
			}

			const data = res.json;
			for (let wx of wechat) {
				wx.secret = data[wx.appid];
			}

			this.plugin.settings.wxInfo = wechat;
			await this.plugin.saveSettings();
			this.wxInfo = this.parseWXInfo();
			this.displayWXInfo(this.wxInfo);
			new Notice('加密成功');
			return true;

		} catch (error) {
			new Notice(`加密失败：${error}`);
			console.error(error);	
		}

		return false;
	}

	async clear() {
		this.plugin.settings.wxInfo = [];
		await this.plugin.saveSettings();
		this.wxInfo = '';
		this.displayWXInfo('')
	}

	display() {
		const {containerEl} = this;

		containerEl.empty();

		this.wxInfo = this.parseWXInfo();

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
		
		new Setting(containerEl)
			.setName('注册码（AuthKey）')
			.setDesc('详情请参考：https://doc.booshi.tech/info.html')
			.addText(text => {
			    text.setPlaceholder('请输入注册码')
					.setValue(this.plugin.settings.authKey)
					.onChange(async (value) => {
					    this.plugin.settings.authKey = value;
						await this.plugin.saveSettings();
					})
					.inputEl.setAttr('style', 'width: 320px;')
			}).descEl.setAttr('style', '-webkit-user-select: text; user-select: text;')
				
		
		let isClear = this.plugin.settings.wxInfo.length > 0;
		let isRealClear = false;
		const buttonText = isClear ? '清空公众号信息' : '加密公众号信息';
		new Setting(containerEl)
			.setName('公众号信息')
			.addTextArea(text => {
				this.wxTextArea = text;
			    text.setPlaceholder('请输入公众号信息\n格式：公众号名称|公众号AppID|公众号AppSecret\n多个公众号请换行输入\n输入完成后点击加密按钮')
				    .setValue(this.wxInfo)
					.onChange(value => {
					    this.wxInfo = value;
					})
				    .inputEl.setAttr('style', 'width: 520px; height: 120px;');
			})
		
		new Setting(containerEl).addButton(button => {
			button.setButtonText(buttonText);
			button.onClick(async () => {
				if (isClear) {
					isRealClear = true;
					isClear = false;
					button.setButtonText('确认清空?');
				}
				else if (isRealClear) {
					isRealClear = false;
					isClear = false;
					this.clear();
					button.setButtonText('加密公众号信息');
				}
				else {
					button.setButtonText('加密中...');
					if (await this.encrypt()) {
						isClear = true;
						isRealClear = false;
						button.setButtonText('清空公众号信息');
					}
					else {
						button.setButtonText('加密公众号信息');
					}
				}
			});
		})
		.addButton(button => {
			button.setButtonText('测试公众号');
			button.onClick(async () => {
				button.setButtonText('测试中...');
				await this.testWXInfo();
				button.setButtonText('测试公众号');
			})
		})
	}
}
