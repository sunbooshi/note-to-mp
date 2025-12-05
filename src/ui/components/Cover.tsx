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

export function Cover() {
	const cover = useConfigContext(s=>s.cover);
	const setCover = useConfigContext(s=>s.setCover);

	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files.length > 0) {
			setCover(event.target.files[0]);
		} else {
			setCover(null);
		}
	};

	const handleImageClick = () => {
		// Trigger the hidden file input when the image is clicked
		fileInputRef.current?.click();
	};

	const handleCloseClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		// Prevent the default label behavior (triggering the input) first
		event.preventDefault();
		// Stop event propagation to prevent the parent label's onClick from firing
		event.stopPropagation();
		setCover(null);
	};

	return (
		<div className={styles.CoverContainer}>
			<label className={styles.CoverLabel} onClick={cover ? handleImageClick : undefined}>
				<input
					type="file"
					accept=".jpeg, .jpg, .png"
					className={styles.CoverInput}
					onChange={handleFileChange}
					ref={fileInputRef} // Attach ref to the input
				/>
				{cover ? (
					<>
						<img
							src={URL.createObjectURL(cover)}
							alt="Cover Preview"
							className={styles.CoverPreview}
						/>
						<button className={styles.CloseButton} onClick={handleCloseClick}>
							&times; {/* HTML entity for multiplication sign / close icon */}
						</button>
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
			</label>
		</div>
	);
}