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

// Define the shape of a listener function.
type Listener = () => void;

class ResourceState {
	private isLoaded = false;
	private listeners = new Set<Listener>();

	/**
	 * Subscribes a listener function to be called whenever the loading state changes.
	 * @param listener The callback function to execute on state change.
	 * @returns An unsubscribe function to clean up the subscription.
	 */
	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		// Return an unsubscribe function for cleanup.
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Updates the loading state and notifies all subscribed listeners.
	 * @param status The new loading status.
	 */
	setLoaded(status: boolean): void {
		if (this.isLoaded !== status) {
			this.isLoaded = status;
			// Notify all listeners about the change.
			this.listeners.forEach((listener) => listener());
		}
	}

	/**
	 * Gets a snapshot of the current loading state.
	 * This is useful for initializing components with the correct state.
	 * @returns `true` if resources are loaded, otherwise `false`.
	 */
	isReady(): boolean {
		return this.isLoaded;
	}
}

// Export a singleton instance of the state manager.
export const resourceState = new ResourceState();
