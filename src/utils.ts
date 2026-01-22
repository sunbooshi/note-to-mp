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

import { App, requestUrl, Platform } from "obsidian";

let PluginVersion = "0.0.0";
let PlugPlatform = "obsidian";

export function setVersion(version: string) {
	PluginVersion = version;
	if (Platform.isWin) {
		PlugPlatform = "win";
	}
	else if (Platform.isMacOS) {
		PlugPlatform = "mac";
	}
	else if (Platform.isLinux) {
		PlugPlatform = "linux";
	}
	else if (Platform.isIosApp) {
		PlugPlatform = "ios";
	}
	else if (Platform.isAndroidApp) {
		PlugPlatform = "android";
	}
}



export function uevent(name: string) {
	const url = `https://u.dualhue.cn/event?name=${name}&platform=${PlugPlatform}&v=${PluginVersion}`;
	requestUrl(url).then().catch(error => {
		console.error("Failed to send event: " + url, error);
	});
}

/**
 * 创建一个防抖函数
 * @param func 要执行的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖处理后的函数
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null;

	return function(this: any, ...args: Parameters<T>) {
		const context = this;

		const later = () => {
			timeout = null;
			func.apply(context, args);
		};

		if (timeout !== null) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(later, wait);
	};
}

export function cleanUrl(href: string) {
  try {
    href = encodeURI(href).replace(/%25/g, '%');
  } catch (e) {
    return null;
  }
  return href;
}

export async function waitForLayoutReady(app: App): Promise<void> {
  if (app.workspace.layoutReady) {
    return;
  }
  return new Promise((resolve) => {
    app.workspace.onLayoutReady(() => resolve());
  });
}


export function mimeToImageExt(type: string): string {
	const mimeToExt: { [key: string]: string } = {
		'image/jpeg': '.jpg',
		'image/jpg': '.jpg',
		'image/png': '.png',
		'image/gif': '.gif',
		'image/bmp': '.bmp',
		'image/webp': '.webp',
		'image/svg+xml': '.svg',
		'image/tiff': '.tiff'
	};
	return mimeToExt[type] || '.jpg';
}

export function imageExtToMime(ext: string): string {
	const extToMime: { [key: string]: string } = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.gif': 'image/gif',
		'.bmp': 'image/bmp',
		'.webp': 'image/webp',
		'.svg': 'image/svg+xml',
		'.tiff': 'image/tiff'
	};
	return extToMime[ext.toLowerCase()] || 'image/jpeg';
}

export function trimEmbedTag(name: string) {
	return name.trim().replace(/^!\[\[/, '').replace(/^\[\[/, '').replace(/]]$/, '');
}

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export function escapeHTML(str: string) {
  return str.replace(/[&<>"']/g, (ch) => escapeMap[ch]);
}

const FRONT_MATTER_REGEX = /^(---)$.+?^(---)$.+?/ims;
export function removeFrontMatter(md: string) {
	if (md.startsWith('---')) {
    return md.replace(FRONT_MATTER_REGEX, '');
  }
	return md;
}

/**
 * 版本比较函数
 * 比较两个版本号的大小
 * @param v1 版本号1
 * @param v2 版本号2
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
	const parts1 = v1.split('.').map(Number);
	const parts2 = v2.split('.').map(Number);
	
	const maxLength = Math.max(parts1.length, parts2.length);
	
	for (let i = 0; i < maxLength; i++) {
		const num1 = parts1[i] || 0;
		const num2 = parts2[i] || 0;
		
		if (num1 > num2) return 1;
		if (num1 < num2) return -1;
	}
	
	return 0;
}

/**
 * 检查版本是否符合目标版本要求
 * @param currentVersion 当前版本
 * @param targetVersion 目标版本表达式，如 ">2.0.0", "=2.0.0", "<2.0.0", ">=2.0.0", "<=2.0.0"
 * @returns 是否符合要求
 */
export function matchesVersionRequirement(currentVersion: string, targetVersion: string): boolean {
	if (!targetVersion || targetVersion.trim() === '') {
		return true; // 如果没有版本要求，则显示
	}

	const match = targetVersion.match(/^(>=|<=|>|<|=)(.+)$/);
	if (!match) {
		return true; // 如果格式不正确，默认显示
	}

	const operator = match[1];
	const requiredVersion = match[2].trim();
	const comparison = compareVersions(currentVersion, requiredVersion);

	switch (operator) {
		case '>':
			return comparison > 0;
		case '>=':
			return comparison >= 0;
		case '<':
			return comparison < 0;
		case '<=':
			return comparison <= 0;
		case '=':
			return comparison === 0;
		default:
			return true;
	}
}