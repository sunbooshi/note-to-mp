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

import { App, Notice, sanitizeHTMLToDom, apiVersion, TFile, MarkdownRenderer, Component } from 'obsidian';
import { applyCSS } from './utils';
import { UploadImageToWx } from './imagelib';
import { NMPSettings } from './settings';
import AssetsManager from './assets';
import InlineCSS from './inline-css';
import { wxGetToken, wxAddDraft, wxBatchGetMaterial, DraftImageMediaId, DraftImages, wxAddDraftImages, getMetadata } from './weixin-api';
import { MDRendererCallback } from './markdown/extension';
import { MarkedParser } from './markdown/parser';
import { LocalImageManager, LocalFile } from './markdown/local-file';
import { CardDataManager } from './markdown/code';
import { debounce } from './utils';
import { PrepareImageLib, IsImageLibReady, WebpToJPG } from './imagelib';
import { toPng } from 'html-to-image';


const FRONT_MATTER_REGEX = /^(---)$.+?^(---)$.+?/ims;

export class ArticleRender implements MDRendererCallback {
  app: App;
  note: TFile | null = null;
  settings: NMPSettings;
  assetsManager: AssetsManager;
  articleHTML: string;
  title: string;
  markedParser: MarkedParser;
  cachedElements: Map<string, string> = new Map();
  debouncedRenderMarkdown: (...args: any[]) => void;

  constructor(app: App) {
    this.app = app;
    this.settings = NMPSettings.getInstance();
    this.assetsManager = AssetsManager.getInstance();
    this.articleHTML = '';
    this.title = '';
    this.markedParser = new MarkedParser(app, this);
    this.debouncedRenderMarkdown = debounce(this.renderMarkdown.bind(this), 1000);
  }


  setArticle(container:HTMLElement, article: string) {
    container.empty();
    let className = 'note-to-mp';
    const html = `<section class="${className}" id="article-section">${article}</section>`;
    const doc = sanitizeHTMLToDom(html);
    if (doc.firstChild) {
      container.appendChild(doc.firstChild);
    }
  }

  async getArticleContent(container: HTMLElement, css: string) {
    const content = container.innerHTML;
    let html = applyCSS(content, css);
    // 处理话题多余内容
    html = html.replace(/rel="noopener nofollow"/g, '');
    html = html.replace(/target="_blank"/g, '');
    html = html.replace(/data-leaf=""/g, 'leaf=""');
    return CardDataManager.getInstance().restoreCard(html);
  }

  getArticleText(container: HTMLElement) {
    return container.innerText.trimStart();
  }

  errorContent(error: any) {
    return '<h1>渲染失败!</h1><br/>'
      + '如需帮助请前往&nbsp;&nbsp;<a href="https://github.com/sunbooshi/note-to-mp/issues">https://github.com/sunbooshi/note-to-mp/issues</a>&nbsp;&nbsp;反馈<br/><br/>'
      + '如果方便，请提供引发错误的完整Markdown内容。<br/><br/>'
      + '<br/>Obsidian版本：' + apiVersion
      + '<br/>错误信息：<br/>'
      + `${error}`;
  }

  async renderMarkdown(contianer:HTMLElement, af: TFile) {
    try {
      let md = '';
      if (af.extension.toLocaleLowerCase() === 'md') {
        md = await this.app.vault.cachedRead(af);
        this.title = af.basename;
      }
      else {
        md = '没有可渲染的笔记或文件不支持渲染';
      }
      if (md.startsWith('---')) {
        md = md.replace(FRONT_MATTER_REGEX, '');
      }
      this.note = af;

      this.articleHTML = await this.markedParser.parse(md);
      this.setArticle(contianer, this.articleHTML);
      await this.processCachedElements(contianer);
    }
    catch (e) {
      console.error(e);
      this.setArticle(contianer, this.errorContent(e));
    }
  }

