/*
 * Copyright (c) 2024-2026 Sun Booshi
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

import { requestUrl } from "obsidian";
import { NMPSettings } from "./settings";
import { mimeToImageExt } from "./utils";

/**
 * 封面搜索服务地址。
 * 接口文档见仓库根目录 cover-search.md：
 *   GET /v1/cover/search?query=xxx&page=1&per_page=10
 *   Authorization: Bearer {authkey}
 */
export const CoverSearchHost = "https://obplugin.dualhue.cn";

export interface UnsplashUrls {
	thumb: string;
	small: string;
	regular: string;
}

export interface UnsplashUser {
	name: string;
	bio: string | null;
	links: {
		self: string;
		html: string;
		photos: string;
	};
}

export interface UnsplashPhoto {
	id: string;
	description: string | null;
	alt_description: string | null;
	width: number;
	height: number;
	color: string | null;
	blur_hash: string | null;
	urls: UnsplashUrls;
	links: {
		self: string;
		html: string;
		download?: string;
		download_location?: string;
	};
	user: UnsplashUser;
}

export interface UnsplashSearchResponse {
	photos: UnsplashPhoto[];
}

/**
 * 封面分类。`random` 表示随机从其他分类中挑选一个关键词进行搜索。
 */
export const CoverCategories: { key: string; label: string }[] = [
	{ key: "random", label: "随机" },
	{ key: "nature", label: "自然" },
	{ key: "technology", label: "科技" },
	{ key: "ai", label: "AI" },
	{ key: "writing", label: "写作" },
	{ key: "business", label: "商业" },
	{ key: "minimal", label: "极简" },
	{ key: "art", label: "文艺" },
	{ key: "travel", label: "旅行" },
	{ key: "abstract", label: "抽象" },
	{ key: "plant", label: "植物" },
];

const RandomCategoryKeys = CoverCategories
	.filter((item) => item.key !== "random")
	.map((item) => item.key);

export function pickRandomCoverCategory(): string {
	return RandomCategoryKeys[Math.floor(Math.random() * RandomCategoryKeys.length)];
}

export async function getRandomCover(): Promise<UnsplashSearchResponse> {
	const authKey = NMPSettings.getInstance().authKey;
	if (!authKey) {
		throw new Error("请先设置注册码（AuthKey）");
	}

	const url = `${CoverSearchHost}/v1/cover/random`;
		const res = await requestUrl({
		url,
		method: "GET",
		throw: false,
		headers: {
			Authorization: `Bearer ${authKey}`,
		},
	});

	if (res.status !== 200) {
		let message = `获取封面图片失败（HTTP ${res.status}）`;
		try {
			const data = res.json;
			if (data && typeof data.message === "string" && data.message) {
				message = data.message;
			}
		} catch (error) {
			// 忽略响应体解析失败
		}
		throw new Error(message);
	}

	return res.json as UnsplashSearchResponse;
}

/**
 * 通过 /v1/cover/search 搜索 Unsplash 封面图片。
 */
export async function searchCoverImages(
	query: string,
	page: number = 1,
	perPage: number = 20
): Promise<UnsplashSearchResponse> {
	const authKey = NMPSettings.getInstance().authKey;
	if (!authKey) {
		throw new Error("请先设置注册码（AuthKey）");
	}

	const params = new URLSearchParams({
		query,
		page: String(page),
		per_page: String(perPage),
	});
	const url = `${CoverSearchHost}/v1/cover/search?${params.toString()}`;

	const res = await requestUrl({
		url,
		method: "GET",
		throw: false,
		headers: {
			Authorization: `Bearer ${authKey}`,
		},
	});

	if (res.status !== 200) {
		let message = `获取封面图片失败（HTTP ${res.status}）`;
		try {
			const data = res.json;
			if (data && typeof data.message === "string" && data.message) {
				message = data.message;
			}
		} catch (error) {
			// 忽略响应体解析失败
		}
		throw new Error(message);
	}

	return res.json as UnsplashSearchResponse;
}


export async function getDownloadLocation(photo: UnsplashPhoto): Promise<string> {
	const authKey = NMPSettings.getInstance().authKey;
	if (!authKey) {
		throw new Error("请先设置注册码（AuthKey）");
	}

	if (!photo.links.download_location) {
		throw new Error("下载链接缺失");
	}

	const res = await requestUrl({
		url: `${CoverSearchHost}/v1/cover/download?url=${encodeURIComponent(photo.links.download_location)}`,
		method: "GET",
		throw: false,
		headers: {
			Authorization: `Bearer ${authKey}`,
		},
	});

	if (res.status !== 200) {
		let message = `获取下载链接失败（HTTP ${res.status}）`;
		try {
			const data = res.json;
			if (data && typeof data.message === "string" && data.message) {
				message = data.message;
			}
		} catch (error) {
			// 忽略响应体解析失败
		}
		throw new Error(message);
	}

	const data = res.json as { url?: string };

	if (!data.url) {
		throw new Error("下载链接缺失");
	}

	return data.url;
}

/**
 * 下载 Unsplash 图片并转换为 File，复用本地封面的处理逻辑。
 */
export async function downloadUnsplashPhoto(photo: UnsplashPhoto): Promise<File> {
	const url = await getDownloadLocation(photo);

	const res = await requestUrl({
		url,
		method: "GET",
		throw: false,
	});

	if (res.status !== 200) {
		throw new Error(`下载图片失败（HTTP ${res.status}）`);
	}

	let mime = "image/jpeg";
	const contentType = res.headers ? res.headers["content-type"] : undefined;
	if (contentType) {
		mime = contentType.split(";")[0].trim() || mime;
	}
	const ext = mimeToImageExt(mime);
	const filename = `unsplash-${photo.id}${ext}`;

	return new File([res.arrayBuffer], filename, { type: mime });
}
