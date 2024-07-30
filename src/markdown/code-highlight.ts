import { MarkedExtension } from "marked";
import { Extension } from "./extension";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { CodeRenderer } from "./code";

export class CodeHighlight extends Extension {
    markedExtension(): MarkedExtension {
        return markedHighlight({
            langPrefix: 'hljs language-',
            highlight(code, lang, info) {
                const type = CodeRenderer.getMathType(lang)
                if (type) return code;
                if (lang && lang.trim().toLocaleLowerCase() == 'mpcard') return code;
    
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
    }
}