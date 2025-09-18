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

import { App, ItemView, Workspace, Notice, sanitizeHTMLToDom, apiVersion, TFile, MarkdownRenderer, FrontMatterCache } from 'obsidian';
import { applyCSS } from './utils';
import { UploadImageToWx } from './imagelib';
import { NMPSettings } from './settings';
import AssetsManager from './assets';
import InlineCSS from './inline-css';
import { wxGetToken, wxAddDraft, wxBatchGetMaterial, DraftArticle, DraftImageMediaId, DraftImages, wxAddDraftImages } from './weixin-api';
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
  itemView: ItemView;
  workspace: Workspace;
  styleEl: HTMLElement;
  articleDiv: HTMLDivElement;
  settings: NMPSettings;
  assetsManager: AssetsManager;
  articleHTML: string;
  title: string;
  _currentTheme: string;
  _currentHighlight: string;
  _currentAppId: string;
  markedParser: MarkedParser;
  cachedElements: Map<string, string> = new Map();
  debouncedRenderMarkdown: (...args: any[]) => void;

  constructor(app: App, itemView: ItemView, styleEl: HTMLElement, articleDiv: HTMLDivElement) {
    this.app = app;
    this.itemView = itemView;
    this.styleEl = styleEl;
    this.articleDiv = articleDiv;
    this.settings = NMPSettings.getInstance();
    this.assetsManager = AssetsManager.getInstance();
    this.articleHTML = '';
    this.title = '';
    this._currentTheme = 'default';
    this._currentHighlight = 'default';
    this.markedParser = new MarkedParser(app, this);
    this.debouncedRenderMarkdown = debounce(this.renderMarkdown.bind(this), 1000);
  }

  set currentTheme(value: string) {
    this._currentTheme = value;
  }

  get currentTheme() {
    const { theme } = this.getMetadata();
    if (theme) {
      return theme;
    }
    return this._currentTheme;
  }

  set currentHighlight(value: string) {
    this._currentHighlight = value;
  }

  get currentHighlight() {
    const { highlight } = this.getMetadata();
    if (highlight) {
      return highlight;
    }
    return this._currentHighlight;
  }

  isOldTheme() {
    const theme = this.assetsManager.getTheme(this.currentTheme);
    if (theme) {
      return theme.css.indexOf('.note-to-mp') < 0;
    }
    return false;
  }

  setArticle(article: string) {
    this.articleDiv.empty();
    let className = 'note-to-mp';
    // 兼容旧版本样式
    if (this.isOldTheme()) {
      className = this.currentTheme;
    }
    const html = `<section class="${className}" id="article-section">${article}</section>`;
    const doc = sanitizeHTMLToDom(html);
    if (doc.firstChild) {
      this.articleDiv.appendChild(doc.firstChild);
    }
  }

  setStyle(css: string) {
    this.styleEl.empty();
    this.styleEl.appendChild(document.createTextNode(css));
  }

  reloadStyle() {
    this.setStyle(this.getCSS());
  }

  getArticleSection() {
    return this.articleDiv.querySelector('#article-section') as HTMLElement;
  }

  getArticleContent() {
    const content = this.articleDiv.innerHTML;
    let html = applyCSS(content, this.getCSS());
    // 处理话题多余内容
    html = html.replace(/rel="noopener nofollow"/g, '');
    html = html.replace(/target="_blank"/g, '');
    html = html.replace(/data-leaf=""/g, 'leaf=""');
    return CardDataManager.getInstance().restoreCard(html);
  }

  getArticleText() {
    return this.articleDiv.innerText.trimStart();
  }

  errorContent(error: any) {
    return '<h1>渲染失败!</h1><br/>'
      + '如需帮助请前往&nbsp;&nbsp;<a href="https://github.com/sunbooshi/note-to-mp/issues">https://github.com/sunbooshi/note-to-mp/issues</a>&nbsp;&nbsp;反馈<br/><br/>'
      + '如果方便，请提供引发错误的完整Markdown内容。<br/><br/>'
      + '<br/>Obsidian版本：' + apiVersion
      + '<br/>错误信息：<br/>'
      + `${error}`;
  }

  async renderMarkdown(af: TFile | null = null) {
    try {
      let md = '';
      if (af && af.extension.toLocaleLowerCase() === 'md') {
        md = await this.app.vault.adapter.read(af.path);
        this.title = af.basename;
      }
      else {
        md = '没有可渲染的笔记或文件不支持渲染';
      }
      if (md.startsWith('---')) {
        md = md.replace(FRONT_MATTER_REGEX, '');
      }

      this.articleHTML = await this.markedParser.parse(md);
      this.setStyle(this.getCSS());
      this.setArticle(this.articleHTML);
      await this.processCachedElements();
    }
    catch (e) {
      console.error(e);
      this.setArticle(this.errorContent(e));
    }
  }
  getCSS() {
    try {
      const theme = this.assetsManager.getTheme(this.currentTheme);
      const highlight = this.assetsManager.getHighlight(this.currentHighlight);
      const customCSS = this.settings.customCSSNote.length > 0 || this.settings.useCustomCss ? this.assetsManager.customCSS : '';
      const baseCSS = this.settings.baseCSS ? `.note-to-mp {${this.settings.baseCSS}}` : '';
      return `${InlineCSS}\n\n${highlight!.css}\n\n${theme!.css}\n\n${baseCSS}\n\n${customCSS}`;
    } catch (error) {
      console.error(error);
      new Notice(`获取样式失败${this.currentTheme}|${this.currentHighlight}，请检查主题是否正确安装。`);
    }
    return '';
  }

  updateStyle(styleName: string) {
    this.currentTheme = styleName;
    this.setStyle(this.getCSS());
  }

  updateHighLight(styleName: string) {
    this.currentHighlight = styleName;
    this.setStyle(this.getCSS());
  }

  getFrontmatterValue(frontmatter: FrontMatterCache, key: string) {
    const value = frontmatter[key];

    if (value instanceof Array) {
      return value[0];
    }

    return value;
  }

  getMetadata() {
    let res: DraftArticle = {
      title: '',
      author: undefined,
      digest: undefined,
      content: '',
      content_source_url: undefined,
      cover: undefined,
      thumb_media_id: '',
      need_open_comment: undefined,
      only_fans_can_comment: undefined,
      pic_crop_235_1: undefined,
      pic_crop_1_1: undefined,
      appid: undefined,
      theme: undefined,
      highlight: undefined,
    }
    const file = this.app.workspace.getActiveFile();
    if (!file) return res;
    const metadata = this.app.metadataCache.getFileCache(file);
    if (metadata?.frontmatter) {
      const keys = this.assetsManager.expertSettings.frontmatter;
      const frontmatter = metadata.frontmatter;
      res.title = this.getFrontmatterValue(frontmatter, keys.title);
      res.author = this.getFrontmatterValue(frontmatter, keys.author);
      res.digest = this.getFrontmatterValue(frontmatter, keys.digest);
      res.content_source_url = this.getFrontmatterValue(frontmatter, keys.content_source_url);
      res.cover = this.getFrontmatterValue(frontmatter, keys.cover);
      res.thumb_media_id = this.getFrontmatterValue(frontmatter, keys.thumb_media_id);
      res.need_open_comment = frontmatter[keys.need_open_comment] ? 1 : undefined;
      res.only_fans_can_comment = frontmatter[keys.only_fans_can_comment] ? 1 : undefined;
      res.appid = this.getFrontmatterValue(frontmatter, keys.appid);
      if (res.appid && !res.appid.startsWith('wx')) {
        res.appid = this.settings.wxInfo.find(wx => wx.name === res.appid)?.appid;
      }
      res.theme = this.getFrontmatterValue(frontmatter, keys.theme);
      res.highlight = this.getFrontmatterValue(frontmatter, keys.highlight);
      if (frontmatter[keys.crop]) {
        res.pic_crop_235_1 = '0_0_1_0.5';
        res.pic_crop_1_1 = '0_0.525_0.404_1';
      }
    }
    return res;
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

  async uploadImages(appid: string) {
    if (!this.settings.authKey) {
      throw new Error('请先设置注册码（AuthKey）');
    }

    let metadata = this.getMetadata();
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

    await this.cachedElementsToImages();

    const lm = LocalImageManager.getInstance();
    // 上传图片
    await lm.uploadLocalImage(token, this.app.vault);
    // 上传图床图片
    await lm.uploadRemoteImage(this.articleDiv, token);
    // 替换图片链接
    lm.replaceImages(this.articleDiv);

    await this.copyArticle();
  }

  async copyArticle() {
    const content = this.getArticleContent();
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([content], { type: 'text/html' })
    })])
  }

  getSecret(appid: string) {
    for (const wx of this.settings.wxInfo) {
      if (wx.appid === appid) {
        return wx.secret.replace('SECRET', '');
      }
    }
    return '';
  }

  async postArticle(appid:string, localCover: File | null = null) {
    if (!this.settings.authKey) {
      throw new Error('请先设置注册码（AuthKey）');
    }

    let metadata = this.getMetadata();
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
    await this.cachedElementsToImages();
    const lm = LocalImageManager.getInstance();
    // 上传图片
    await lm.uploadLocalImage(token, this.app.vault);
    // 上传图床图片
    await lm.uploadRemoteImage(this.articleDiv, token);
    // 替换图片链接
    lm.replaceImages(this.articleDiv);
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
    metadata.content = this.getArticleContent();
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

  async postImages(appid: string) {
    if (!this.settings.authKey) {
      throw new Error('请先设置注册码（AuthKey）');
    }

    let metadata = this.getMetadata();
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
    await lm.uploadRemoteImage(this.articleDiv, token, 'image');

    const images = lm.getImageInfos(this.articleDiv);
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

    const content = this.getArticleText();

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

  async exportHTML() {
    await this.cachedElementsToImages();
    const lm = LocalImageManager.getInstance();
    const content = await lm.embleImages(this.articleDiv, this.app.vault);
    const globalStyle = await this.assetsManager.getStyle();
    const html = applyCSS(content, this.getCSS() + globalStyle);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.title + '.html';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  async processCachedElements() {
    const af = this.app.workspace.getActiveFile();
    if (!af) {
      console.error('当前没有打开文件，无法处理缓存元素');
      return;
    }
    for (const [key, value] of this.cachedElements) {
      const [category, id] = key.split(':');
      if (category === 'mermaid' || category === 'excalidraw') {
        const container = this.articleDiv.querySelector('#' + id) as HTMLElement;
        if (container) {
          await MarkdownRenderer.render(this.app, value, container, af.path, this.itemView);
        }
      }
    }
  }

  async cachedElementsToImages() {
    for (const [key, cached] of this.cachedElements) {
      const [category, elementId] = key.split(':');
      const container = this.articleDiv.querySelector(`#${elementId}`) as HTMLElement;
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
      this.updateElementByID(id, svg);
    }
  }

  updateElementByID(id: string, html: string): void {
    const item = this.articleDiv.querySelector('#' + id) as HTMLElement;
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
}