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

import * as React from "react";
import { NMPSettings } from "src/settings";


interface WxInfo {
  name: string;
  appid: string;
  secret: string;
}

/**
 * Defines the shape of the shared state for the WeChat publishing context.
 */
interface IWechatState {
	/** The currently selected WeChat Official Account. */
	selectedAccount: WxInfo | null;
	/** The local file selected as the article's cover image. */
	coverFile: File | null;
	/** The class name of the selected theme. */
	theme: string;
	/** The name of the selected code highlight style. */
	highlight: string;
}

/**
 * Defines the full context value, including state and updater functions.
 */
interface IWechatContext extends IWechatState {
	/** A list of all available WeChat accounts configured in settings. */
	accounts: WxInfo[];
	/** Function to update the selected WeChat account. */
	setSelectedAccount: (account: WxInfo | null) => void;
	/** Function to update the selected cover image file. */
	setCoverFile: (file: File | null) => void;
	/** Function to update the selected theme. */
	setTheme: (theme: string) => void;
	/** Function to update the selected code highlight style. */
	setHighlight: (highlight: string) => void;
}

/**
 * React Context for managing WeChat-related state across components.
 */
const WechatContext = React.createContext<IWechatContext | undefined>(
	undefined,
);

/**
 * Provides the WechatContext to its children components.
 * It initializes and manages the state for account selection, theme, and more.
 */
const WechatContextProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const settings = NMPSettings.getInstance();

	// Initialize state from NMPSettings for persistence and sensible defaults.
	const [selectedAccount, setSelectedAccount] = React.useState<WxInfo | null>(
		settings.wxInfo.length > 0 ? settings.wxInfo[0] : null,
	);
	const [coverFile, setCoverFile] = React.useState<File | null>(null);
	const [theme, setTheme] = React.useState<string>(settings.defaultStyle);
	const [highlight, setHighlight] = React.useState<string>(
		settings.defaultHighlight,
	);

	// The list of accounts is also sourced from settings.
	const accounts = settings.wxInfo;

	// Memoize the context value to prevent unnecessary re-renders of consuming components.
	const contextValue = React.useMemo(
		() => ({
			selectedAccount,
			coverFile,
			theme,
			highlight,
			accounts,
			setSelectedAccount,
			setCoverFile,
			setTheme,
			setHighlight,
		}),
		[selectedAccount, coverFile, theme, highlight, accounts],
	);

	return (
		<WechatContext.Provider value={contextValue}>
			{children}
		</WechatContext.Provider>
	);
};

/**
 * Custom hook for consuming the WechatContext.
 * Provides a convenient and type-safe way to access the context's state and setters.
 * @throws {Error} If used outside of a WechatContextProvider.
 */
const useWechatContext = () => {
	const context = React.useContext(WechatContext);
	if (context === undefined) {
		throw new Error(
			"useWechatContext must be used within a WechatContextProvider",
		);
	}
	return context;
};

export { WechatContextProvider, useWechatContext };
