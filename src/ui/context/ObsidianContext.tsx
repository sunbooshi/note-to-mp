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

import { App, ItemView, TFile, debounce } from 'obsidian';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

// 定义 Context 中值的类型
interface IObsidianContext {
  app: App;
  itemView: ItemView;
  activeFile: TFile | null; // 新增：追踪当前活动文件
  renderVersion: number; // 新增：一个简单的版本号，用于触发渲染
}

export const ObsidianContext = createContext<IObsidianContext | null>(null);

// 定义 Provider 的 Props 类型
interface ObsidianProviderProps {
  children: React.ReactNode;
  app: App;
  itemView: ItemView;
}

export const ObsidianProvider: React.FC<ObsidianProviderProps> = ({ children, app, itemView }) => {
  const [activeFile, setActiveFile] = useState<TFile | null>(app.workspace.getActiveFile());
  const [renderVersion, setRenderVersion] = useState(0);

  // 使用 useCallback 和 debounce 封装触发器，以提升性能
  const triggerRender = useCallback(
    debounce(() => {
      console.log('Triggering re-render...');
      setRenderVersion(prevVersion => prevVersion + 1);
    }, 300, true),
    [] // 空依赖数组，确保 debounce 函数只创建一次
  );

  // 在 Provider 内部设置事件监听器
  useEffect(() => {
    // 处理文件打开事件
    const handleFileOpen = (file: TFile | null) => {
      if (file && file.extension === 'md') {
        setActiveFile(file);
        triggerRender();
      }
    };

    // 处理文件修改事件
    const handleFileModify = (file: TFile) => {
      // 仅当被修改的文件是当前活动文件时，才触发渲染
      if (file && activeFile && file.path === activeFile.path) {
        triggerRender();
      }
    };

    app.workspace.on('file-open', handleFileOpen);
    app.vault.on('modify', handleFileModify);

    // 组件卸载时清理事件监听器
    return () => {
      app.workspace.off('file-open', handleFileOpen);
      app.vault.off('modify', handleFileModify);
    };
  }, [app, activeFile, triggerRender]); // 依赖项包括 activeFile 和 triggerRender

  // 使用 useMemo 防止不必要的 Context 值变化
  const contextValue = useMemo(() => ({
    app,
    itemView,
    activeFile,
    renderVersion
  }), [app, itemView, activeFile, renderVersion]);

  return (
    <ObsidianContext.Provider value={contextValue}>
      {children}
    </ObsidianContext.Provider>
  );
};

// 自定义 Hook，简化 Context 的消费
export const useObsidian = () => {
  const context = useContext(ObsidianContext);
  if (!context) {
    throw new Error('useObsidian must be used within an ObsidianProvider');
  }
  return context;
};
