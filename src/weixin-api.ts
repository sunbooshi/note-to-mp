/*
 * Copyright (c) 2024 Sun Booshi
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

import { requestUrl, RequestUrlParam, getBlobArrayBuffer } from "obsidian";

// 获取token
export async function wxGetToken(authkey:string, appid:string, secret:string) {
    const url = 'https://obplugin.sunboshi.tech/wx/token';
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
    const url = 'https://obplugin.sunboshi.tech/wx/encrypt';
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
    const url = 'https://obplugin.sunboshi.tech/wx/info/' + authkey;
    const res = await requestUrl({
        url: url,
        method: 'GET',
        throw: false,
        contentType: 'application/json',
    });
    return res
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
}

export async function wxAddDraft(token: string, data: DraftArticle) {
    const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + token;
    const body = {articles:[{
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
    }]};

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