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

import https from 'node:https';
import { exec } from 'node:child_process';

// 仓库信息
const owner = 'sunbooshi';
const repo = 'mweb-themes';
const assetName = 'assets.zip'; // 要下载的文件名

// GitHub API 获取最新 Release 信息
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

https.get(apiUrl, { headers: { 'User-Agent': 'Node.js' } }, (apiRes) => {
    let data = '';

    // 接收 API 响应数据
    apiRes.on('data', (chunk) => {
        data += chunk;
    });

    apiRes.on('end', () => {
        try {
            const releaseInfo = JSON.parse(data);

            // 查找 assets.zip 文件
            const asset = releaseInfo.assets.find((a) => a.name === assetName);

            if (!asset) {
                console.error(`未找到 ${assetName} 文件`);
                return;
            }

            const downloadUrl = asset.browser_download_url;
            console.log(`找到 ${assetName}，下载链接: ${downloadUrl}`);

            // 使用系统 wget 命令下载
            exec(`wget "${downloadUrl}" -O "${assetName}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`下载失败: ${error}`);
                    return;
                }
                console.log(`${assetName} 下载完成！`);
            });
        } catch (err) {
            console.error('解析 API 响应失败:', err);
        }
    });
}).on('error', (err) => {
    console.error('请求 GitHub API 失败:', err);
});