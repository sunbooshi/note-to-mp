import { Token, Tokens, Marked, options} from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

export interface ParseOptions {
    lineNumber: boolean;
	linkStyle: 'footnote' | 'inline';
}

let AllLinks:string[] = [];
const parseOptions:ParseOptions = {
    lineNumber: true,
	linkStyle: 'footnote'
}

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

function walkTokens(token:Token) {
	if (token.type == 'link') {
		const link = token as Tokens.Link;
		if (token.text.indexOf(token.href) === -1) {
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
	const links = AllLinks.map((href, i) => {
		return `<li>${href}&nbsp;↩</li>`;
	});
	return `<seciton class="footnotes"><hr><ol>${links.join('\n')}</ol></section>`;
}

export async function markedParse(content:string, op:ParseOptions)  {
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
	m.use({walkTokens});
	m.use({
		extensions: [{
		    name: 'code',
			level: 'block',
			renderer(token) {
				return codeRender.call(this, token);
			},
		}]
	});
	const html = await m.parse(content);
	if (parseOptions.linkStyle == 'footnote') {
	    return html + footnoteLinks();
	}
	return html;
}