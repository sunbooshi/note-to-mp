import { Token, Tokens, Marked, options, Lexer} from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import {calloutRender} from "./callouts";
import { CodeRenderer } from "./code";
import { bgHighlight } from "./bghighlight";

export interface ParseOptions {
    lineNumber: boolean;
	linkStyle: 'footnote' | 'inline';
};

let AllLinks:string[] = [];
const parseOptions:ParseOptions = {
    lineNumber: true,
	linkStyle: 'footnote'
};
const markedOptiones = {
    gfm: true,
    breaks: true,
};

function walkTokens(token:Token) {
	if (token.type == 'link') {
		const link = token as Tokens.Link;
		if (token.text.indexOf(token.href) === -1 && !(token.href.indexOf('https://mp.weixin.qq.com/s/') === 0)) {
			AllLinks.push(link.href);
			if (parseOptions.linkStyle == 'footnote') {
				const txtToken:Tokens.Text = {type: 'text', raw: link.text, text: link.text};
				token.tokens = [txtToken, ... this.Lexer.lexInline(`<sup>[${AllLinks.length}]</sup>`)];
			}
			else {
				for (const t of link.tokens) {
					if (t.type == 'text') {
						t.text = link.text + '[' + link.href + ']';
					}
				}
			}
		}
	}
}

function footnoteLinks() {
	if (AllLinks.length == 0) {
	    return '';
	}
	
	const links = AllLinks.map((href, i) => {
		return `<li>${href}&nbsp;↩</li>`;
	});
	return `<seciton class="footnotes"><hr><ol>${links.join('')}</ol></section>`;
}

export async function markedParse(content:string, op:ParseOptions, extensions:any[])  {
	parseOptions.lineNumber = op.lineNumber;
	parseOptions.linkStyle = op.linkStyle;

	const m = new Marked(
	    markedHighlight({
	    langPrefix: 'hljs language-',
	    highlight(code, lang, info) {
			const type = CodeRenderer.getMathType(lang)
			if (type) return code;

		  	if (lang && hljs.getLanguage(lang)) {
				try {
					const result = hljs.highlight(code, {language: lang});
					return result.value;
				} catch (err) {}
		  	}
		  
			try {
				const result = hljs.highlightAuto(code);
				return result.value;
			} catch (err) {}
			
			return ''; // use external default escaping
	    }
	  })
	);
	AllLinks = [];
	m.use(markedOptiones);
	m.use({walkTokens});
	m.use({
		extensions: [
		{
			name: 'blockquote',
			level: 'block',
			renderer(token) {
				return calloutRender.call(this, token as Tokens.Blockquote);
			}, 
		},
		bgHighlight(),
		... extensions
	]});

	const renderer = {
		heading(text: string, level: number, raw: string): string {
			// ignore IDs
			return `<h${level}>${text}</h${level}>`;
		},
		hr(): string {
			return '<hr>';
		},
		list(body: string, ordered: boolean, start: number | ''): string {
			const type = ordered ? 'ol' : 'ul';
			const startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
			return '<' + type + startatt + '>' + body + '</' + type + '>';
		},
		listitem(text: string, task: boolean, checked: boolean): string {
			return `<li>${text}</li>`;
		}
	};
	m.use({renderer});
	const html = await m.parse(content);
	if (parseOptions.linkStyle == 'footnote') {
	    return html + footnoteLinks();
	}
	return html;
}
