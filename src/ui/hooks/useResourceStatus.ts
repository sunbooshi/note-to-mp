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

import { useState, useEffect } from 'react';
import { resourceState } from './resource-state';

/**
 * A custom React hook that subscribes to the plugin's resource loading state.
 *
 * @returns {boolean} `true` if resources are loaded, otherwise `false`.
 */
export function useResourceStatus(): boolean {
  // Initialize state with the current snapshot from the store.
  const [isLoaded, setIsLoaded] = useState(() => resourceState.isReady());

  useEffect(() => {
    // Define the function to update local state.
    const handleStateChange = () => {
      setIsLoaded(resourceState.isReady());
    };

    // Subscribe to the store on component mount.
    const unsubscribe = resourceState.subscribe(handleStateChange);

    // Clean up the subscription on component unmount.
    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount.

  return isLoaded;
}
