/*
 * Copyright (c) 2024-2025 Sun Booshi
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

import { Tokens, MarkedExtension } from "marked";
import { Extension } from "./extension";

export class LinkRenderer extends Extension {
    allLinks:string[] = [];
    async prepare() {
       this.allLinks = [];
    }

    async postprocess(html: string) {
        if (this.settings.linkStyle !== 'footnote'
            || this.allLinks.length == 0) {
            return html;
        }
        
        const links = this.allLinks.map((href, i) => {
            return `<li>${href}&nbsp;↩</li>`;
        });
        return `${html}<seciton class="footnotes"><hr><ol>${links.join('')}</ol></section>`;
    }

    markedExtension(): MarkedExtension {
        return {
            extensions: [{
                name: 'link',
                level: 'inline',
                renderer: (token: Tokens.Link) => {
                    if (token.href.startsWith('mailto:')) {
                        return token.text;
                    }
                    if (token.text.indexOf(token.href) === 0
                        || (token.href.indexOf('https://mp.weixin.qq.com/mp') === 0)
                        || (token.href.indexOf('https://mp.weixin.qq.com/s') === 0)) {
                        return `<a href="${token.href}">${token.text}</a>`;
                    }
                    this.allLinks.push(token.href);
                    if (this.settings.linkStyle == 'footnote') {
                        return `<a>${token.text}<sup>[${this.allLinks.length}]</sup></a>`;
                    }
                    else {
                        return `<a>${token.text}[${token.href}]</a>`;
                    }
                }
            }]
        }
    }
}