  async getCSS(note: TFile, themeName:string, highlightName: string) {
    try {
      let customCSS = this.settings.customCSSNote.length > 0 ? this.assetsManager.customCSS : '';
      const metadata = getMetadata(this.app, note);
      if (metadata.css) {
        const note = metadata.css.replace('[[', '').replace(']]', '');
        const css = await this.assetsManager.loadCSSFromNote(note);
        if (css) {
          customCSS = css;
        }
      }

      themeName = metadata.theme || themeName;
      highlightName = metadata.highlight || highlightName;
      const theme = this.assetsManager.getTheme(themeName);
      const highlight = this.assetsManager.getHighlight(highlightName);
      const baseCSS = this.settings.baseCSS ? `.note-to-mp {${this.settings.baseCSS}}` : '';
      return `${InlineCSS}\n\n${highlight!.css}\n\n${theme!.css}\n\n${baseCSS}\n\n${customCSS}`;
    } catch (error) {
      console.error(error);
      new Notice(`获取样式失败${themeName}|${highlightName}，请检查主题是否正确安装。`);
    }
    return '';
  }

  async uploadVaultCover(name: string, token: string) {
    const LocalFileRegex = /^!\[\[(.*?)\]\]/;
    const matches = name.match(LocalFileRegex);
    let fileName = '';
    if (matches && matches.length > 1) {
      fileName = matches[1];
    }
    else {
      fileName = name;
    }
    const vault = this.app.vault;
    const file = this.assetsManager.searchFile(fileName) as TFile;
    if (!file) {
      throw new Error('找不到封面文件: ' + fileName);
    }
    const fileData = await vault.readBinary(file);

    return await this.uploadCover(new Blob([fileData]), file.name, token);
  }

  async uploadCover(data: Blob, filename: string, token: string) {
    if (filename.toLowerCase().endsWith('.webp')) {
      await PrepareImageLib();
      if (IsImageLibReady()) {
        data = new Blob([WebpToJPG(await data.arrayBuffer())]);
        filename = filename.toLowerCase().replace('.webp', '.jpg');
      }
    }

    const res = await UploadImageToWx(data, filename, token, 'image');
    if (res.media_id) {
      return res.media_id;
    }
    console.error('upload cover fail: ' + res.errmsg);
    throw new Error('上传封面失败: ' + res.errmsg);
  }

  async getDefaultCover(token: string) {
    const res = await wxBatchGetMaterial(token, 'image');
    if (res.item_count > 0) {
      return res.item[0].media_id;
    }
    return '';
  }

  async getToken(appid: string) {
    const secret = this.getSecret(appid);
    const res = await wxGetToken(this.settings.authKey, appid, secret);
    if (res.status != 200) {
      const data = res.json;
      throw new Error('获取token失败: ' + data.message);
    }
    const token = res.json.token;
    if (token === '') {
      throw new Error('获取token失败: ' + res.json.message);
    }
    return token;
  }

  async uploadImages(appid: string, container: HTMLElement) {
    if (!this.settings.authKey) {
      return;
    }

    let metadata = getMetadata(this.app, this.note!);
    if (metadata.appid) {
      appid = metadata.appid;
    }

    if (!appid || appid.length == 0) {
      throw new Error('请先选择公众号');
    }

    // 获取token
    const token = await this.getToken(appid);
    if (token === '') {
      return;
    }

    await this.cachedElementsToImages(container);

    const lm = LocalImageManager.getInstance();
    // 上传图片
    await lm.uploadLocalImage(token, this.app.vault);
    // 上传图床图片
    await lm.uploadRemoteImage(container, token);
    // 替换图片链接
    lm.replaceImages(container);
  }

