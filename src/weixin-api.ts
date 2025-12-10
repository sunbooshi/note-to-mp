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

import { requestUrl, RequestUrlParam, getBlobArrayBuffer, App, FrontMatterCache, TFile } from "obsidian";
import { imageExtToMime } from "./utils";
import AssetsManager from "./assets";
import { NMPSettings } from "./settings";

const PluginHost = 'https://obplugin.sunboshi.tech';

// 获取token
export async function wxGetToken(authkey:string, appid:string, secret:string) {
    const url = PluginHost + '/v1/wx/token';
    const body = {
        authkey,
        appid,
        secret
    }
    const res = await requestUrl({
        url,
        method: 'POST',
        throw: false,
        contentType: 'application/json',
        body: JSON.stringify(body)
    });
    return res;
}

export async function wxEncrypt(authkey:string, wechat:any[]) {
    const url = PluginHost + '/v1/wx/encrypt';
    const body =  JSON.stringify({
        authkey,
        wechat
    });
    const res = await requestUrl({
        url: url,
        method: 'POST',
        throw: false,
        contentType: 'application/json',
        body: body
    });
    return res
}

export async function wxKeyInfo(authkey:string) {
    const url = PluginHost + '/v1/wx/info/' + authkey;
    const res = await requestUrl({
        url: url,
        method: 'GET',
        throw: false,
        contentType: 'application/json',
    });
    return res
}

export async function wxWidget(authkey: string, params: string) {
    const host = 'https://obplugin.sunboshi.tech';
    const path = '/math/widget';
    const url = `${host}${path}`;
    try {
        const res = await requestUrl({
            url,
            throw: false,
            method: 'POST',
            contentType: 'application/json',
            headers: {
                authkey
            },
            body: params
        })
        if (res.status === 200) {
            return res.json.content;
        }
        return res.json.msg;
    } catch (error) {
        console.log(error);
        return error.message;
    }
}

