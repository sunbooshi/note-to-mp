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

import { App, Notice, TFile, normalizePath } from 'obsidian';
import { NotePubModal } from './note-pub';

/** 发布列表，frontmatter 属性名 */
export const PUBLISH_LIST_FIELD = '发布列表';
/** 合并发布，frontmatter 属性名 */
export const MERGE_PUBLISH_FIELD = '合并发布';
/** 公众号，frontmatter 属性名 */
export const ACCOUNT_FIELD = '公众号';
/** 单次批量发布的最大笔记数量 */
export const MAX_BATCH_NOTES = 8;

/**
 * 从 frontmatter 的单个条目中解析出笔记文件。
 * 支持 Wikilink（`[[笔记]]`、`![[笔记]]`）、带别名（`[[笔记|别名]]`）、
 * 带标题或块引用（`[[笔记#标题]]`）以及普通路径。
 */
function resolveFile(app: App, sourcePath: string, raw: unknown): TFile | null {
  if (typeof raw !== 'string') {
    return null;
  }

  // 去掉 wikilink / embed 语法
  let link = raw.trim().replace(/^!?\[\[/, '').replace(/\]\]$/, '');
  // 去掉别名与标题/块引用
  link = link.split('|')[0].split('#')[0].trim();
  if (!link) {
    return null;
  }

  // 优先按路径直接查找
  const direct = app.vault.getAbstractFileByPath(normalizePath(link));
  if (direct instanceof TFile) {
    return direct;
  }

  // 再按 Obsidian 链接解析规则查找
  const dest = app.metadataCache.getFirstLinkpathDest(link, sourcePath);
  if (dest instanceof TFile) {
    return dest;
  }

  return null;
}

/**
 * 读取 frontmatter 中的发布列表，解析为去重后的 Markdown 笔记。
 * 不存在的笔记会被忽略，最多返回 {@link MAX_BATCH_NOTES} 篇。
 */
export function resolvePublishList(app: App, file: TFile): TFile[] {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!frontmatter) {
    return [];
  }

  const rawList = frontmatter[PUBLISH_LIST_FIELD];
  if (rawList === undefined || rawList === null) {
    return [];
  }

  // 未加引号的 [[笔记]] 会被 YAML 解析成嵌套数组，这里统一展平一层
  const entries: unknown[] = [];
  for (const item of Array.isArray(rawList) ? rawList : [rawList]) {
    if (Array.isArray(item)) {
      entries.push(...item);
    }
    else {
      entries.push(item);
    }
  }

  const notes: TFile[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (notes.length >= MAX_BATCH_NOTES) {
      break;
    }
    const note = resolveFile(app, file.path, entry);
    if (!note) {
      continue;
    }
    if (note.extension.toLowerCase() !== 'md') {
      continue;
    }
    if (seen.has(note.path)) {
      continue;
    }
    seen.add(note.path);
    notes.push(note);
  }

  return notes;
}

/**
 * 读取 frontmatter 中的「合并发布」属性，默认为 true。
 */
export function resolveMerge(app: App, file: TFile): boolean {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  const raw = frontmatter?.[MERGE_PUBLISH_FIELD];
  if (raw === undefined || raw === null) {
    return true;
  }
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'string') {
    return raw.trim().toLowerCase() !== 'false';
  }
  return Boolean(raw);
}

/**
 * 读取 frontmatter 中的「公众号」属性，默认为空。
 * 返回公众号名称或 appid，未配置时返回 undefined（使用设置中的第一个公众号）。
 */
export function resolveAccount(app: App, file: TFile): string | undefined {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  const raw = frontmatter?.[ACCOUNT_FIELD];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') {
    return undefined;
  }
  const account = value.trim();
  return account || undefined;
}

/**
 * 批量发布命令的执行入口。
 * 以当前激活的笔记作为「参数笔记」，读取其 frontmatter 配置并打开发布弹窗。
 */
export function runBatchPublish(app: App) {
  const file = app.workspace.getActiveFile();
  if (!(file instanceof TFile)) {
    new Notice('请先打开作为发布参数的笔记再执行批量发布');
    return;
  }
  if (file.extension.toLowerCase() !== 'md') {
    new Notice('参数笔记必须是 Markdown 文件');
    return;
  }

  const notes = resolvePublishList(app, file);
  if (notes.length === 0) {
    new Notice(`未找到可发布的笔记，请在笔记属性中配置「${PUBLISH_LIST_FIELD}」`);
    return;
  }

  const merge = resolveMerge(app, file);
  const account = resolveAccount(app, file);
  new NotePubModal(app, notes, merge, account).open();
}
