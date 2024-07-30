import { Tokens, MarkedExtension } from "marked";
import { Extension } from "./extension";

const iconsRegex = /^\[:(.*?):\]/;

export class SVGIcon extends Extension {
    markedExtension(): MarkedExtension {
        return {
            async: true,
            walkTokens: async (token: Tokens.Generic) => {
                if (token.type !== 'SVGIcon') {
                    return;
                }
                const name = token.text;
                const svg = await this.assetsManager.loadIcon(name);
                const body = svg==='' ? '未找到图标' + name : svg;
                token.html = `<span class="note-svg-icon">${body}</span>`
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