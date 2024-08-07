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
                    if (token.text.indexOf(token.href) === 0 || (token.href.indexOf('https://mp.weixin.qq.com/s') === 0)) {
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