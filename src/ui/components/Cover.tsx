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

import * as React from "react";
import { useConfigContext } from "src/store/ConfigStore";
import styles from "./Cover.module.css";
import AssetsManager from "src/assets";
import { trimEmbedTag } from "src/utils";
import { UnsplashCoverPicker } from "./UnsplashCoverPicker";

function getCoverURL(cover: string): string | null {
	if (cover.startsWith('http')) return cover;
	const res = AssetsManager.getInstance().getResourcePath(trimEmbedTag(cover));
	if (res) return res.resUrl;
	return null
}

export function Cover({ readOnly = false, initialCover = '' }: { readOnly?: boolean; initialCover?: string }) {
	const localCover = useConfigContext(s=>s.cover);
	const setCover = useConfigContext(s=>s.setCover);

	const displayedCover = readOnly && initialCover ? getCoverURL(initialCover) : (localCover ? URL.createObjectURL(localCover) : null);

	const coverContainerRef = React.useRef<HTMLDivElement>(null);
	const [unsplashOpen, setUnsplashOpen] = React.useState(false);
	const [showSourceOptions, setShowSourceOptions] = React.useState(false);

	// 来源按钮：点击封面区域外部或按 Esc 时还原为添加封面
	React.useEffect(() => {
		if (!showSourceOptions) return;
		const handleDocumentMouseDown = (event: MouseEvent) => {
			if (coverContainerRef.current && !coverContainerRef.current.contains(event.target as Node)) {
				setShowSourceOptions(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setShowSourceOptions(false);
			}
		};
		document.addEventListener('mousedown', handleDocumentMouseDown);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleDocumentMouseDown);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [showSourceOptions]);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (readOnly) return;
		setShowSourceOptions(false);
		if (event.target.files && event.target.files.length > 0) {
			setCover(event.target.files[0]);
		} else {
			setCover(null);
		}
	};

	const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
		if (readOnly) return;
		setShowSourceOptions((v) => !v);
	};

	const handleOpenUnsplash = (event?: React.MouseEvent) => {
		event?.preventDefault();
		event?.stopPropagation();
		setShowSourceOptions(false);
		setUnsplashOpen(true);
	};

	const handleCloseClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (readOnly) return;
		event.preventDefault();
		event.stopPropagation();
		setShowSourceOptions(false);
		setCover(null);
	};

	return (
		<div className={styles.CoverContainer} ref={coverContainerRef}>
			<div className={styles.CoverLabel} onClick={handleImageClick}>
				{showSourceOptions ? (
					<div className={styles.CoverSourceOptions} onClick={(event) => event.stopPropagation()}>
						<label className={styles.CoverSourceButton}>
							<input
								type="file"
								accept=".jpeg, .jpg, .png"
								className={styles.CoverInput}
								onChange={handleFileChange}
								disabled={readOnly}
								onClick={(event) => event.stopPropagation()}
							/>
							本地图片
						</label>
						<label
							className={styles.CoverSourceButton}
							role="button"
							tabIndex={0}
							onClick={handleOpenUnsplash}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									handleOpenUnsplash();
								}
							}}
						>
							Unsplash 图片
						</label>
					</div>
				) : displayedCover ? (
					<>
						<img
							src={displayedCover}
							alt="Cover Preview"
							className={styles.CoverPreview}
						/>
						{!readOnly && <button className={styles.CloseButton} onClick={handleCloseClick}>
							&times; {/* HTML entity for multiplication sign / close icon */}
						</button>}
					</>
				) : (
					<div className={styles.CoverTip}>
						<svg
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<line
								x1="2"
								y1="10"
								x2="18"
								y2="10"
								stroke="#AFAFAF"
								strokeWidth="4"
								strokeLinecap="round"
							/>
							<line
								x1="10"
								y1="18"
								x2="10"
								y2="2"
								stroke="#AFAFAF"
								strokeWidth="4"
								strokeLinecap="round"
							/>
						</svg>
						<div>添加封面</div>
					</div>
				)}
			</div>
			<UnsplashCoverPicker
				open={unsplashOpen}
				onOpenChange={setUnsplashOpen}
				onPick={(file) => {
					setCover(file);
					setUnsplashOpen(false);
				}}
			/>
		</div>
	);
}
