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

export async function wxEncrypt(key:string, wechat:any[]) {
    const url = 'https://obplugin.sunboshi.tech/wx/encrypt';
    const body =  JSON.stringify({
        authkey: key,
        wechat: [...wechat]
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
interface DraftArticle {
    title: string;
    content: string;
    thumb_media_id: string;
}

export async function wxAddDraft(token: string, data: DraftArticle) {
    const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + token;
    const body = {articles:[{
        title: data.title,
        content: data.content,
        thumb_media_id: data.thumb_media_id
    }]};

    const res = await requestUrl({
        method: 'POST',
        url: url,
        body: JSON.stringify(body)
    });

    return await res.json;
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
        body: JSON.stringify(body)
    });

    return await res.json;
}