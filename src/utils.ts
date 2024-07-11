function getStyleSheet() {
	for (var i = 0; i < document.styleSheets.length; i++) {
		var sheet = document.styleSheets[i];
		if (sheet.title == 'note-to-mp-style') {
		  return sheet;
		}
	}
}

function applyStyles(element: HTMLElement, styles: CSSStyleDeclaration, computedStyle: CSSStyleDeclaration) {
	for (let i = 0; i < styles.length; i++) {
		const propertyName = styles[i];
		let propertyValue = computedStyle.getPropertyValue(propertyName);
		if (propertyName == 'width' && styles.getPropertyValue(propertyName) == 'fit-content') {
			propertyValue = 'fit-content';
		}
		if (propertyName.indexOf('margin') >= 0 && styles.getPropertyValue(propertyName).indexOf('auto') >= 0) {
		    propertyValue = styles.getPropertyValue(propertyName);
		}
		element.style.setProperty(propertyName, propertyValue);
	}
}

function parseAndApplyStyles(element: HTMLElement, sheet:CSSStyleSheet) {
	try {
		const computedStyle = getComputedStyle(element);
		for (let i = 0; i < sheet.cssRules.length; i++) {
			const rule = sheet.cssRules[i];
			if (rule instanceof CSSStyleRule && element.matches(rule.selectorText)) {
			  	applyStyles(element, rule.style, computedStyle);
			}
		}
	} catch (e) {
		console.warn("Unable to access stylesheet: " + sheet.href, e);
	}
}

function traverse(root: HTMLElement, sheet:CSSStyleSheet) {
	let element = root.firstElementChild;
	while (element) {
		if (element.tagName === 'svg') {
			// pass
		}
		else {
	  		traverse(element as HTMLElement, sheet);
		}
	  	element = element.nextElementSibling;
	}
	parseAndApplyStyles(root, sheet);
}

export async function CSSProcess(content: HTMLElement) {
	// 获取样式表
	const style = getStyleSheet();
	if (style) {
		traverse(content, style);
	}
}