// 上传图片
export async function wxUploadImage(data: Blob, filename: string, token: string, type?: string) {
    let url = '';
    if (type == null || type === '') {
        url = 'https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=' + token;
    } else {
        url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=${type}`
    }

    const N = 16 // The length of our random boundry string
    const randomBoundryString = "djmangoBoundry" + Array(N+1).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, N) 
    
    // Construct the form data payload as a string
    const pre_string = `------${randomBoundryString}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: "application/octet-stream"\r\n\r\n`;
    const post_string = `\r\n------${randomBoundryString}--`
    
    // Convert the form data payload to a blob by concatenating the pre_string, the file data, and the post_string, and then return the blob as an array buffer
    const pre_string_encoded = new TextEncoder().encode(pre_string);
    // const data = file;
    const post_string_encoded = new TextEncoder().encode(post_string);
    const concatenated = await new Blob([pre_string_encoded, await getBlobArrayBuffer(data), post_string_encoded]).arrayBuffer()

    // Now that we have the form data payload as an array buffer, we can pass it to requestURL
    // We also need to set the content type to multipart/form-data and pass in the boundry string
    const options: RequestUrlParam = {
        method: 'POST',
        url: url,
        contentType: `multipart/form-data; boundary=----${randomBoundryString}`,
        body: concatenated
    };

    const res = await requestUrl(options);
    const resData = await res.json;
    return {
        url: resData.url || '',
        media_id: resData.media_id || '',
        errcode: resData.errcode || 0,
        errmsg: resData.errmsg || '',
    }
}

// 新建草稿
export interface DraftArticle {
    title: string;
    author?: string;
    digest?: string;
    cover?: string;
    content: string;
    content_source_url?: string;
    thumb_media_id: string;
    need_open_comment?: number;
    only_fans_can_comment?: number;
    pic_crop_235_1?: string;
    pic_crop_1_1?: string;
    appid?: string;
    theme?: string;
    highlight?: string;
    css?: string;
}

function convertArticle(data: DraftArticle) {
    return {
        title: data.title,
        content: data.content,
        digest: data.digest,
        thumb_media_id: data.thumb_media_id,
        ... data.pic_crop_235_1 && {pic_crop_235_1: data.pic_crop_235_1},
        ... data.pic_crop_1_1 && {pic_crop_1_1: data.pic_crop_1_1},
        ... data.content_source_url && {content_source_url: data.content_source_url},
        ... data.need_open_comment !== undefined && {need_open_comment: data.need_open_comment},
        ... data.only_fans_can_comment !== undefined && {only_fans_can_comment: data.only_fans_can_comment},
        ... data.author && {author: data.author},
    };
}

export async function wxAddDraft(token: string, data: DraftArticle) {
    const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + token;
    const body = {articles:[convertArticle(data)]};

    const res = await requestUrl({
        method: 'POST',
        url: url,
        throw: false,
        body: JSON.stringify(body)
    });

    return res;
}

export async function wxAddDrafts(token: string, data: DraftArticle[]) {
    const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + token;
    const articles = data.map(d=>convertArticle(d));
    const body = {articles};

    const res = await requestUrl({
        method: 'POST',
        url: url,
        throw: false,
        body: JSON.stringify(body)
    });

    return res;
}

export interface DraftImageMediaId {
    image_media_id: string;
}

export interface DraftImageInfo {
    image_list: DraftImageMediaId[];
}

export interface DraftImages {
    article_type: string;
    title: string;
    content: string;
    need_open_commnet: number;
    only_fans_can_comment: number;
    image_info: DraftImageInfo;
}

export async function wxAddDraftImages(token: string, data: DraftImages) {
    const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + token;
    const body = {articles:[data]};

    const res = await requestUrl({
        method: 'POST',
        url: url,
        throw: false,
        body: JSON.stringify(body)
    });

    return res;
}

export async function wxBatchGetMaterial(token: string, type: string, offset: number = 0, count: number = 10) {
    const url = 'https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=' + token;
    const body = {
        type,
        offset,
        count
    };

    const res = await requestUrl({
        method: 'POST',
        url: url,
        throw: false,
        body: JSON.stringify(body)
    });

    return await res.json;
}

export async function getUploadImageURL(authkey: string, ext: string) {
    const url = PluginHost + '/v1/img/uploadurl/' + ext + '/' + authkey;
    console.log(url);
    const res = await requestUrl({
        url,
        method: 'GET',
        throw: false,
    });

    if (res.status !== 200) {
        throw new Error(`获取上传地址失败：${res.status} ${res.text}`);
    }
    return await res.json;
}

export async function putImageToOSS(authKey:string, uploadURL: string, data: Blob, ext: string) {
    const contentType = imageExtToMime('.'+ext);
    const res = await requestUrl({
        url: uploadURL,
        method: 'PUT',
        throw: false,
        headers: {
            'x-oss-meta-authkey': authKey,
            'Content-Type': contentType,
        },
        body: await getBlobArrayBuffer(data),
    });
    return res;
}

export async function uploadImageToOSS(authkey: string, data: Blob, filename: string) {
    const ext = filename.split('.').pop() || 'jpg';
    const {uploadURL, downloadURL} = await getUploadImageURL(authkey, ext);
    await putImageToOSS(authkey, uploadURL, data, ext);
    return downloadURL;
}

function getFrontmatterValue(frontmatter: FrontMatterCache, key: string) {
    const value = frontmatter[key];

    if (value instanceof Array) {
        return value[0];
    }

    return value;
}

export function getMetadata(app: App, file: TFile) {
    const assetsManager = AssetsManager.getInstance();
    const settings = NMPSettings.getInstance();
    let res: DraftArticle = {
        title: '',
        author: undefined,
        digest: undefined,
        content: '',
        content_source_url: undefined,
        cover: undefined,
        thumb_media_id: '',
        need_open_comment: undefined,
        only_fans_can_comment: undefined,
        pic_crop_235_1: undefined,
        pic_crop_1_1: undefined,
        appid: undefined,
        theme: undefined,
        highlight: undefined,
        css: undefined,
    }
    const metadata = app.metadataCache.getFileCache(file);
    if (metadata?.frontmatter) {
        const keys = assetsManager.expertSettings.frontmatter;
        const frontmatter = metadata.frontmatter;
        res.title = getFrontmatterValue(frontmatter, keys.title);
        res.author = getFrontmatterValue(frontmatter, keys.author);
        res.digest = getFrontmatterValue(frontmatter, keys.digest);
        res.content_source_url = getFrontmatterValue(frontmatter, keys.content_source_url);
        res.cover = getFrontmatterValue(frontmatter, keys.cover);
        res.thumb_media_id = getFrontmatterValue(frontmatter, keys.thumb_media_id);
        res.need_open_comment = frontmatter[keys.need_open_comment] ? 1 : undefined;
        res.only_fans_can_comment = frontmatter[keys.only_fans_can_comment] ? 1 : undefined;
        res.appid = getFrontmatterValue(frontmatter, keys.appid);
        if (res.appid && !res.appid.startsWith('wx')) {
            res.appid = settings.wxInfo.find(wx => wx.name === res.appid)?.appid;
        }
        res.theme = getFrontmatterValue(frontmatter, keys.theme);
        res.highlight = getFrontmatterValue(frontmatter, keys.highlight);
        if (frontmatter[keys.crop]) {
            res.pic_crop_235_1 = '0_0_1_0.5';
            res.pic_crop_1_1 = '0_0.525_0.404_1';
        }
        res.css = getFrontmatterValue(frontmatter, keys.css);
    }
    return res;
}