  async copyArticle(container: HTMLElement, css: string, appid: string | null) {
    if (appid) {
      await this.uploadImages(appid, container);
    }
    const content = await this.getArticleContent(container, css);
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([content], { type: 'text/html' })
    })])
  }

  async copyWithoutCSS(container: HTMLElement) {
    await this.cachedElementsToImages(container);
    const clonedArticleDiv = container.cloneNode(true) as HTMLDivElement;
    // 移除公众号名片
    clonedArticleDiv.querySelectorAll('.note-mpcard-wrapper').forEach(node => node.remove());
    // TODO：小部件处理
    if (!this.settings.isAuthKeyVaild()) {
      const content = clonedArticleDiv.innerHTML;
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([content], { type: 'text/html' })
      })]);
      new Notice('复制成功，快去粘贴吧！如需复制本地图片，请购买会员，感谢支持！');
      return;
    }

    await LocalImageManager.getInstance().uploadToOSS(clonedArticleDiv, this.settings.authKey, this.app.vault);

    const content = clonedArticleDiv.innerHTML;
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([content], { type: 'text/html' })
    })]);
    new Notice('复制成功，快去粘贴吧！');
  }

  getSecret(appid: string) {
    for (const wx of this.settings.wxInfo) {
      if (wx.appid === appid) {
        return wx.secret.replace('SECRET', '');
      }
    }
    return '';
  }

  async postArticle(appid:string, localCover: File | null = null, container: HTMLElement, css: string) {
    if (!this.settings.authKey) {
      throw new Error('请先设置注册码（AuthKey）');
    }

    let metadata = getMetadata(this.app, this.note!);
    if (metadata.appid) {
      appid = metadata.appid;
    }

    if (!appid || appid.length == 0) {
      throw new Error('请先选择公众号');
    }
    // 获取token
    const token = await this.getToken(appid);
    if (token === '') {
      throw new Error('获取token失败,请检查网络链接!');
    }
    await this.cachedElementsToImages(container);
    const lm = LocalImageManager.getInstance();
    // 上传图片
    await lm.uploadLocalImage(token, this.app.vault);
    // 上传图床图片
    await lm.uploadRemoteImage(container, token);
    // 替换图片链接
    lm.replaceImages(container);
    // 上传封面
    let mediaId = metadata.thumb_media_id;
    if (!mediaId) {
      if (metadata.cover) {
        // 上传仓库里的图片
        if (metadata.cover.startsWith('http')) {
          const res = await LocalImageManager.getInstance().uploadImageFromUrl(metadata.cover, token, 'image');
          if (res.media_id) {
            mediaId = res.media_id;
          }
          else {
            throw new Error('上传封面失败:' + res.errmsg);
          }
        }
        else {
          mediaId = await this.uploadVaultCover(metadata.cover, token);
        }
      }
      else if (localCover) {
        mediaId = await this.uploadCover(localCover, localCover.name, token);
      }
      else {
        mediaId = await this.getDefaultCover(token);
      }
    }

    if (mediaId === '') {
      throw new Error('请先上传图片或者设置默认封面');
    }

    metadata.title = metadata.title || this.title;
    metadata.content = await this.getArticleContent(container, css);
    metadata.thumb_media_id = mediaId;

    // 创建草稿
    const res = await wxAddDraft(token, metadata);

    if (res.status != 200) {
      console.error(res.text);
      throw new Error(`创建草稿失败, https状态码: ${res.status} 可能是文章包含异常内容，请尝试手动复制到公众号编辑器！`);
    }

    const draft = res.json;
    if (draft.media_id) {
      return draft.media_id;
    }
    else {
      console.error(JSON.stringify(draft));
      throw new Error('发布失败!' + draft.errmsg);
    }
  }

  async postImages(appid: string, container: HTMLElement) {
    if (!this.settings.authKey) {
      throw new Error('请先设置注册码（AuthKey）');
    }

    let metadata = getMetadata(this.app, this.note!);
    if (metadata.appid) {
      appid = metadata.appid;
    }

    if (!appid || appid.length == 0) {
      throw new Error('请先选择公众号');
    }

    // 获取token
    const token = await this.getToken(appid);
    if (token === '') {
      throw new Error('获取token失败,请检查网络链接!');
    }

    const imageList: DraftImageMediaId[] = [];
    const lm = LocalImageManager.getInstance();
    // 上传图片
    await lm.uploadLocalImage(token, this.app.vault, 'image');
    // 上传图床图片
    await lm.uploadRemoteImage(container, token, 'image');

    const images = lm.getImageInfos(container);
    for (const image of images) {
      if (!image.media_id) {
        console.warn('miss media id:', image.resUrl);
        continue;
      }
      imageList.push({
        image_media_id: image.media_id,
      });
    }

    if (imageList.length === 0) {
      throw new Error('没有图片需要发布!');
    }

    const content = this.getArticleText(container);

    const imagesData: DraftImages = {
      article_type: 'newspic',
      title: metadata.title || this.title,
      content: content,
      need_open_commnet: metadata.need_open_comment || 0,
      only_fans_can_comment: metadata.only_fans_can_comment || 0,
      image_info: {
        image_list: imageList,
      }
    }
    // 创建草稿
    const res = await wxAddDraftImages(token, imagesData);

    if (res.status != 200) {
      console.error(res.text);
      throw new Error(`创建图片/文字失败, https状态码: ${res.status}  ${res.text}！`);
    }

    const draft = res.json;
    if (draft.media_id) {
      return draft.media_id;
    }
    else {
      console.error(JSON.stringify(draft));
      throw new Error('发布失败!' + draft.errmsg);
    }
  }

  async exportHTML(container: HTMLElement, css: string) {
    await this.cachedElementsToImages(container);
    const lm = LocalImageManager.getInstance();
    const content = await lm.embleImages(container, this.app.vault);
    const globalStyle = await this.assetsManager.getStyle();
    const html = applyCSS(content, css + globalStyle);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.title + '.html';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  async processCachedElements(root: HTMLElement) {
    const af = this.note;
    if (!af) {
      console.error('当前没有打开文件，无法处理缓存元素');
      return;
    }
    const component = new Component();
    component.load();
    for (const [key, value] of this.cachedElements) {
      const [category, id] = key.split(':');
      if (category === 'mermaid' || category === 'excalidraw') {
        const container = root.querySelector('#' + id) as HTMLElement;
        if (container) {
          await MarkdownRenderer.render(this.app, value, container, af.path, component);
        }
      }
    }
    component.unload();
  }

  async cachedElementsToImages(root: HTMLElement) {
    for (const [key, cached] of this.cachedElements) {
      const [category, elementId] = key.split(':');
      const container = root.querySelector(`#${elementId}`) as HTMLElement;
      if (!container) continue;

      if (category === 'mermaid') {
        await this.replaceMermaidWithImage(container, elementId);
      } else if (category === 'excalidraw') {
        await this.replaceExcalidrawWithImage(container, elementId);
      }
    }
  }

  private async replaceMermaidWithImage(container: HTMLElement, id: string) {
    const mermaidContainer = container.querySelector('.mermaid') as HTMLElement;
    if (!mermaidContainer || !mermaidContainer.children.length) return;

    const svg = mermaidContainer.querySelector('svg');
    if (!svg) return;

    try {
      const pngDataUrl = await toPng(mermaidContainer.firstElementChild as HTMLElement, { pixelRatio: 2 });
      const img = document.createElement('img');
      img.id = `img-${id}`;
      img.src = pngDataUrl;
      img.style.width = `${svg.clientWidth}px`;
      img.style.height = 'auto';

      container.replaceChild(img, mermaidContainer);
    } catch (error) {
      console.warn(`Failed to render Mermaid diagram: ${id}`, error);
    }
  }

  private async replaceExcalidrawWithImage(container: HTMLElement, id: string) {
    const innerDiv = container.querySelector('div') as HTMLElement;
    if (!innerDiv) return;

    if (NMPSettings.getInstance().excalidrawToPNG) {
      const originalImg = container.querySelector('img') as HTMLImageElement;
      if (!originalImg) return;

      const style = originalImg.getAttribute('style') || '';
      try {
        const pngDataUrl = await toPng(originalImg, { pixelRatio: 2 });

        const img = document.createElement('img');
        img.id = `img-${id}`;
        img.src = pngDataUrl;
        img.setAttribute('style', style);

        container.replaceChild(img, container.firstChild!);
      } catch (error) {
        console.warn(`Failed to render Excalidraw image: ${id}`, error);
      }
    } else {
      const svg = await LocalFile.renderExcalidraw(innerDiv.innerHTML);
      this.updateElementByID(container, id, svg);
    }
  }

  updateElementByID(container:HTMLElement, id: string, html: string): void {
    const item = container.querySelector('#' + id) as HTMLElement;
    if (!item) return;
    const doc = sanitizeHTMLToDom(html);
    item.empty();
    if (doc.childElementCount > 0) {
      for (const child of doc.children) {
        item.appendChild(child.cloneNode(true)); // 使用 cloneNode 复制节点以避免移动它
      }
    }
    else {
      item.innerText = '渲染失败';
    }
  }

  cacheElement(category: string, id: string, data: string): void {
    const key = category + ':' + id;
    this.cachedElements.set(key, data);
  }

  isWechat(): boolean {
    return true;
  }
}