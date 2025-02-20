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

const iconsRegex = /^\[:(.*?):\]/;

export class SVGIcon extends Extension {
    isNumeric(str: string): boolean {
        return !isNaN(Number(str)) && str.trim() !== '';
    }
      
    getSize(size: string) {
        const items = size.split('x');
        let width, height;
        if (items.length == 2) {
            width = items[0];
            height = items[1];
        }
        else {
            width = items[0];
            height = items[0];
        }
        width = this.isNumeric(width) ? width+'px' : width;
        height = this.isNumeric(height) ? height+'px' : height;
        return {width, height};
    }

    renderStyle(items: string[]) {
        let size = '';
        let color = '';
        if (items.length == 3) {
            size = items[1];
            color = items[2];
        }
        else if (items.length == 2) {
            if (items[1].startsWith('#')) {
                color = items[1];
            }
            else {
                size = items[1];
            }
        }
        let style = '';
        if (size.length > 0) {
            const {width, height} = this.getSize(size);
            style += `width:${width};height:${height};`;
        }
        if (color.length > 0) {
            style += `color:${color};`;
        }
        return style.length > 0 ? `style="${style}"` : '';
    }

    async render(text: string) {
        const items = text.split('|');
        const name = items[0];
        const svg = await this.assetsManager.loadIcon(name);
        const body = svg==='' ? '未找到图标' + name : svg;
        const style = this.renderStyle(items);
        return `<span class="note-svg-icon" ${style}>${body}</span>`
    }
    
    markedExtension(): MarkedExtension {
        return {
            async: true,
            walkTokens: async (token: Tokens.Generic) => {
                if (token.type !== 'SVGIcon') {
                    return;
                }
                token.html = await this.render(token.text);
            },
            extensions: [{
                name: 'SVGIcon',
                level: 'inline',
                start(src: string) {
                    let index;
                    let indexSrc = src;

                    while (indexSrc) {
                        index = indexSrc.indexOf('[:');
                        if (index === -1) return;
                        return index;
                    }
                },
                tokenizer(src: string) {
                    const match = src.match(iconsRegex);
                    if (match) {
                        return {
                            type: 'SVGIcon',
                            raw: match[0],
                            text: match[1],
                        };
                    }
                },
                renderer(token: Tokens.Generic) {
                    return token.html;
                }
            }]
        }
    }
}