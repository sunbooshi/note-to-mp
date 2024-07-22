import { Tokens } from "marked";
import { MathRenderer } from "./math";

export class CodeRenderer {
	showLineNumber: boolean;
	mathRenderer: MathRenderer|null;
	cardData: string | null;

    constructor(showLineNumber: boolean, mathRenderer: MathRenderer|null) {
		this.showLineNumber = showLineNumber;
		this.mathRenderer = mathRenderer;
	}

	codeRenderer(code: string, infostring: string | undefined): string {
		const lang = (infostring || '').match(/^\S*/)?.[0];
		code = code.replace(/\n$/, '') + '\n';
	
		let codeSection = '';
		if (this.showLineNumber) {
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
		const headimgRegex = /data-headimg="([^"]+)"/;
		const nicknameRegex = /data-nickname="([^"]+)"/;
		const signatureRegex = /data-signature="([^"]+)"/;
	
		const headimgMatch = htmlString.match(headimgRegex);
		const nicknameMatch = htmlString.match(nicknameRegex);
		const signatureMatch = htmlString.match(signatureRegex);
	
		return {
			headimg: headimgMatch ? headimgMatch[1] : '',
			nickname: nicknameMatch ? nicknameMatch[1] : '公众号名称',
			signature: signatureMatch ? signatureMatch[1] : '公众号介绍'
		};
	}

	renderCard(token: Tokens.Code) {
		this.cardData = token.text;
		const { headimg, nickname, signature } = this.parseCard(token.text);
		return `<div class="note-mpcard-wrapper"><div class="note-mpcard-content"><img class="note-mpcard-headimg" width="54" height="54" src="${headimg}"></img><div class="note-mpcard-info"><div class="note-mpcard-nickname">${nickname}</div><div class="note-mpcard-signature">${signature}</div></div></div><div class="note-mpcard-foot">公众号</div></div>`;
	}

	restoreCard(html: string) {
		if (this.cardData) {
			const divRegex = /<div class="note-mpcard-wrapper">[\s\S]*?<\/div>/;
			return html.replace(divRegex, this.cardData);
		}
		return html;
	}

	codeExtension() {
		return {
			name: 'code',
			level: 'block',
			renderer: (token: Tokens.Code) => {
				if (this.mathRenderer) {
					const type = CodeRenderer.getMathType(token.lang??'');
					if (type) {
						return this.mathRenderer.renderer(token, false, type);
					}
				}
				if (token.lang && token.lang.trim().toLocaleLowerCase() =='mpcard') {
					return this.renderCard(token);
				}
				return this.codeRenderer(token.text, token.lang);
			},
		}
	}
}

