import { NMPSettings } from "src/settings";
import { Marked, MarkedExtension } from "marked";
import { App, Vault } from "obsidian";
import AssetsManager from "../assets";

export interface MDRendererCallback {
   settings: NMPSettings;
   updateElementByID(id:string, html:string):void;
}

export abstract class Extension {
    app: App;
    vault: Vault;
    assetsManager: AssetsManager
    settings: NMPSettings;
    callback: MDRendererCallback;
    marked: Marked;

    constructor(app: App, settings: NMPSettings, assetsManager: AssetsManager, callback: MDRendererCallback) {
        this.app = app;
        this.vault = app.vault;
        this.settings = settings;
        this.assetsManager = assetsManager;
        this.callback = callback;
    }

    async prepare() { return; }
    async postprocess(html:string) { return html; }
    async beforePublish() { }
    async cleanup() { return; }
    abstract markedExtension(): MarkedExtension
}