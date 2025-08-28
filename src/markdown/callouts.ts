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

import { Tokens, MarkedExtension} from "marked";
import { Extension } from "./extension";
import AssetsManager from "src/assets";
import { wxWidget } from "src/weixin-api";

const icon_note = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>`
const icon_abstract = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-clipboard-list"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>`
const icon_info = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-info"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`
const icon_todo = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-check-circle-2"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>`
const icon_tip = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-flame"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`
const icon_success = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-check"><path d="M20 6 9 17l-5-5"></path></svg>`
const icon_question = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-help-circle"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>`
const icon_warning = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`
const icon_failure = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-x"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`
const icon_danger = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
const icon_bug = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-bug"><path d="m8 2 1.88 1.88"></path><path d="M14.12 3.88 16 2"></path><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"></path><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"></path><path d="M12 20v-9"></path><path d="M6.53 9C4.6 8.8 3 7.1 3 5"></path><path d="M6 13H2"></path><path d="M3 21c0-2.1 1.7-3.9 3.8-4"></path><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"></path><path d="M22 13h-4"></path><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"></path></svg>`
const icon_example = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-list"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`
const icon_quote = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path></svg>`
/*
note,
abstract, summary, tldr
info
todo
tip
hint, important
success, check, done
question, help, faq
warning, caution, attention
failure, fail, missing
danger, error
bug
example
quote, cite
*/

type CalloutInfo = {icon: string, style: string}

const CalloutTypes = new Map<string, CalloutInfo>(Object.entries({
    note: {
        icon: icon_note,
        style: 'note-callout-note',
    },
    abstract: {
        icon: icon_abstract,
        style: 'note-callout-abstract',
    },
    summary: {
        icon: icon_abstract,
        style: 'note-callout-abstract',
    },
    tldr: {
        icon: icon_abstract,
        style: 'note-callout-abstract',
    },
    info: {
        icon: icon_info,
        style: 'note-callout-note',
    },
    todo: {
        icon: icon_todo,
        style: 'note-callout-note',
    },
    tip: {
        icon: icon_tip,
        style: 'note-callout-abstract',
    },
    hint: {
        icon: icon_tip,
        style: 'note-callout-abstract',
    },
    important: {
        icon: icon_tip,
        style: 'note-callout-abstract',
    },
    success: {
        icon: icon_success,
        style: 'note-callout-success',
    },
    check: {
        icon: icon_success,
        style: 'note-callout-success',
    },
    done: {
        icon: icon_success,
        style: 'note-callout-success',
    },
    question: {
        icon: icon_question,
        style: 'note-callout-question',
    },
    help: {
        icon: icon_question,
        style: 'note-callout-question',
    },
    faq: {
        icon: icon_question,
        style: 'note-callout-question',
    },
    warning: {
        icon: icon_warning,
        style: 'note-callout-question',
    },
    caution: {
        icon: icon_warning,
        style: 'note-callout-question',
    },
    attention: {
        icon: icon_warning,
        style: 'note-callout-question',
    },
    failure: {
        icon: icon_failure,
        style: 'note-callout-failure',
    },
    fail: {
        icon: icon_failure,
        style: 'note-callout-failure',
    },
    missing: {
        icon: icon_failure,
        style: 'note-callout-failure',
    },
    danger: {
        icon: icon_danger,
        style: 'note-callout-failure',
    },
    error: {
        icon: icon_danger,
        style: 'note-callout-failure',
    },
    bug: {
        icon: icon_bug,
        style: 'note-callout-failure',
    },
    example: {
        icon: icon_example,
        style: 'note-callout-example',
    },
    quote: {
        icon: icon_quote,
        style: 'note-callout-quote',
    },
    cite: {
        icon: icon_quote,
        style: 'note-callout-quote',
    }
}));

function GetCallout(type: string) {
    return CalloutTypes.get(type);
};

function matchCallouts(text:string) {
    const regex = /\[\!(.*?)\]/g;
	let m;
	if( m = regex.exec(text)) {
	    return m[1];
	}
	return "";
}

function GetCalloutTitle(callout:string, text:string) {
	let title = callout.charAt(0).toUpperCase() + callout.slice(1).toLowerCase();
	let start = text.indexOf(']') + 1;
	if (text.indexOf(']-') > 0 || text.indexOf(']+') > 0) {
		start = start + 1;
	}
	let end = text.indexOf('\n');
	if (end === -1)  end = text.length;
	if (start >= end)  return title;
	const customTitle = text.slice(start, end).trim();
	if (customTitle !== '') {
		title = customTitle;
	}
	return title;
}

export class CalloutRenderer extends Extension {
    matched(text: string) {
        return matchCallouts(text) != '';
    }

    async renderer(token: Tokens.Blockquote) {
        let callout = matchCallouts(token.text);
        if (callout == '') {
            const body = this.marked.parser(token.tokens);
            return `<blockquote>${body}</blockquote>`;;
        }
    
        const title = GetCalloutTitle(callout, token.text);
        const index = token.text.indexOf('\n');
        let body = '';
        if (index > 0) {
            token.text = token.text.slice(index+1)
            body = await this.marked.parse(token.text);
        } 

        const setting = AssetsManager.getInstance().expertSettings.render?.callout as { [key: string]: any };
        if (setting && callout.toLocaleLowerCase() in setting) {
            const authkey = this.settings.authKey;
            const widget = setting[callout.toLocaleLowerCase()];
            if (typeof widget === 'number') {
                return await wxWidget(authkey, JSON.stringify({
                    id: `${widget}`,
                    title,
                    content: body,
                }));
            }
            if (typeof widget === 'object') {
                const {id, style} = widget;
                return await wxWidget(authkey, JSON.stringify({
                    id: `${id}`,
                    title,
                    style: style || {},
                    content: body,
                }));
            }
        }

        let info = GetCallout(callout.toLowerCase());
        if (info == null) {
            const svg = await this.assetsManager.loadIcon(callout);
            if (svg) {
                info = {icon: svg, style: 'note-callout-custom'}
            }
            else {
                info = GetCallout('note');
            }
        }

        
        return `<section class="note-callout ${info?.style}"><section class="note-callout-title-wrap"><span class="note-callout-icon">${info?.icon}</span><span class="note-callout-title">${title}<span></section><section class="note-callout-content">${body}</section></section>`;
     }

    markedExtension(): MarkedExtension {
        return {
            async: true,
            walkTokens: async (token: Tokens.Generic) => {
                if (token.type !== 'blockquote') {
                    return;
                }
                token.html = await this.renderer(token as Tokens.Blockquote);
            },
            extensions:[{
                name: 'blockquote',
                level: 'block',
                renderer: (token: Tokens.Generic)=> {
                    return token.html;
                }, 
            }]
        }
    }
}