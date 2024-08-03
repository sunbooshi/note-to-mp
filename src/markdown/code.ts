import { Tokens } from "marked";
import { MathRendererQueue } from "./math";
import { Extension } from "./extension";

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

export class CodeRenderer extends Extension {
	showLineNumber: boolean;

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
				}
				if (token.lang && token.lang.trim().toLocaleLowerCase() =='mpcard') {
					return this.renderCard(token);
				}
				return this.codeRenderer(token.text, token.lang);
			},
		}]}
	}
}

