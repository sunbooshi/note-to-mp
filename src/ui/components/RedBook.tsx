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

import { useRef, useEffect, useState } from 'react';
import { usePluginStore } from 'src/store/PluginStore';
import { useRenderStore } from 'src/store/RenderStore';
import { ArticleRender } from 'src/article-render';
import { ConfigStore, createConfigStore, ConfigContext } from 'src/store/ConfigStore';
import MdToImageConverter from './MdToImageConverter';

function RedBookInternal() {
  const app = usePluginStore((s) => s.app);
  const activeNote = useRenderStore.use.note();
  const renderVersion = useRenderStore.use.renderVersion();
  const htmlRenderRef = useRef<ArticleRender>(new ArticleRender(app));

  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (!activeNote) return;

    const renderContent = async () => {
      const tempDiv = document.createElement('div');
      try {
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = '750px';
        tempDiv.style.height = 'auto';
        document.body.appendChild(tempDiv);

        await htmlRenderRef.current.renderMarkdown(tempDiv, activeNote);
        const html = await htmlRenderRef.current.getHtmlWithImages(tempDiv);
        setHtmlContent(html);
      } catch (error) {
        console.error('Render failed:', error);
      } finally {
        if (tempDiv.parentNode) {
          document.body.removeChild(tempDiv);
        }
      }
    };

    renderContent();
  }, [activeNote, renderVersion]);

  return <MdToImageConverter htmlContent={htmlContent} />;
}

export function RedBook() {
  const storeRef = useRef<ConfigStore>(null);
  if (!storeRef.current) {
    storeRef.current = createConfigStore();
  }

  return (
    <ConfigContext.Provider value={storeRef.current}>
      <RedBookInternal />
    </ConfigContext.Provider>
  );
}