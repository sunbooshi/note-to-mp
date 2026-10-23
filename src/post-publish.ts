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

import { App, Notice, TFile } from 'obsidian';
import { NMPSettings } from './settings';

/**
 * 发布成功后传递给 QuickAdd Choice 的参数。
 * 参数名称与含义作为公开的集成约定，保持稳定。
 */
export interface PostPublishParams {
  /** 本次发布笔记在 Obsidian 仓库中的完整相对路径 */
  notePath: string;
  /** 发布成功时间，ISO 8601 格式 */
  publishedAt: string;
  /** 本次发布结果，成功时为 success */
  status: 'success';
  /** 发布目标平台标识 */
  platform: 'wechat';
  /** 发布目标公众号名称 */
  accountName: string;
}

interface QuickAddChoice {
  name?: string;
  [key: string]: any;
}

/** 获取 QuickAdd 插件实例，未安装或未启用时返回 null */
function getQuickAddPlugin(app: App): any | null {
  const plugins = (app as any)?.plugins?.plugins;
  const plugin = plugins?.['quickadd'];
  return plugin ?? null;
}

/** QuickAdd 是否已安装并启用，且 API 可用 */
export function isQuickAddAvailable(app: App): boolean {
  const plugin = getQuickAddPlugin(app);
  return !!(plugin && plugin.api && typeof plugin.api.executeChoice === 'function');
}

/** 获取 QuickAdd 中已配置的所有 Choice */
export function getQuickAddChoices(app: App): QuickAddChoice[] {
  const plugin = getQuickAddPlugin(app);
  const choices = plugin?.settings?.choices;
  return Array.isArray(choices) ? choices : [];
}

/** 检查指定名称的 QuickAdd Choice 是否存在 */
export function hasQuickAddChoice(app: App, name: string): boolean {
  if (!name) {
    return false;
  }
  return getQuickAddChoices(app).some(choice => choice?.name === name);
}

/** 根据 appid 获取公众号名称 */
export function getAccountName(appid: string): string {
  const settings = NMPSettings.getInstance();
  const info = settings.wxInfo.find(wx => wx.appid === appid);
  return info?.name || appid;
}

/**
 * 触发发布后处理：在发布确认成功后调用用户配置的 QuickAdd Choice。
 *
 * 该函数不抛出异常，后处理失败不会影响已经完成的发布结果。
 * 为避免阻塞发布流程，调用方无需 await。
 */
export async function runPostPublish(app: App, note: TFile, accountName: string): Promise<void> {
  const settings = NMPSettings.getInstance();
  const choiceName = settings.postPublishChoice?.trim();
  if (!choiceName) {
    return;
  }

  if (!isQuickAddAvailable(app)) {
    console.warn('[NoteToMP] QuickAdd 不可用，跳过发布后处理');
    new Notice('发布后处理失败：未检测到 QuickAdd 插件或其 API 不可用');
    return;
  }

  // 配置检查：不依赖异常判断 Choice 是否存在
  if (!hasQuickAddChoice(app, choiceName)) {
    console.warn(`[NoteToMP] 未找到 QuickAdd Choice：${choiceName}`);
    new Notice(`发布后处理失败：未找到 QuickAdd Choice「${choiceName}」`);
    return;
  }

  const params: PostPublishParams = {
    notePath: note.path,
    publishedAt: new Date().toISOString(),
    status: 'success',
    platform: 'wechat',
    accountName,
  };

  try {
    const quickAddApi = getQuickAddPlugin(app).api;
    await quickAddApi.executeChoice(choiceName, params);
  }
  catch (error) {
    console.error('[NoteToMP] 发布后处理执行失败:', error);
    const message = error instanceof Error ? error.message : String(error);
    new Notice('发布后处理执行失败：' + message);
  }
}
