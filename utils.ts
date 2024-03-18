import { Token, Tokens, Marked, options} from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

function code(code: string, infostring: string | undefined): string {
    const lang = (infostring || '').match(/^\S*/)?.[0];

    code = code.replace(/\n$/, '') + '\n';
    const lines = code.split('\n');
    
    let liItems = '';
    let count = 1;
    while (count < lines.length) {
        liItems = liItems + `<li>${count}</li>`;
        count = count + 1;
    }
    
    const codeSection='<section class="code-section"><ul>'
        + liItems
        + '</ul>';
        
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
		if (token.text.indexOf(token.href) === -1) {
			token.text = token.text + '[' + token.href + ']';
			token.tokens = this.Lexer.lexInline(token.text)
		}
	}
}

export async function markedParse(content:string)  {
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
	return await m.parse(content);
}
