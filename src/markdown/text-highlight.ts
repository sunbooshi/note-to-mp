import { Token, Tokens, Lexer, MarkedExtension } from "marked";
import { Extension } from "./extension";

const highlightRegex = /^==(.*?)==/;

export class TextHighlight extends Extension {
    markedExtension(): MarkedExtension {
        return {
            extensions: [{
                name: 'InlineHighlight',
                level: 'inline',
                start(src: string) {
                    let index;
                    let indexSrc = src;

                    while (indexSrc) {
                        index = indexSrc.indexOf('==');
                        if (index === -1) return;
                        return index;
                    }
                },
                tokenizer(src: string, tokens: Token[]) {
                    const match = src.match(highlightRegex);
                    if (match) {
                        return {
                            type: 'InlineHighlight',
                            raw: match[0],
                            text: match[1],
                        };
                    }
                },
                renderer(token: Tokens.Generic) {
                    const lexer = new Lexer();
                    const tokens = lexer.lex(token.text);
                    // TODO: 优化一下
                    let body = this.parser.parse(tokens)
                    body = body.replace('<p>', '')
                    body = body.replace('</p>', '')
                    return `<span class="note-highlight">${body}</span>`;
                }
            }]
        };
    }
}