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

import { MarkedExtension, Token, Tokens } from "marked";
import { requestUrl } from "obsidian";
import { Extension } from "./extension";
import { NMPSettings } from "src/settings";

const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1/;
const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;

const svgCache = new Map<string, string>();

export function cleanMathCache() {
    svgCache.clear();
}

export class MathRendererQueue {
    private host = 'https://obplugin.sunboshi.tech';
    private static instance: MathRendererQueue;
    private mathIndex: number = 0;

    // 静态方法，用于获取实例
    public static getInstance(): MathRendererQueue {
        if (!MathRendererQueue.instance) {
            MathRendererQueue.instance = new MathRendererQueue();
        }
        return MathRendererQueue.instance;
    }

    private constructor() {
    }

    async getMathSVG(expression: string, inline: boolean, type: string) {
        try {
            let success = false;
            let path = '';
            if (type === 'asciimath') {
                path = '/math/am';
            }
            else {
                path = '/math/tex';
            }

            const url = `${this.host}${path}`;
            const res = await requestUrl({
                url,
                method: 'POST',
                contentType: 'application/json',
                headers: {
                    authkey: NMPSettings.getInstance().authKey
                },
                body: JSON.stringify({
                    expression,
                    inline
                })
            })
            let svg = ''
            if (res.status === 200) {
                svg = res.text;
                success = true;
            }
            else {
                console.error('render error: ' + res.json.msg)
                svg = '渲染失败: ' + res.json.msg;
            }
            return { svg, success };
        }
        catch (err) {
            console.log(err.msg);
            const svg = '渲染失败: ' + err.message;
            return { svg, success: false };
        }
    }

    generateId() {
        this.mathIndex += 1;
        return `math-id-${this.mathIndex}`;
    }

    async render(token: Tokens.Generic, inline: boolean, type: string) {
        if (!NMPSettings.getInstance().isAuthKeyVaild()) {
            return '<span>注册码无效或已过期</span>';
        }

        const id = this.generateId();
        let svg = '渲染中';
        const expression = token.text;
        if (svgCache.has(token.text)) {
            svg = svgCache.get(expression) as string;
        }
        else {
            const res = await this.getMathSVG(expression, inline, type)
            if (res.success) {
                svgCache.set(expression, res.svg);
            }
            svg = res.svg;
        }

        const className = inline ? 'inline-math-svg' : 'block-math-svg';
        const body = inline ? svg : `<section class="block-math-section">${svg}</section>`;
        return `<span id="${id}" class="${className}">${body}</span>`;
    }
}


export class MathRenderer extends Extension {
    async renderer(token: Tokens.Generic, inline: boolean, type: string = '') {
        if (type === '') {
            type = this.settings.math;
        }
        return await MathRendererQueue.getInstance().render(token, inline, type);
    }

    markedExtension(): MarkedExtension {
        return {
            async: true,
            walkTokens: async (token: Tokens.Generic) => {
                if (token.type === 'InlineMath' || token.type === 'BlockMath') {
                    token.html = await this.renderer(token, token.type === 'InlineMath');
                }
            },
            extensions: [
                this.inlineMath(),
                this.blockMath()
            ]
        }
    }

    inlineMath() {
        return {
            name: 'InlineMath',
            level: 'inline',
            start(src: string) {
                let index;
                let indexSrc = src;

                while (indexSrc) {
                    index = indexSrc.indexOf('$');
                    if (index === -1) {
                        return;
                    }

                    const possibleKatex = indexSrc.substring(index);

                    if (possibleKatex.match(inlineRule)) {
                        return index;
                    }

                    indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, '');
                }
            },
            tokenizer(src: string, tokens: Token[]) {
                const match = src.match(inlineRule);
                if (match) {
                    return {
                        type: 'InlineMath',
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2
                    };
                }
            },
            renderer: (token: Tokens.Generic) => {
                return token.html;
            }
        }
    }
    blockMath() {
        return {
            name: 'BlockMath',
            level: 'block',
            tokenizer(src: string) {
                const match = src.match(blockRule);
                if (match) {
                    return {
                        type: 'BlockMath',
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2
                    };
                }
            },
            renderer: (token: Tokens.Generic) => {
                return token.html;
            }
        };
    }
}
