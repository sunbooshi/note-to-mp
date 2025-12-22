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
 * 
 */

import { createContext, useContext } from 'react'
import { createStore, useStore } from 'zustand';
import { NMPSettings } from "src/settings";

interface IConfigProps {
  appid: string | null;
  cover: File | null;
  theme: string;
  highlight: string;
}

interface IConfigState extends IConfigProps {
  setAppId: (appid: string | null) => void;
  setCover: (cover: File | null) => void;
  setTheme: (theme: string) => void;
  setHighlight: (highlight: string) => void;
}

export type ConfigStore = ReturnType<typeof createConfigStore>

function defaultProps() {
  const settings = NMPSettings.getInstance();
  return {
    appid: settings.wxInfo.length > 0 ? settings.wxInfo[0].appid : null,
    cover: null,
    theme: settings.defaultStyle,
    highlight: settings.defaultHighlight,
  }
}

export const createConfigStore = (initProps?: Partial<IConfigProps>) => {
  const DEFAULT_PROPS: IConfigProps = defaultProps();

  return createStore<IConfigState>()((set) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    setAppId: (appid) => set({ appid }),
    setCover: (cover) => set({ cover }),
    setTheme: (theme) => set({ theme }),
    setHighlight: (highlight) => set({ highlight }),
  }))
}

export const ConfigContext = createContext<ConfigStore | null>(null)

export function useConfigContext<T>(selector: (state: IConfigState) => T): T {
  const store = useContext(ConfigContext)
  if (!store) throw new Error('Missing ConfigContext.Provider in the tree')
  return useStore(store, selector)
}
