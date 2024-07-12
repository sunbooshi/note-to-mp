import { Tokens } from "marked";
import { MathRenderer } from "./math";

export class CodeRenderer {
	showLineNumber: boolean;
	mathRenderer: MathRenderer|null;

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
				return this.codeRenderer(token.text, token.lang);
			},
		}
	}
}

