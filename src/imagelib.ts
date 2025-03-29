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

declare function GoWebpToJPG(data: Uint8Array): Uint8Array;
declare function GoWebpToPNG(data: Uint8Array): Uint8Array;
declare function GoAddWatermark(img: Uint8Array, watermark: Uint8Array): Uint8Array;

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