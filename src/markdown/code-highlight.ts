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