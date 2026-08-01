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
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { Notice } from "obsidian";
import {
	CoverCategories,
	UnsplashPhoto,
	downloadUnsplashPhoto,
	pickRandomCoverCategory,
	searchCoverImages,
} from "src/unsplash";
import styles from "./UnsplashCoverPicker.module.css";

export interface UnsplashCoverPickerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** 用户选定图片后回调下载好的 File，由调用方按本地封面逻辑设置 */
	onPick: (file: File) => void;
}

export function UnsplashCoverPicker({
	open,
	onOpenChange,
	onPick,
}: UnsplashCoverPickerProps) {
	const [category, setCategory] = React.useState<string>("random");
	const [query, setQuery] = React.useState<string>("");
	const [page, setPage] = React.useState<number>(1);
	const [photos, setPhotos] = React.useState<UnsplashPhoto[]>([]);
	const [totalPages, setTotalPages] = React.useState<number>(0);
	const [loading, setLoading] = React.useState<boolean>(false);
	const [error, setError] = React.useState<string>("");
	const [usingId, setUsingId] = React.useState<string | null>(null);
	const [refreshToken, setRefreshToken] = React.useState<number>(0);

	// 每次打开弹窗时重置状态
	React.useEffect(() => {
		if (open) {
			setCategory("random");
			setQuery(pickRandomCoverCategory());
			setPage(1);
			setPhotos([]);
			setTotalPages(0);
			setError("");
			setUsingId(null);
		}
	}, [open]);

	React.useEffect(() => {
		if (!open || !query) {
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError("");

		searchCoverImages(query, page, 20)
			.then((data) => {
				if (cancelled) return;
				setPhotos(data.results || []);
				setTotalPages(data.total_pages || 0);
			})
			.catch((e) => {
				if (cancelled) return;
				setError(e instanceof Error ? e.message : String(e));
				setPhotos([]);
				setTotalPages(0);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [open, query, page, refreshToken]);

	const handleCategoryClick = (key: string) => {
		setCategory(key);
		setQuery(key === "random" ? pickRandomCoverCategory() : key);
		setPage(1);
		setPhotos([]);
		setError("");
	};

	const handleRefresh = () => {
		if (category === "random") {
			setQuery(pickRandomCoverCategory());
			setPage(1);
		} else {
			setPage(1);
			setRefreshToken((v) => v + 1);
		}
		setError("");
	};

	const handlePrevPage = () => {
		if (page > 1) setPage(page - 1);
	};

	const handleNextPage = () => {
		if (totalPages <= 0 || page < totalPages) setPage(page + 1);
	};

	const handleUse = async (photo: UnsplashPhoto) => {
		setUsingId(photo.id);
		try {
			const file = await downloadUnsplashPhoto(photo);
			onPick(file);
			onOpenChange(false);
		} catch (e) {
			new Notice(e instanceof Error ? e.message : String(e), 5000);
		} finally {
			setUsingId(null);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className={styles.Overlay} />
				<Dialog.Content className={styles.Content} onPointerDownOutside={() => onOpenChange(false)}>
					<Dialog.Title className={styles.Title}>选择 Unsplash 封面</Dialog.Title>
					<Dialog.Description className={styles.Description}>
						图片来自 Unsplash，点击图片可跳转查看原图
					</Dialog.Description>

					<div className={styles.PickerBody}>
						<div className={styles.Toolbar}>
							<div className={styles.CategoryBar}>
								{CoverCategories.map((item) => (
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
							<div className={styles.ToolbarActions}>
								<button className={styles.ToolButton} onClick={handleRefresh} disabled={loading}>
									换一批
								</button>
								<button
									className={styles.ToolButton}
									onClick={handlePrevPage}
									disabled={loading || page <= 1}
								>
									‹ 上一页
								</button>
								<button
									className={styles.ToolButton}
									onClick={handleNextPage}
									disabled={loading || (totalPages > 0 && page >= totalPages)}
								>
									下一页 ›
								</button>
							</div>
						</div>

						{error ? (
							<div className={styles.ErrorBox}>{error}</div>
						) : loading && photos.length === 0 ? (
							<div className={styles.LoadingBox}>正在加载图片…</div>
						) : (
							<div className={styles.PhotoGrid}>
								{photos.map((photo) => (
									<div className={styles.PhotoCard} key={photo.id}>
										<a
											className={styles.PhotoLink}
											href={photo.links.html}
											target="_blank"
											rel="noopener noreferrer"
											title="在 Unsplash 查看原图"
										>
											<img
												className={styles.PhotoThumb}
												src={photo.urls.thumb}
												alt={photo.alt_description || photo.description || "Unsplash 图片"}
												loading="lazy"
											/>
											<span className={styles.PhotoOverlay}>
												<span className={styles.PhotoAuthor}>
													{photo.user?.name || "Unsplash"}
												</span>
												<ExternalLinkIcon width={12} height={12} />
											</span>
										</a>
										<button
											className={styles.UseButton}
											disabled={usingId === photo.id}
											onClick={() => handleUse(photo)}
										>
											{usingId === photo.id ? "下载中…" : "使用"}
										</button>
									</div>
								))}
							</div>
						)}

						<div className={styles.Footer}>
							<span>图片与作者信息来自 Unsplash，遵循 Unsplash License 协议</span>
							<span className={styles.PageInfo}>
								第 {page} 页{totalPages > 0 ? ` / 共 ${totalPages} 页` : ""}
							</span>
						</div>
					</div>

					<Dialog.Close asChild>
						<button className={styles.CloseButton} aria-label="关闭">
							<Cross2Icon width={16} height={16} />
						</button>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
