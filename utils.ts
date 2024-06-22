import { Token, Tokens, Marked, options, Lexer} from "marked";
import { markedHighlight } from "marked-highlight";
import { App } from "obsidian";
import hljs from "highlight.js";
import GetCallout from "callouts";
import { LocalImageExtension } from "img-extension";


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

function code(code: string, infostring: string | undefined): string {
    const lang = (infostring || '').match(/^\S*/)?.[0];
    code = code.replace(/\n$/, '') + '\n';

	let codeSection = '';
	if (parseOptions.lineNumber) {
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

function codeRender(codeToken:Tokens.Code) {
	const result = code(codeToken.text, codeToken.lang);
	return result;
}

function matchCallouts(text:string) {
    const regex = /\[\!(.*?)\]/g;
	let m;
	if( m = regex.exec(text)) {
	    return m[1];
	}
	return "";
}

function GetCalloutTitle(callout:string, text:string) {
	let title = callout.charAt(0).toUpperCase() + callout.slice(1)
	let start = text.indexOf(']') + 1;
	if (text.indexOf(']-') > 0 || text.indexOf(']+') > 0) {
		start = start + 1;
	}
	let end = text.indexOf('\n');
	if (end === -1)  end = text.length;
	if (start >= end)  return title;
	title = text.slice(start, end).trim();
	return title;
}

function calloutRender(token: Tokens.Blockquote) {
	let callout = matchCallouts(token.text);
	if (callout == '') {
		const body = this.parser.parse(token.tokens);
        return `<blockquote>\n${body}</blockquote>\n`;;
	}

	const title = GetCalloutTitle(callout, token.text);
	const info = GetCallout(callout);
	const lexer = new Lexer(markedOptiones);
	const index = token.text.indexOf('\n');
	let body = '';
	if (index > 0) {
		token.text = token.text.slice(index+1)
		token.tokens = lexer.lex(token.text);
		body = this.parser.parse(token.tokens);
	} 
	
	return `
		<section class="note-callout ${info?.style}">
			<section class="note-callout-title-wrap">
				${info?.icon}
				<span class="note-callout-title">${title}<span>
			</section>
			<section class="note-callout-content">
				${body}
			</section>
		</section>`;
}

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
	return `<seciton class="footnotes"><hr><ol>${links.join('\n')}</ol></section>`;
}

export async function markedParse(content:string, op:ParseOptions, app:App)  {
	parseOptions.lineNumber = op.lineNumber;
	parseOptions.linkStyle = op.linkStyle;

	const m = new Marked(
	    markedHighlight({
	    langPrefix: 'hljs language-',
	    highlight(code, lang, info) {
		  if (lang && hljs.getLanguage(lang)) {
		      try {
		          const result = hljs.highlight(lang, code);
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
		extensions: [{
		    name: 'code',
			level: 'block',
			renderer(token) {
				return codeRender.call(this, token);
			},
		},
		{
			name: 'blockquote',
			level: 'block',
			renderer(token) {
				return calloutRender.call(this, token as Tokens.Blockquote);
			}, 
		},
		LocalImageExtension(app)
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

function getStyleSheet() {
	for (var i = 0; i < document.styleSheets.length; i++) {
		var sheet = document.styleSheets[i];
		if (sheet.title == 'note-to-mp-style') {
		  return sheet;
		}
	}
}

function applyStyles(element: HTMLElement, styles: CSSStyleDeclaration, computedStyle: CSSStyleDeclaration) {
	for (let i = 0; i < styles.length; i++) {
		const propertyName = styles[i];
		let propertyValue = computedStyle.getPropertyValue(propertyName);
		if (propertyName == 'width' && styles.getPropertyValue(propertyName) == 'fit-content') {
			propertyValue = 'fit-content';
		}
		if (propertyName.indexOf('margin') >= 0 && styles.getPropertyValue(propertyName).indexOf('auto') >= 0) {
		    propertyValue = styles.getPropertyValue(propertyName);
		}
		element.style.setProperty(propertyName, propertyValue);
	}
}

function parseAndApplyStyles(element: HTMLElement, sheet:CSSStyleSheet) {
	try {
		const computedStyle = getComputedStyle(element);
		for (let i = 0; i < sheet.cssRules.length; i++) {
			const rule = sheet.cssRules[i];
			if (rule instanceof CSSStyleRule && element.matches(rule.selectorText)) {
			  	applyStyles(element, rule.style, computedStyle);
			}
		}
	} catch (e) {
		console.warn("Unable to access stylesheet: " + sheet.href, e);
	}
}

function traverse(root: HTMLElement, sheet:CSSStyleSheet) {
	let element = root.firstElementChild;
	while (element) {
	  	traverse(element as HTMLElement, sheet);
	  	element = element.nextElementSibling;
	}
	parseAndApplyStyles(root, sheet);
}

export async function CSSProcess(content: HTMLElement) {
	// 获取样式表
	const style = getStyleSheet();
	if (style) {
		traverse(content, style);
	}
}