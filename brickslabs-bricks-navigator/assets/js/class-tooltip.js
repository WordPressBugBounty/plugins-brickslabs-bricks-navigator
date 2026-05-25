(() => {
	const __ = ( wp && wp.i18n ) ? wp.i18n.__ : function( s ) { return s; };

	const TOOLTIP_ID = 'bl-class-tooltip';
	const VIEWPORT_MARGIN = 12;

	let modifierActive = false;
	let tooltip = null;

	// --- Vue/Bricks helpers (same pattern as all other BN scripts) ---

	const getGP = () => {
		const body = document.querySelector('.brx-body');
		return body?.__vue_app__?.config.globalProperties ?? null;
	};

	const getElementById = (id) => {
		const gp = getGP();
		if (!gp) return null;
		if (typeof gp.$_getDynamicElementById === 'function') return gp.$_getDynamicElementById(id);
		const elements = gp.$_dynamicElements?.value;
		if (elements) return elements.find(el => el.id === id) ?? null;
		const { header = [], content = [], footer = [] } = gp.$_state;
		return [...header, ...content, ...footer].find(el => el.id === id) ?? null;
	};

	// --- Tooltip DOM ---

	const getTooltip = () => {
		if (!tooltip) {
			tooltip = document.createElement('div');
			tooltip.id = TOOLTIP_ID;
			document.body.appendChild(tooltip);
		}
		return tooltip;
	};

	const renderTooltip = (classNames) => {
		const el = getTooltip();
		el.innerHTML = '';
		if (classNames.length === 0) {
			const empty = document.createElement('span');
			empty.className = 'bl-ct-empty';
			empty.textContent = __( 'No classes', 'brickslabs-bricks-navigator' );
			el.appendChild(empty);
		} else {
			for (const name of classNames) {
				const chip = document.createElement('span');
				chip.className = 'bl-ct-chip';
				const dot = document.createElement('span');
				dot.className = 'bl-ct-dot';
				dot.textContent = '.';
				chip.appendChild(dot);
				chip.appendChild(document.createTextNode(name));
				el.appendChild(chip);
			}
		}
		return el;
	};

	const positionTooltip = (el, x, y) => {
		// Measure after display:flex so dimensions are real.
		const tw = el.offsetWidth;
		const th = el.offsetHeight;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		let left = x + 14;
		let top  = y - th - 6;

		if (left + tw + VIEWPORT_MARGIN > vw) left = x - tw - 14;
		if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
		if (top < VIEWPORT_MARGIN) top = y + 20;
		if (top + th + VIEWPORT_MARGIN > vh) top = vh - th - VIEWPORT_MARGIN;

		el.style.left = `${left}px`;
		el.style.top  = `${top}px`;
	};

	const showTooltip = (classNames, x, y) => {
		const el = renderTooltip(classNames);
		el.style.left = '-9999px';
		el.style.top  = '-9999px';
		el.style.display = 'flex';
		positionTooltip(el, x, y);
	};

	const hideTooltip = () => {
		if (tooltip) tooltip.style.display = 'none';
	};

	// --- Class resolution ---

	const getClassNames = (elementId) => {
		const el = getElementById(elementId);
		if (!el?.settings) return [];
		const classIds = el.settings._cssGlobalClasses;
		if (!Array.isArray(classIds) || !classIds.length) return [];
		const gp = getGP();
		if (!gp) return [];
		return classIds
			.map(id => gp.$_getGlobalClass(id)?.name)
			.filter(Boolean);
	};

	// --- Event helpers ---

	const anyModifier = (e) => e.shiftKey || e.metaKey || e.ctrlKey;

	// --- Keyboard listeners ---

	document.addEventListener('keydown', (e) => {
		if (!modifierActive && anyModifier(e)) {
			modifierActive = true;
			// Show immediately if mouse is already over a structure element.
			const hovered = document.querySelector('#bricks-structure .element[data-id]:hover');
			if (hovered) {
				const rect = hovered.getBoundingClientRect();
				showTooltip(getClassNames(hovered.dataset.id), rect.right, rect.top + rect.height / 2);
			}
		}
	});

	document.addEventListener('keyup', (e) => {
		if (modifierActive && !anyModifier(e)) {
			modifierActive = false;
			hideTooltip();
		}
	});

	// Reset state if the browser window loses focus (e.g. Cmd-Tab).
	window.addEventListener('blur', () => {
		modifierActive = false;
		hideTooltip();
	});

	// --- Structure panel mouse listeners ---

	const onMousemove = (e) => {
		if (!modifierActive) return;
		const item = e.target.closest('.element[data-id]');
		if (!item) { hideTooltip(); return; }
		const el = renderTooltip(getClassNames(item.dataset.id));
		el.style.display = 'flex';
		positionTooltip(el, e.clientX, e.clientY);
	};

	const onMouseleave = () => hideTooltip();

	// --- Init: attach listeners once #bricks-structure is in the DOM ---

	const attach = (structure) => {
		structure.addEventListener('mousemove', onMousemove);
		structure.addEventListener('mouseleave', onMouseleave);
	};

	const init = () => {
		const structure = document.getElementById('bricks-structure');
		if (structure) { attach(structure); return; }
		const timer = setInterval(() => {
			const s = document.getElementById('bricks-structure');
			if (s) { clearInterval(timer); attach(s); }
		}, 200);
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
