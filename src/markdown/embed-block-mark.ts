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