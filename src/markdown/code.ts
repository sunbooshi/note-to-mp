/*
 * Copyright (c) 2024 Sun Booshi
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

import { MarkdownView, Notice } from "obsidian";
import { toPng } from 'html-to-image';
import { Tokens } from "marked";
import { MathRendererQueue } from "./math";
import { Extension } from "./extension";
import { wxUploadImage } from "../weixin-api";

export class CardDataManager {
	private cardData: Map<string, string>;
    private static instance: CardDataManager;

    private constructor() {
       this.cardData = new Map<string, string>();
    }

    // 静态方法，用于获取实例
    public static getInstance(): CardDataManager {
        if (!CardDataManager.instance) {
            CardDataManager.instance = new CardDataManager();
        }
        return CardDataManager.instance;
    }

	public setCardData(id: string, cardData: string ) {
		this.cardData.set(id, cardData);
	}

	public cleanup() {
		this.cardData.clear();
	}

	public restoreCard(html: string) {
		for (const [key, value] of this.cardData.entries()) {
			const exp = `<section[^>]*\\sdata-id="${key}"[^>]*>(.*?)<\\/section>`;
			const regex = new RegExp(exp, 'gs');
			if (!regex.test(html)) {
				console.error('未能正确替换公众号卡片');
			}
			html = html.replace(regex, value);
		}
		return html;
	}
}

const MermaidSectionClassName = 'note-mermaid';
const MermaidImgClassName = 'note-mermaid-img';

export class CodeRenderer extends Extension {
	showLineNumber: boolean;
	mermaidIndex: number;

	async prepare()  {
		this.mermaidIndex = 0;
	}

	static srcToBlob(src: string) {
		const base64 = src.split(',')[1];
		const byteCharacters = atob(base64);
		const byteNumbers = new Array(byteCharacters.length);
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i);
		}
		const byteArray = new Uint8Array(byteNumbers);
		return new Blob([byteArray], { type: 'image/png' });
	}

	static async uploadMermaidImages(root: HTMLElement, token: string) {
	    const imgs = root.querySelectorAll('.' + MermaidImgClassName);
		for (let img of imgs) {
			const src = img.getAttribute('src');
			if (!src) continue;
			if (src.startsWith('http')) continue;
			const blob = CodeRenderer.srcToBlob(img.getAttribute('src')!);
			const name = img.id + '.png';
			const res = await wxUploadImage(blob, name, token);
            if (res.errcode != 0) {
                const msg = `上传图片失败: ${res.errcode} ${res.errmsg}`;
                new Notice(msg);
                console.error(msg);
				continue;
            }
            const url = res.url;
			img.setAttribute('src', url);
	    }
	}

	codeRenderer(code: string, infostring: string | undefined): string {
		const lang = (infostring || '').match(/^\S*/)?.[0];
		code = code.replace(/\n$/, '') + '\n';
	
		let codeSection = '';
		if (this.settings.lineNumber) {
			const lines = code.split('\n');
			
			let liItems = '';
			let count = 1;
			while (count < lines.length) {
				liItems = liItems + `<li>${count}</li>`;
				count = count + 1;
			}
			codeSection='<section class="code-section"><ul>'
				+ liItems
				+ '</ul>';
		}
		else {
			codeSection='<section class="code-section">';
		}
			
		if (!lang) {
		  return codeSection + '<pre><code>'
			+ code
			+ '</code></pre></section>\n';
		}
	
		return codeSection+'<pre><code class="hljs language-'
		  + lang
		  + '">'
		  + code
		  + '</code></pre></section>\n';
	}

	static getMathType(lang: string|null) {
		if (!lang) return null;
		let l = lang.toLowerCase();
		l = l.trim();
		if (l === 'am' || l === 'asciimath') return 'asciimath';
		if (l === 'latex' || l === 'tex') return 'latex';
		return null;
	}

	parseCard(htmlString: string) {
		const id = /data-id="([^"]+)"/;
		const headimgRegex = /data-headimg="([^"]+)"/;
		const nicknameRegex = /data-nickname="([^"]+)"/;
		const signatureRegex = /data-signature="([^"]+)"/;
	
		const idMatch = htmlString.match(id);
		const headimgMatch = htmlString.match(headimgRegex);
		const nicknameMatch = htmlString.match(nicknameRegex);
		const signatureMatch = htmlString.match(signatureRegex);
	
		return {
			id: idMatch ? idMatch[1] : '',
			headimg: headimgMatch ? headimgMatch[1] : '',
			nickname: nicknameMatch ? nicknameMatch[1] : '公众号名称',
			signature: signatureMatch ? signatureMatch[1] : '公众号介绍'
		};
	}

	renderCard(token: Tokens.Code) {
		const { id, headimg, nickname, signature } = this.parseCard(token.text);
		if (id === '') {
			return '<span>公众号卡片数据错误，没有id</span>';
		}
		CardDataManager.getInstance().setCardData(id, token.text);
		return `<section data-id="${id}" class="note-mpcard-wrapper"><div class="note-mpcard-content"><img class="note-mpcard-headimg" width="54" height="54" src="${headimg}"></img><div class="note-mpcard-info"><div class="note-mpcard-nickname">${nickname}</div><div class="note-mpcard-signature">${signature}</div></div></div><div class="note-mpcard-foot">公众号</div></section>`;
	}

	renderMermaid(token: Tokens.Code) {
		try {
			const meraidIndex = this.mermaidIndex;
			const containerId = `mermaid-${meraidIndex}`;
			const imgId = `meraid-img-${meraidIndex}`;
			this.mermaidIndex += 1;
			const failElement = '<span>mermaid渲染失败</span>';
            let container: HTMLElement | null = null;
            const currentFile = this.app.workspace.getActiveFile();
            const leaves = this.app.workspace.getLeavesOfType('markdown');
            for (let leaf of leaves) {
                const markdownView = leaf.view as MarkdownView;
                if (markdownView.file?.path === currentFile?.path) {
                    container = markdownView.containerEl;
                }
            }
            if (container) {
                const containers = container.querySelectorAll('.mermaid');
				if (containers.length < meraidIndex) {
				    return failElement;
				}
				const root = containers[meraidIndex];
				toPng(root as HTMLElement).then(dataUrl => {
					this.callback.updateElementByID(containerId, `<img id="${imgId}" class="${MermaidImgClassName}" src="${dataUrl}"></img>`);
				})
				.catch(error => {
					console.error('oops, something went wrong!', error);
					this.callback.updateElementByID(containerId, failElement);
				});
				return `<section id="${containerId}" class="${MermaidSectionClassName}">渲染中</section>`;
            } else {
                console.error('container is null');
				return failElement;
            }
        } catch (error) {
            console.error(error.message);
			return '<span>mermaid渲染失败</span>';
        }
	}

	markedExtension() {
		return {extensions:[{
			name: 'code',
			level: 'block',
			renderer: (token: Tokens.Code) => {
				if (this.settings.isAuthKeyVaild()) {
					const type = CodeRenderer.getMathType(token.lang??'');
					if (type) {
						return MathRendererQueue.getInstance().render(token, false, type, this.callback);
					}
					if (token.lang && token.lang.trim().toLocaleLowerCase() =='mermaid') {
						return this.renderMermaid(token);
					}
				}
				if (token.lang && token.lang.trim().toLocaleLowerCase() =='mpcard') {
					return this.renderCard(token);
				}
				return this.codeRenderer(token.text, token.lang);
			},
		}]}
	}
}

