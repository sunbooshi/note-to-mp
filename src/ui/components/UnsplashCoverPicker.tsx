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

import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { ExternalLinkIcon, StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import { App, Modal, Notice } from "obsidian";
import {
	CoverCategories,
	UnsplashPhoto,
	downloadUnsplashPhoto,
	pickRandomCoverCategory,
	getRandomCover,
	searchCoverImages,
} from "src/unsplash";
import { NMPSettings } from "src/settings";
import { usePluginStore } from "src/store/PluginStore";
import styles from "./UnsplashCoverPicker.module.css";

/** 收藏分类，固定显示在顶部分类最前面 */
const FavoriteCategoryKey = "favorite";

/** 封面图片缓存（模块级单例）：模态框关闭后依然保留，仅点击“换一批”时绕过缓存重新请求 */
const coverCache: Record<string, UnsplashPhoto[]> = {};

interface UnsplashCoverViewProps {
	/** 用户选定图片后回调下载好的 File，由调用方按本地封面逻辑设置 */
	onPick: (file: File) => void;
}

function UnsplashCoverView({ onPick }: UnsplashCoverViewProps) {
	const [category, setCategory] = React.useState<string>("random");
	const [query, setQuery] = React.useState<string>(() => pickRandomCoverCategory());
	const [photos, setPhotos] = React.useState<UnsplashPhoto[]>([]);
	const [loading, setLoading] = React.useState<boolean>(false);
	const [error, setError] = React.useState<string>("");
	const [usingId, setUsingId] = React.useState<string | null>(null);
	const [refreshToken, setRefreshToken] = React.useState<number>(0);
	const [refreshing, setRefreshing] = React.useState<boolean>(false);
	const [favorites, setFavorites] = React.useState<UnsplashPhoto[]>(
		() => NMPSettings.getInstance().favoriteCovers || []
	);
	const forceRefreshRef = React.useRef(false);

	const isFavoriteCategory = category === FavoriteCategoryKey;
	const displayedPhotos = isFavoriteCategory ? favorites : photos;

	React.useEffect(() => {
		if (!query || isFavoriteCategory) {
			setRefreshing(false);
			return;
		}

		const cacheKey = category === "random" ? "random" : query;
		const isRefresh = forceRefreshRef.current;
		forceRefreshRef.current = false;

		const cached = coverCache[cacheKey];
		if (!isRefresh && cached) {
			setRefreshing(false);
			setPhotos(cached);
			setError("");
			setLoading(false);
			return;
		}

		let cancelled = false;
		setRefreshing(isRefresh);
		setLoading(true);
		setError("");

		const applyData = (list: UnsplashPhoto[]) => {
			if (cancelled) return;
			coverCache[cacheKey] = list;
			setRefreshing(false);
			setPhotos(list);
			setLoading(false);
		};
		const applyError = (e: unknown) => {
			if (cancelled) return;
			setRefreshing(false);
			setError(e instanceof Error ? e.message : String(e));
			setPhotos([]);
			setLoading(false);
		};

		if (category === "random") {
			getRandomCover()
				.then((data) => applyData(data.photos || []))
				.catch(applyError);
		}
		else {
			searchCoverImages(query, 1, 20)
				.then((data) => applyData(data.photos || []))
				.catch(applyError);
		}

		return () => {
			cancelled = true;
		};
	}, [query, refreshToken, isFavoriteCategory, category]);

	const handleCategoryClick = (key: string) => {
		setCategory(key);
		setQuery(key);
		setError("");
		const cacheKey =
			key === FavoriteCategoryKey ? null : key === "random" ? "random" : key;
		const cached = cacheKey ? coverCache[cacheKey] : undefined;
		setPhotos(cached ? [...cached] : []);
		if (key === FavoriteCategoryKey) {
			setLoading(false);
		}
	};

	const handleRefresh = () => {
		forceRefreshRef.current = true;
		setRefreshToken((v) => v + 1);
		setError("");
	};

	const handleUse = async (photo: UnsplashPhoto) => {
		setUsingId(photo.id);
		try {
			const file = await downloadUnsplashPhoto(photo);
			onPick(file);
		} catch (e) {
			new Notice(e instanceof Error ? e.message : String(e), 5000);
		} finally {
			setUsingId(null);
		}
	};

	const handleToggleFavorite = (photo: UnsplashPhoto) => {
		const settings = NMPSettings.getInstance();
		const isFav = settings.favoriteCovers.some((item) => item.id === photo.id);
		const next = isFav
			? settings.favoriteCovers.filter((item) => item.id !== photo.id)
			: [...settings.favoriteCovers, photo];
		settings.favoriteCovers = next;
		setFavorites(next);

		const plugin = usePluginStore.getState().plugin as unknown as
			| { saveSettings?: () => void }
			| null;
		plugin?.saveSettings?.();
		new Notice(isFav ? "已取消收藏" : "已收藏");
	};

	return (
		<div className={styles.PickerBody}>
			<div className={styles.Toolbar}>
				<button
					className={styles.ToolButton}
					onClick={handleRefresh}
					disabled={loading || isFavoriteCategory}
				>
					换一批
				</button>
				<div className={styles.ToolbarDivider} />
				<div className={styles.CategoryBar}>
					{[
						{ key: FavoriteCategoryKey, label: "收藏" },
						...CoverCategories,
					].map((item) => (
						<button
							key={item.key}
							className={`${styles.CategoryButton} ${
								category === item.key ? styles.CategoryActive : ""
							}`}
							onClick={() => handleCategoryClick(item.key)}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>

			<div className={styles.ContentArea}>
				{refreshing && (
					<div className={styles.LoadingToast} role="status">
						<span className={styles.Spinner} />
						正在加载…
					</div>
				)}

				{error ? (
					<div className={styles.ErrorBox}>{error}</div>
				) : isFavoriteCategory && favorites.length === 0 ? (
					<div className={styles.EmptyBox}>
						还没有收藏的封面，点击图片右上角的星标即可收藏
					</div>
				) : loading && photos.length === 0 ? (
					<div className={styles.LoadingBox}>正在加载图片…</div>
				) : (
					<div className={styles.PhotoGrid}>
						{displayedPhotos.map((photo) => {
							const isFav = favorites.some((item) => item.id === photo.id);
							return (
								<div className={styles.PhotoCard} key={photo.id}>
									<div className={styles.PhotoLink}>
										<a
											className={styles.PhotoThumbLink}
											href={photo.links.html+"?utm_source=NoteToMP&utm_medium=referral"}
											target="_blank"
											rel="noopener noreferrer"
											title="查看图片"
										>
										<img
											className={styles.PhotoThumb}
											src={photo.urls.thumb}
											alt={photo.alt_description || photo.description || "Unsplash 图片"}
											loading="lazy"
										/>
										</a>
										<span className={styles.PhotoOverlay}>
											<a
												className={styles.PhotoAuthor}
												href={photo.user?.links?.html+"?utm_source=NoteToMP&utm_medium=referral"}
												target="_blank"
												rel="noopener noreferrer"
												title="前往作者主页"
											>
												{photo.user?.name || "Unsplash"}
											</a>
											<ExternalLinkIcon width={12} height={12} />
										</span>
									</div>
									<button
										className={`${styles.FavoriteButton} ${
											isFav ? styles.FavoriteActive : ""
										}`}
										title={isFav ? "取消收藏" : "收藏"}
										aria-label={isFav ? "取消收藏" : "收藏"}
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											handleToggleFavorite(photo);
										}}
									>
										{isFav ? (
											<StarFilledIcon width={16} height={16} />
										) : (
											<StarIcon width={16} height={16} />
										)}
									</button>
									<button
										className={styles.UseButton}
										disabled={usingId === photo.id}
										onClick={() => handleUse(photo)}
									>
										{usingId === photo.id ? "下载中…" : "使用"}
									</button>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<div className={styles.Footer}>
				<span>图片与作者信息来自 Unsplash，遵循 Unsplash License 协议</span>
			</div>
		</div>
	);
}

export class UnsplashCoverModal extends Modal {
	private view: ReactDOM.Root | null = null;

	constructor(app: App, private onPick: (file: File) => void) {
		super(app);
	}

	onOpen() {
		this.setTitle("选择 Unsplash 封面");
		const { modalEl, contentEl } = this;
		modalEl.style.width = "min(880px, 92vw)";
		modalEl.style.height = "min(86vh, 720px)";
		contentEl.style.display = "flex";
		contentEl.style.flexDirection = "column";
		contentEl.style.minHeight = "0";

		this.view = ReactDOM.createRoot(contentEl);
		this.view.render(
			<UnsplashCoverView
				onPick={(file) => {
					this.onPick(file);
					this.close();
				}}
			/>
		);
	}

	onClose() {
		this.view?.unmount();
		this.view = null;
		this.contentEl.empty();
	}
}
