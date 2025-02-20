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

const BlockMarkRegex = /^\^[0-9A-Za-z-]+$/;

export class EmbedBlockMark extends Extension {
    allLinks:string[] = [];
    async prepare() {
       this.allLinks = [];
    }

    markedExtension(): MarkedExtension {
        return {
            extensions: [{
                name: 'EmbedBlockMark',
                level: 'inline',
                start(src: string) {
                    let index = src.indexOf('^');
                    if (index === -1) {
                        return;
                    }
                    return index;
                },
                tokenizer(src: string) {
                    const match = src.match(BlockMarkRegex);
                    if (match) {
                        return {
                            type: 'EmbedBlockMark',
                            raw: match[0],
                            text: match[0]
                        };
                    }
                },
                renderer: (token: Tokens.Generic) => {
                    return `<span data-txt="${token.text}"></span}`;
                }
            }]
        }
    }
}