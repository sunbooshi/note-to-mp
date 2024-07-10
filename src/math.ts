import { Token, Tokens } from "marked";
import { App, Vault, Notice, request, requestUrl, sanitizeHTMLToDom } from "obsidian";
import { NotePreview } from "./note-preview";
import { PreviewSetting } from "./settings";

const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:？！。，：]|$)/;
const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;

export interface MathRendererCallback {
    updateMath(id: string, svg: string):void;
}

export class MathRenderer {
    callback: MathRendererCallback;
    svgCache: Map<string, string>;
    mathIndex: number;
    rendererQueue: RendererQueue;
    setting: PreviewSetting;


    constructor(callback: MathRendererCallback, setting: PreviewSetting) {
        this.callback = callback;
        this.svgCache = new Map();
        this.mathIndex = 0;
        this.setting = setting;
        this.rendererQueue = new RendererQueue(setting.authKey);
    }

    generateId() {
        this.mathIndex += 1;
        return `math-id-${this.mathIndex}`;
    }

    async renderMath(expression: string, inline: boolean, id: string) {
        this.rendererQueue.getMathSVG(expression, inline, this.setting.math, (svg: string)=>{
            this.svgCache.set(expression, svg);
            this.callback.updateMath(id, svg); 
        })
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

                    if (index === 0 || indexSrc.charAt(index - 1) === ' ') {
                        const possibleKatex = indexSrc.substring(index);

                        if (possibleKatex.match(inlineRule)) {
                            return index;
                        }
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
                const id = this.generateId();
                let svg = '渲染中';
                if (this.svgCache.has(token.text)) {
                    svg = this.svgCache.get(token.text) as string;
                    console.log('render from cache:' + id);
                }
                else {
                    this.renderMath(token.text, false, id);
                }
                return `<span id="${id}" class="inline-math-svg">${svg}</span>`;
            }
        }
    }
    blockMath() {
        return {
            name: 'BlockMath',
            level: 'block',
            tokenizer(src: string, tokens: Token[]) {
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
                const id = this.generateId();
                let svg = '渲染中';
                if (this.svgCache.has(token.text)) {
                    svg = this.svgCache.get(token.text) as string;
                    console.log('render from cache:' + id);
                }
                else {
                    this.renderMath(token.text, false, id);
                }
                return `<span id="${id}" class="block-math-section">${svg}</span>`;
            }
        };
    }
}

class RendererQueue {
    private queue: (() => Promise<any>)[] = [];
    private isProcessing: boolean = false;
    // TODO: 测试
    private host = 'http://10.1.1.178:3000'
    private authkey: string;

    constructor (authkey: string) {
        this.authkey = authkey;
        // TODO: 测试
        this.authkey = 'c95581ff-0b03-4390-9be6-97bc5cfc7ae5'
    }

    getMathSVG(expression:string, inline:boolean, type:string, callback:(svg:string)=>void) {
        const req = () => {
            return new Promise<void>((resolve, reject) => {
                let path = '';
                if (type === 'asciimath') {
                    path = '/math/am';
                }
                else {
                    path = '/math/tex';
                }

                const url = `${this.host}${path}`;
                requestUrl({
                    url,
                    method: 'POST',
                    contentType: 'application/json',
                    headers: {
                        authkey: this.authkey
                    },
                    body: JSON.stringify({
                        expression,
                        inline
                    })
                }).then(res => {
                    let svg = ''
                    if (res.status === 200) {
                        svg = res.text;
                    }
                    else {
                        console.error('render error: ' + res.json.msg)
                        svg = '渲染失败';
                    }
                    callback(svg);
                    resolve();
                })
       })}
       this.enqueue(req);
    }
    // 添加请求到队列
    enqueue(request: () => Promise<any>): void {
        this.queue.push(request);
        this.processQueue();
    }
    
    // 处理队列中的请求
    private async processQueue(): Promise<void> {
        if (this.isProcessing) {
            return;
        }
    
        this.isProcessing = true;
    
        while (this.queue.length > 0) {
            const request = this.queue.shift();
            if (request) {
                try {
                    await request();
                    console.log('finish request');
                } catch (error) {
                    console.error('Request failed:', error);
                }
            }
        }
    
        this.isProcessing = false;
    }
}