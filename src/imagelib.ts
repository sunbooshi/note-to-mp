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

import { getBlobArrayBuffer } from "obsidian";
import { wxUploadImage } from "./weixin-api";
import { NMPSettings } from "./settings";
import { IsWasmReady, LoadWasm } from "./wasm/wasm";
import  AssetsManager from "./assets";

declare function GoWebpToJPG(data: Uint8Array): ArrayBuffer;
declare function GoWebpToPNG(data: Uint8Array): ArrayBuffer;
declare function GoAddWatermark(img: Uint8Array, watermark: Uint8Array): ArrayBuffer;

export function IsImageLibReady() {
  return IsWasmReady();
}

export async function PrepareImageLib() {
  await LoadWasm();
}

export function WebpToJPG(data: ArrayBuffer): ArrayBuffer {
  return GoWebpToJPG(new Uint8Array(data));
}

export function WebpToPNG(data: ArrayBuffer): ArrayBuffer {
  return GoWebpToPNG(new Uint8Array(data));
}

export function AddWatermark(img: ArrayBuffer, watermark: ArrayBuffer): ArrayBuffer {
  return GoAddWatermark(new Uint8Array(img), new Uint8Array(watermark));
}

export async function UploadImageToWx(data: Blob, filename: string, token: string, type?: string) {
  if (!IsImageLibReady()) {
    await PrepareImageLib(); 
  }
  
  const watermark = NMPSettings.getInstance().watermark;
  if (watermark != null && watermark != '') {
    const watermarkData = await AssetsManager.getInstance().readFileBinary(watermark);
    if (watermarkData == null) {
      throw new Error('水印图片不存在: ' + watermark);
    }
    const watermarkImg = AddWatermark(await data.arrayBuffer(), watermarkData);
    data = new Blob([watermarkImg], { type: data.type });
  }
  return await wxUploadImage(data, filename, token, type);
}

export function ImageToShot(img: HTMLImageElement) {
  const shotRender = document.createElement('shot-render');
  shotRender.setAttribute('image', img.src);
  shotRender.setAttribute('src', img.src);

  const extra = NMPSettings.getInstance().extraSettings;
  if (!extra?.imageFrame) {
    return null;
  }

  const cfg = extra.imageFrame;
  shotRender.setAttribute('gradient', cfg.backgroundMode === 'solid' ? cfg.solidColor : cfg.gradient);
  shotRender.setAttribute('direction', cfg.direction);
  shotRender.setAttribute('padding', String(cfg.padding));
  shotRender.setAttribute('border-style', cfg.borderStyle);
  shotRender.setAttribute('border-radius', String(cfg.borderRadius));
  shotRender.setAttribute('background-radius', String(cfg.backgroundRadius));
  if (cfg.showShadow) {
    shotRender.setAttribute('show-shadow', '');
  }
  if (cfg.watermark) {
    shotRender.setAttribute('watermark-text', cfg.watermark.text);
    shotRender.setAttribute('watermark-font', cfg.watermark.font);
    shotRender.setAttribute('watermark-size', String(cfg.watermark.size));
    shotRender.setAttribute('watermark-color', cfg.watermark.color);
    shotRender.setAttribute('watermark-position', cfg.watermark.position);
    shotRender.setAttribute('watermark-opacity', String(cfg.watermark.opacity));
  }

  const imgId = img.getAttribute('data-img-id');
  if (imgId) {
    shotRender.setAttribute('data-img-id', imgId);
  }

  const w = img.getAttribute('width') || img.style.width;
  const h = img.getAttribute('height') || img.style.height;
  if (w) shotRender.setAttribute('image-width', w);
  if (h) shotRender.setAttribute('image-height', h);
  shotRender.setAttribute('style', 'width: fit-content;');

  return shotRender;
}