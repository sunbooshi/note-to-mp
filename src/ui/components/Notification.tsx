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
import * as RadixToast from "@radix-ui/react-toast";
import styles from "./Notification.module.css"; // Assuming the CSS file will be renamed to Notification.module.css

const SUCCESS_DURATION = 3000; // 3 seconds
const ERROR_DURATION = Infinity; // Stays until manually closed

type NotificationType = "success" | "error" | "info";

interface NotificationData {
	id: string;
	type: NotificationType;
	title: string;
	description?: string;
}

interface NotificationContextType {
	notify: (data: Omit<NotificationData, "id">) => void;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [notifications, setNotifications] = React.useState<NotificationData[]>([]);

	const notify = (data: Omit<NotificationData, "id">) => {
		const id = new Date().toISOString() + Math.random();
		setNotifications(prev => [...prev, { ...data, id }]);
	};

	const onOpenChange = (open: boolean, id: string) => {
		if (!open) {
			setNotifications(prev => prev.filter(n => n.id !== id));
		}
	};

	return (
		<NotificationContext.Provider value={{ notify }}>
			{children}
			<RadixToast.Provider swipeDirection="right">
				{notifications.map(({ id, type, title, description }) => (
					<RadixToast.Root
						key={id}
						className={styles.Root}
						data-type={type}
						duration={type === "error" ? ERROR_DURATION : SUCCESS_DURATION}
						onOpenChange={(open) => onOpenChange(open, id)}
					>
						<RadixToast.Title className={styles.Title} data-type={type}>{title}</RadixToast.Title>
						{description && (
							<RadixToast.Description className={styles.Description}>
								{description}
							</RadixToast.Description>
						)}
						<RadixToast.Close asChild className={styles.Action}>
							<button className={styles.CloseButton}>&times;</button>
						</RadixToast.Close>
					</RadixToast.Root>
				))}
				<RadixToast.Viewport className={styles.Viewport} label={""} />
			</RadixToast.Provider>
		</NotificationContext.Provider>
	);
};

export const useNotification = () => {
	const context = React.useContext(NotificationContext);
	if (context === undefined) {
		throw new Error("useNotification must be used within a NotificationProvider");
	}
	return context;
};
