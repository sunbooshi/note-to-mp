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

import { parseYaml } from "obsidian";

export interface ExpertSettings {
  render?: {
    h1?: string | number | object;
    h2?: string | number | object;
    h3?: string | number | object;
    code?: number;
    callout?: object | undefined;
  },
  frontmatter: {
    title: string;
    author: string;
    digest: string;
    content_source_url: string;
    cover: string;
    thumb_media_id: string
    need_open_comment: string;
    only_fans_can_comment: string;
    appid: string;
    theme: string;
    highlight: string;
    crop: string;
  }
}

export const defaultExpertSettings: ExpertSettings = {
  render: undefined,
  frontmatter: {
    title: '标题',
    author: '作者',
    digest: '摘要',
    content_source_url: '原文地址',
    cover: '封面',
    thumb_media_id: '封面素材ID',
    need_open_comment: '打开评论',
    only_fans_can_comment: '仅粉丝可评论',
    appid: '公众号',
    theme: '样式',
    highlight: '代码高亮',
    crop: '封面裁剪',
  }
};

export function expertSettingsFromString(content: string): ExpertSettings {
  content = content.replace(/```yaml/gi, '').replace(/```/g, '');
  let parsed = parseYaml(content) as Partial<ExpertSettings>;
  if (!parsed || typeof parsed !== 'object') {
    parsed = {};
  }
  return {
    render: parsed.render,
    frontmatter: {
      ...defaultExpertSettings.frontmatter,
      ...(parsed.frontmatter || {})
    }
  };
}
