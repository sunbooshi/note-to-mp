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

import { App, TextAreaComponent, PluginSettingTab, Setting, Notice, sanitizeHTMLToDom } from 'obsidian';
import NoteToMpPlugin from './main';
import { wxGetToken,wxEncrypt, requestLatestVersion } from './weixin-api';
import { cleanMathCache } from './core/markdown/math';
import { NMPSettings } from './settings';
import AssetsManager from './assets';
import { DocModal } from './doc-modal';
import { compareVersions } from './utils';
import { WorkflowModal } from './ui/workflow/workflow';

export class NoteToMpSettingTab extends PluginSettingTab {
	plugin: NoteToMpPlugin;
	wxInfo: string;
	wxTextArea: TextAreaComponent|null;
	settings: NMPSettings;
	headerEl: HTMLElement|null;

	constructor(app: App, plugin: NoteToMpPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = NMPSettings.getInstance();
		this.wxInfo = this.parseWXInfo();
	}

	displayWXInfo(txt:string) {
	    this.wxTextArea?.setValue(txt);
	}

	parseWXInfo() {
	    const wxInfo = this.settings.wxInfo;
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
		const authKey = this.settings.authKey;
		if (authKey.length == 0) {
		    new Notice('请先设置authKey');
		    return;
		}
	    const wxInfo = this.settings.wxInfo;
		if (wxInfo.length == 0) {
		    new Notice('请先设置公众号信息');
			return;
		}
		try {
			const docUrl = 'https://mp.weixin.qq.com/s/rk5CTPGr5ftly8PtYgSjCQ';
			for (let wx of wxInfo) {
				const res = await wxGetToken(authKey, wx.appid, wx.secret.replace('SECRET', ''));
				if (res.status != 200) {
					const data = res.json;
					const { code, message } = data;
					let content = message;
					if (code === 50002) {
						content = '用户受限，可能是您的公众号被冻结或注销，请联系微信客服处理';
					}
					else if (code === 40125) {
						content = 'AppSecret错误，请检查或者重置，详细操作步骤请参考下方文档';
					}
					else if (code === 40164) {
						content = 'IP地址不在白名单中，请将如下地址添加到白名单：<br>59.110.112.211<br>154.8.198.218<br>详细步骤请参考下方文档';
					}
					const modal = new DocModal(this.app, `${wx.name} 测试失败`, content, docUrl);
					modal.open();
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

		if (this.settings.wxInfo.length > 0) {
		    new Notice('已经保存过了，请先清除！');
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
			const appid = items[1].trim();
			const secret = items[2].trim();
			wechat.push({name, appid, secret});
		}

		if (wechat.length == 0) {
		    return false;
		}

		try {
			const res = await wxEncrypt(this.settings.authKey, wechat);
			if (res.status != 200) {
				const data = res.json;
				new Notice(`${data.message}`);
				return false;
			}

			const data = res.json;
			for (let wx of wechat) {
				wx.secret = data[wx.appid];
			}

			this.settings.wxInfo = wechat;
			await this.plugin.saveSettings();
			this.wxInfo = this.parseWXInfo();
			this.displayWXInfo(this.wxInfo);
			new Notice('保存成功');
			return true;

		} catch (error) {
			new Notice(`保存失败：${error}`);
			console.error(error);	
		}

		return false;
	}

	async clear() {
		this.settings.wxInfo = [];
		await this.plugin.saveSettings();
		this.wxInfo = '';
		this.displayWXInfo('')
	}

	display() {
		const {containerEl} = this;

		containerEl.empty();

		this.wxInfo = this.parseWXInfo();

		this.headerEl = containerEl.createEl('div');
		this.headerEl.style.cssText = 'display: flex;flex-direction: row;align-items: center;';
		this.headerEl.createEl('h2', {text: 'NoteToMP'}).style.cssText = 'margin-right: 10px;';
		this.headerEl.createEl('a', {text: '帮助文档', attr: {href: 'https://docs.dualhue.cn/doc'}});
		this.headerEl.createEl('div', {text: ' '}).style.cssText = 'width: 10px;';
		this.headerEl.createEl('a', {text: '会员购买', attr: {href: 'https://docs.dualhue.cn/subscribe'}});
		this.headerEl.createEl('div', {text: ' '}).style.cssText = 'width: 10px;';
		const version = this.plugin.manifest.version;
		this.headerEl.createEl('div', {text: `当前版本: v${version}`});
		this.headerEl.createEl('div', {text: ' '}).style.cssText = 'width: 10px;';

		containerEl.createEl('h2', {text: '插件设置'});

		new Setting(containerEl)
			.setName('默认样式')
			.addDropdown(dropdown => {
                const styles = this.plugin.assetsManager.themes;
                for (let s of styles) {
				    dropdown.addOption(s.className, s.name);
                }
				dropdown.setValue(this.settings.defaultStyle);
                dropdown.onChange(async (value) => {
					this.settings.defaultStyle = value;
					await this.plugin.saveSettings();
                });
			});

		new Setting(containerEl)
			.setName('代码高亮')
			.addDropdown(dropdown => {
                const styles = this.plugin.assetsManager.highlights;
                for (let s of styles) {
				    dropdown.addOption(s.name, s.name);
                }
				dropdown.setValue(this.settings.defaultHighlight);
                dropdown.onChange(async (value) => {
					this.settings.defaultHighlight = value;
					await this.plugin.saveSettings();
                });
			});

		new Setting(containerEl)
			.setName('链接展示样式')
			.addDropdown(dropdown => {
				dropdown.addOption('inline', '内嵌');
			    dropdown.addOption('footnote', '脚注');
				dropdown.setValue(this.settings.linkStyle);
				dropdown.onChange(async (value) => {
				    this.settings.linkStyle = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('文件嵌入展示样式')
			.addDropdown(dropdown => {
				dropdown.addOption('quote', '引用');
			    dropdown.addOption('content', '正文');
				dropdown.setValue(this.settings.embedStyle);
				dropdown.onChange(async (value) => {
				    this.settings.embedStyle = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('数学公式语法')
			.addDropdown(dropdown => {
				dropdown.addOption('latex', 'latex');
			    dropdown.addOption('asciimath', 'asciimath');
				dropdown.setValue(this.settings.math);
				dropdown.onChange(async (value) => {
				    this.settings.math = value;
					cleanMathCache();
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('显示代码行号')
			.addToggle(toggle => {
			    toggle.setValue(this.settings.lineNumber);
				toggle.onChange(async (value) => {
				    this.settings.lineNumber = value;
					await this.plugin.saveSettings();
				});
			})

		new Setting(containerEl)
			.setName('启用空行渲染')
			.addToggle(toggle => {
			    toggle.setValue(this.settings.enableEmptyLine);
				toggle.onChange(async (value) => {
				    this.settings.enableEmptyLine = value;
					await this.plugin.saveSettings();
				});
			})
		
		new Setting(containerEl)
		.setName('渲染图片标题')
		.addToggle(toggle => {
			toggle.setValue(this.settings.useFigcaption);
			toggle.onChange(async (value) => {
				this.settings.useFigcaption = value;
				await this.plugin.saveSettings();
			});
		})

		new Setting(containerEl)
		.setName('Excalidraw 渲染为 PNG 图片')
		.addToggle(toggle => {
			toggle.setValue(this.settings.excalidrawToPNG);
			toggle.onChange(async (value) => {
				this.settings.excalidrawToPNG = value;
				await this.plugin.saveSettings();
			});
		})

		new Setting(containerEl)
			.setName('水印图片')
			.addText(text => {
			    text.setPlaceholder('请输入图片名称')
					.setValue(this.settings.watermark)
					.onChange(async (value) => {
					  this.settings.watermark = value.trim();
						await this.plugin.saveSettings();
					})
					.inputEl.setAttr('style', 'width: 320px;')
			})

		new Setting(containerEl)
			.setName('获取更多主题')
			.addButton(button => {
			    button.setButtonText('下载');
				button.onClick(async () => {
					button.setButtonText('下载中...');
					await this.plugin.assetsManager.downloadThemes();
					button.setButtonText('下载完成');
				});
			})
			.addButton(button => {
				button.setIcon('folder-open');
				button.onClick(async () => {
					await this.plugin.assetsManager.openAssets();
				});
			});

		new Setting(containerEl)
			.setName('清空主题')
			.addButton(button => {
			    button.setButtonText('清空');
				button.onClick(async () => {
					await this.plugin.assetsManager.removeThemes();
					this.settings.resetStyelAndHighlight();
					await this.plugin.saveSettings();
				});
			})
		new Setting(containerEl)
			.setName('全局CSS属性')
			.setDesc('只能填写CSS属性，不能写选择器')
			.addTextArea(text => {
				this.wxTextArea = text;
			    text.setPlaceholder('请输入CSS属性，如：background: #fff;padding: 10px;')
				    .setValue(this.settings.baseCSS)
					.onChange(async (value) => {
					    this.settings.baseCSS = value;
							await this.plugin.saveSettings();
					})
				    .inputEl.setAttr('style', 'width: 520px; height: 60px;');
		})
		const customCSSDoc = '使用指南：<a href="https://docs.dualhue.cn/customcss">https://docs.dualhue.cn/customcss</a>';
		const customCSSSetting = new Setting(containerEl)
			.setName('自定义CSS笔记')
			.setDesc(sanitizeHTMLToDom(customCSSDoc))
			.addText(text => {
				text.setPlaceholder('请输入自定义CSS笔记标题')
				.setValue(this.settings.customCSSNote)
				.onChange(async (value) => {
					const note = value.trim();
					try {
						if (note.length > 0) {
							await this.plugin.assetsManager.loadCSSFromNote(note);
						}
						this.settings.customCSSNote = note;
						await this.plugin.saveSettings();
						await this.plugin.assetsManager.loadCustomCSS();
						customCSSSetting.setDesc(sanitizeHTMLToDom(customCSSDoc));
						customCSSSetting.descEl.removeAttribute('style');
					}
					catch (error) {
						console.error(error);
						const errorMsg = AssetsManager.formatError(error);
						customCSSSetting.setDesc(errorMsg);
						customCSSSetting.descEl.setAttr('style', 'color: var(--text-error); white-space: pre-wrap;');
					}
				})
				.inputEl.setAttr('style', 'width: 320px;')
		});

		const expertDoc = '使用指南：<a href="https://docs.dualhue.cn/expert">https://docs.dualhue.cn/expert</a>';
		new Setting(containerEl)
			.setName('专家设置笔记')
			.setDesc(sanitizeHTMLToDom(expertDoc))
			.addText(text => {
				text.setPlaceholder('请输入专家设置笔记标题')
				.setValue(this.settings.expertSettingsNote)
				.onChange(async (value) => {
					this.settings.expertSettingsNote = value.trim();
					await this.plugin.saveSettings();
					await this.plugin.assetsManager.loadExpertSettings();
				})
				.inputEl.setAttr('style', 'width: 320px;')
		});
		
		let descHtml = '详情说明：<a href="https://docs.dualhue.cn/subscribe">https://docs.dualhue.cn/subscribe</a>';
		if (this.settings.isVip) {
			descHtml = '<span style="color:rgb(245, 70, 85);font-weight: bold;">👑永久会员</span><br/>' + descHtml;
		}
		else if (this.settings.expireat) {
			const timestr = this.settings.expireat.toLocaleString();
			descHtml = `有效期至：${timestr} <br/>${descHtml}`
		}
		new Setting(containerEl)
			.setName('注册码（AuthKey）')
			.setDesc(sanitizeHTMLToDom(descHtml))
			.addText(text => {
				text.setPlaceholder('请输入注册码')
				.setValue(this.settings.authKey)
				.onChange(async (value) => {
					this.settings.authKey = value.trim();
					await this.settings.updateKeyInfo();
					await this.plugin.saveSettings();
				})
				.inputEl.setAttr('style', 'width: 320px;')
			}).descEl.setAttr('style', '-webkit-user-select: text; user-select: text;')
				
		
		let isClear = this.settings.wxInfo.length > 0;
		let isRealClear = false;
		const buttonText = isClear ? '清空公众号信息' : '保存公众号信息';
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
					button.setButtonText('保存公众号信息');
				}
				else {
					button.setButtonText('保存中...');
					if (await this.encrypt()) {
						isClear = true;
						isRealClear = false;
						button.setButtonText('清空公众号信息');
					}
					else {
						button.setButtonText('保存公众号信息');
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
		.addButton(button => {
			button.setButtonText('AI工作流');
			button.onClick(async () => {
				new WorkflowModal(this.app).open();
			})
		})
		this.checkUpdate();
	}

	checkUpdate() {
		requestLatestVersion().then((versionInfo) => {
			if (!versionInfo) return;
			if (!this.headerEl) return;
			if (compareVersions(versionInfo.version, this.plugin.manifest.version) > 0) {
				this.headerEl.createEl('a', {text: '有新版本: v' + versionInfo.version, attr: {href: versionInfo.url}});
			}
		});	
	}
}
