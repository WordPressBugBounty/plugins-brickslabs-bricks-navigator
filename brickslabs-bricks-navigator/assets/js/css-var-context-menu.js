(() => {
	// -------------------------------------------------------------------------
	// Constants
	// -------------------------------------------------------------------------

	const MENU_ID = 'bl-css-var-menu';

	// Bricks controlkeys that should never show the variable picker
	// (query-loop numeric params, slider speed, etc.)
	const EXCLUDED_KEYS = ['start', 'perPage', 'perMove', 'speed', 'rating', 'maxRating'];

	// Specific text controlkeys that accept CSS values and benefit from variables
	const ALLOWED_TEXT_KEYS = [
		'_backdropFilter', '_pointerEvents', '_aspectRatio', '_perspectiveOrigin',
		'_cssTransition', '_transformOrigin', '_flexBasis', '_overflow',
		'_gridTemplateColumns', '_gridTemplateRows', '_gridAutoColumns', '_gridAutoRows',
		'_objectPosition',
	];

	// -------------------------------------------------------------------------
	// Variable naming patterns → category
	// -------------------------------------------------------------------------

	const CATEGORY_PATTERNS = {
		color: [
			/^--color/, /^--clr/, /^--palette/, /^--primary/, /^--secondary/,
			/^--accent/, /^--base/, /^--surface/, /^--bg/, /^--background/,
			/^--text-color/, /^--link/, /^--heading/, /^--foreground/,
			/^--border-color/,
			/color$/, /-bg$/, /-background$/, /-foreground$/, /-fill$/,
			/-color-/, /-clr-/,
		],
		spacing: [
			/^--space/, /^--spacing/, /^--gap/, /^--s-[0-9]/, /^--s$/,
			/^--padding/, /^--margin/, /^--inset/, /^--size-/,
			/-space-/, /-spacing-/, /-gap-/,
		],
		sizing: [
			/^--width/, /^--height/, /^--w-/, /^--h-/, /^--max-w/,
			/^--min-w/, /^--max-h/, /^--min-h/, /^--container/, /^--measure/,
		],
		'font-weight': [
			/^--font-weight/, /^--fw-/, /^--f-weight/, /^--font-bold/,
			/^--text-font-weight/, /^--text-weight/, /font-weight$/, /weight$/,
		],
		'line-height': [
			/^--line-height/, /^--lh-/, /^--leading/,
			/^--text-line-height/, /line-height$/, /leading$/,
		],
		'letter-spacing': [
			/^--letter-spacing/, /^--ls-/, /^--tracking/,
			/^--text-letter-spacing/, /letter-spacing$/, /tracking$/,
		],
		'font-family': [
			/^--font-family/, /^--ff-/, /^--typeface/, /^--font-stack/,
			/^--text-font-family/, /font-family$/, /typeface$/,
		],
		'font-size': [
			/^--text-(?!font|weight|color|line|letter|family|style|transform|decoration)/,
			/^--font-size/, /^--fs-/, /^--f-size/,
			/^--step-/, /^--fluid-text/, /^--fluid-type/,
			/^--text-size/, /^--text-fluid/,
			/^--heading-size/, /^--body-size/, /^--small-size/, /^--large-size/,
			/^--h[1-6]$/, /^--h[1-6]-/, /^--heading-/, /^--title-/,
			/font-size$/,
			/-step-/,
		],
		typography: [
			/^--font/, /^--type/, /^--text-/,
		],
		border: [
			/^--border/, /^--outline/, /^--radius/, /^--rounded/,
			/^--border-radius/,
		],
		transition: [
			/^--transition/, /^--duration/, /^--ease/, /^--timing/, /^--delay/,
			/^--animation/, /^--motion/, /^--easing/,
		],
		grid: [
			/^--grid/, /^--columns/, /^--rows/, /^--col-/, /^--row-/,
			/^--sidebar/, /^--content-width/,
		],
		shadow: [
			/^--shadow/, /^--box-shadow/, /^--drop-shadow/, /^--elevation/,
		],
		zindex: [
			/^--z-/, /^--layer-/, /^--z$/, /^--index/,
		],
	};

	const ALL_TYPOGRAPHY_CATS = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-family', 'typography'];

	// -------------------------------------------------------------------------
	// Detect the visible label text for a Bricks panel control
	// -------------------------------------------------------------------------

	const getControlLabel = (controlEl) => {
		let label = controlEl.querySelector('label');
		if (label) return label.textContent.trim().toLowerCase();
		const inner = controlEl.closest('.control-inner');
		if (inner) {
			label = inner.querySelector('label');
			if (label) return label.textContent.trim().toLowerCase();
		}
		return '';
	};

	// -------------------------------------------------------------------------
	// Control type → relevant categories (null = show all)
	// -------------------------------------------------------------------------

	const getRelevantCategories = (controlEl) => {
		if (!controlEl) return null;

		const dataControl = controlEl.dataset.control ?? '';
		const ckEl = controlEl.closest('[data-controlkey]');
		const ck = ckEl ? ckEl.dataset.controlkey.toLowerCase() : '';

		if (dataControl === 'color' || controlEl.closest('.color-input')) return ['color'];

		const inTypography = ['typography', 'font'].some(s => ck.includes(s));
		if (inTypography) {
			const label = getControlLabel(controlEl);
			if (/size/.test(label))                             return ['font-size'];
			if (/weight/.test(label))                           return ['font-weight'];
			if (/line.?height|leading/.test(label))             return ['line-height'];
			if (/letter.?spacing|tracking/.test(label))         return ['letter-spacing'];
			if (/family|typeface/.test(label))                  return ['font-family'];
			return ALL_TYPOGRAPHY_CATS;
		}

		if (['padding', 'margin', 'gap'].some(s => ck.includes(s))) return ['spacing'];
		if (['width', 'height'].some(s => ck.includes(s))) return ['sizing', 'spacing'];

		if (['border', 'outline', 'radius'].some(s => ck.includes(s))) {
			const inp = controlEl.querySelector('input');
			const inpId = inp ? inp.id.toLowerCase() : '';
			const lbl = controlEl.querySelector('label');
			const lblFor = lbl ? (lbl.getAttribute('for') ?? '').toLowerCase() : '';
			if (ck.includes('radius') || inpId.includes('radius') || lblFor.includes('radius')) {
				return ['border'];
			}
			return ['border', 'sizing'];
		}

		if (['grid', 'template', 'columns', 'rows'].some(s => ck.includes(s))) return ['grid', 'spacing', 'sizing'];
		if (['transition', 'animation', 'duration', 'ease'].some(s => ck.includes(s))) return ['transition'];
		if (['zindex', 'z-index', 'order'].some(s => ck.includes(s))) return ['zindex'];
		if (['shadow'].some(s => ck.includes(s))) return ['shadow'];
		if (dataControl === 'number') return ['spacing', 'sizing'];

		return null;
	};

	// -------------------------------------------------------------------------
	// Categorise a CSS custom property name
	// -------------------------------------------------------------------------

	const getVarCategory = (name) => {
		for (const cat of Object.keys(CATEGORY_PATTERNS)) {
			if (CATEGORY_PATTERNS[cat].some(re => re.test(name))) return cat;
		}
		return 'other';
	};

	// -------------------------------------------------------------------------
	// Collect CSS custom properties (cached)
	// -------------------------------------------------------------------------

	let cachedVars = null;

	const collectVars = () => {
		if (cachedVars) return cachedVars;

		const vars = [];
		const seen = {};

		const sources = [document];
		try {
			if (window.parent && window.parent !== window && window.parent.document) {
				sources.unshift(window.parent.document);
			}
		} catch (e) {}

		for (const doc of sources) {
			try {
				for (const sheet of doc.styleSheets) {
					try {
						for (const rule of sheet.cssRules ?? []) {
							const sel = rule.selectorText ?? '';
							if (sel !== ':root' && !sel.includes(':root')) continue;
							for (const prop of rule.style) {
								if (prop.startsWith('--') && !seen[prop]) {
									seen[prop] = true;
									vars.push({
										name: prop,
										value: rule.style.getPropertyValue(prop).trim(),
										category: getVarCategory(prop),
									});
								}
							}
						}
					} catch (e) {}
				}
			} catch (e) {}
		}

		vars.sort((a, b) => a.name.localeCompare(b.name));
		cachedVars = vars;
		return vars;
	};

	const invalidateCache = () => { cachedVars = null; };

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	const escapeHtml = (str) =>
		String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');

	const isExcludedControlKey = (el) => {
		const ckEl = el.closest('[data-controlkey]');
		return ckEl ? EXCLUDED_KEYS.includes(ckEl.dataset.controlkey) : false;
	};

	// -------------------------------------------------------------------------
	// Determine whether the right-clicked target should open the variable menu
	// -------------------------------------------------------------------------

	const resolveInput = (target) => {
		const controlEl = target.closest('[data-control]');
		if (!controlEl) return null;
		if (controlEl.closest('.control-query')) return null;
		if (isExcludedControlKey(target)) return null;

		const dataControl = controlEl.dataset.control;

		if (dataControl === 'color') {
			return controlEl.querySelector('.color-input input') ?? null;
		}

		if (dataControl === 'number') {
			return controlEl.querySelector('input[type="number"], input[type="text"]') ?? null;
		}

		if (controlEl.classList.contains('has-variables')) {
			return controlEl.querySelector('input') ?? null;
		}

		if (dataControl === 'text') {
			const ckEl = controlEl.closest('[data-controlkey]');
			if (!ckEl) return null;
			const ck = ckEl.dataset.controlkey;
			if (ck.startsWith('raw-') || ALLOWED_TEXT_KEYS.includes(ck)) {
				return controlEl.querySelector('input') ?? null;
			}
			return null;
		}

		return null;
	};

	// -------------------------------------------------------------------------
	// Menu DOM
	// -------------------------------------------------------------------------

	let menuEl               = null;
	let activeInput          = null;
	let activeVars           = [];
	let allCollectedVars     = [];
	let categoryFilteredVars = [];
	let activeCategories     = null;
	let originalInputValue   = null;
	let previewCommitted     = false;
	let canvasBlurHandler    = null;
	let showOnlyRelevant     = (localStorage.getItem('bl-var-relevant-only') !== '0');

	const updateToggleButton = () => {
		const btn = menuEl?.querySelector('.bl-var-toggle-filter');
		if (!btn) return;
		if (showOnlyRelevant) {
			btn.textContent = 'All';
			btn.title = 'Showing relevant variables — click to show all';
			btn.classList.remove('is-active');
		} else {
			btn.textContent = 'Rel';
			btn.title = 'Showing all variables — click to show relevant only';
			btn.classList.add('is-active');
		}
	};

	const buildMenu = () => {
		if (document.getElementById(MENU_ID)) {
			menuEl = document.getElementById(MENU_ID);
			return;
		}

		menuEl = document.createElement('div');
		menuEl.id = MENU_ID;
		menuEl.setAttribute('role', 'dialog');
		menuEl.setAttribute('aria-label', 'CSS Variables');
		menuEl.innerHTML =
			'<div class="bl-var-header">' +
				'<input type="text" class="bl-var-search" placeholder="Search variables…" autocomplete="off" spellcheck="false">' +
				'<button class="bl-var-toggle-filter" title=""></button>' +
				'<button class="bl-var-refresh" title="Re-collect variables">&#8635;</button>' +
				'<button class="bl-var-close" aria-label="Close">&times;</button>' +
			'</div>' +
			'<div class="bl-var-list"></div>';

		document.body.appendChild(menuEl);

		menuEl.querySelector('.bl-var-close').addEventListener('mousedown', (e) => {
			e.preventDefault();
			hideMenu();
		});

		menuEl.querySelector('.bl-var-toggle-filter').addEventListener('mousedown', (e) => {
			e.preventDefault();
			showOnlyRelevant = !showOnlyRelevant;
			localStorage.setItem('bl-var-relevant-only', showOnlyRelevant ? '1' : '0');
			activeVars = showOnlyRelevant ? categoryFilteredVars : allCollectedVars;
			updateToggleButton();
			renderList(menuEl.querySelector('.bl-var-search').value.toLowerCase());
		});

		menuEl.querySelector('.bl-var-refresh').addEventListener('mousedown', (e) => {
			e.preventDefault();
			invalidateCache();
			allCollectedVars = collectVars();
			if (activeCategories === null) {
				categoryFilteredVars = allCollectedVars;
			} else {
				categoryFilteredVars = allCollectedVars.filter(v => activeCategories.includes(v.category));
				if (!categoryFilteredVars.length) categoryFilteredVars = allCollectedVars;
			}
			activeVars = showOnlyRelevant ? categoryFilteredVars : allCollectedVars;
			renderList(menuEl.querySelector('.bl-var-search').value.toLowerCase());
		});

		menuEl.querySelector('.bl-var-search').addEventListener('input', function () {
			renderList(this.value.toLowerCase());
		});

		menuEl.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') { e.stopPropagation(); hideMenu(); }
		});
	};

	const renderList = (filter) => {
		const list = menuEl.querySelector('.bl-var-list');
		const filtered = filter
			? activeVars.filter(v => v.name.includes(filter) || v.value.toLowerCase().includes(filter))
			: activeVars;

		if (!filtered.length) {
			list.innerHTML = '<p class="bl-var-empty">No variables found.</p>';
			return;
		}

		const groups = {};
		for (const v of filtered) {
			(groups[v.category] ??= []).push(v);
		}

		let html = '';
		for (const cat of Object.keys(groups).sort()) {
			html += `<div class="bl-var-group"><div class="bl-var-group-label">${escapeHtml(cat)}</div>`;
			for (const v of groups[cat]) {
				const swatch = v.category === 'color' && v.value
					? `<span class="bl-var-swatch" style="background:${escapeHtml(v.value)}"></span>`
					: '';
				html += `<button class="bl-var-item" data-insert="var(${escapeHtml(v.name)})" data-category="${escapeHtml(v.category)}" title="${escapeHtml(v.name)}">${swatch}<span class="bl-var-name">${escapeHtml(v.name.replace('--', ''))}</span></button>`;
			}
			html += '</div>';
		}

		list.innerHTML = html;

		list.querySelectorAll('.bl-var-item').forEach(btn => {
			btn.addEventListener('mouseenter', () => applyPreview(btn.dataset.insert));
			btn.addEventListener('mouseleave', () => restorePreview());
			btn.addEventListener('mousedown', (e) => {
				e.preventDefault();
				insertVariable(btn.dataset.insert);
			});
		});
	};

	const applyPreview = (varStr) => {
		if (!activeInput) return;
		activeInput.value = varStr;
		activeInput.dispatchEvent(new Event('input', { bubbles: true }));
	};

	const restorePreview = () => {
		if (!activeInput || originalInputValue === null) return;
		activeInput.value = originalInputValue;
		activeInput.dispatchEvent(new Event('input', { bubbles: true }));
	};

	const showMenu = (e, input, allVars, filteredVars) => {
		activeInput          = input;
		allCollectedVars     = allVars;
		categoryFilteredVars = filteredVars;
		activeVars           = showOnlyRelevant ? categoryFilteredVars : allCollectedVars;
		originalInputValue   = input.value;
		previewCommitted     = false;

		updateToggleButton();
		menuEl.querySelector('.bl-var-search').value = '';
		renderList('');

		menuEl.style.left    = `${e.clientX}px`;
		menuEl.style.top     = `${e.clientY}px`;
		menuEl.style.display = 'flex';

		requestAnimationFrame(() => {
			const rect = menuEl.getBoundingClientRect();
			if (rect.right > window.innerWidth - 8) {
				menuEl.style.left = `${window.innerWidth - rect.width - 8}px`;
			}
			if (rect.bottom > window.innerHeight - 8) {
				menuEl.style.top = `${Math.max(8, e.clientY - rect.height)}px`;
			}
			menuEl.querySelector('.bl-var-search').focus();

			canvasBlurHandler = () => hideMenu();
			window.addEventListener('blur', canvasBlurHandler);
		});
	};

	const hideMenu = () => {
		if (!previewCommitted) restorePreview();
		if (menuEl) menuEl.style.display = 'none';
		activeInput        = null;
		originalInputValue = null;
		previewCommitted   = false;

		if (canvasBlurHandler) {
			window.removeEventListener('blur', canvasBlurHandler);
			canvasBlurHandler = null;
		}
	};

	const insertVariable = (varStr) => {
		if (!activeInput) return;
		previewCommitted = true;
		const input = activeInput;
		input.value = varStr;
		input.dispatchEvent(new Event('input',  { bubbles: true }));
		input.dispatchEvent(new Event('change', { bubbles: true }));
		hideMenu();
		input.focus();
	};

	// -------------------------------------------------------------------------
	// Event delegation — contextmenu on the Bricks panel
	// -------------------------------------------------------------------------

	const onContextMenu = (e) => {
		const input = resolveInput(e.target);
		if (!input) return;

		e.preventDefault();
		e.stopPropagation();

		const allVars      = collectVars();
		const controlEl    = e.target.closest('[data-control]');
		activeCategories   = getRelevantCategories(controlEl);

		let filteredVars;
		if (activeCategories === null) {
			filteredVars = allVars;
		} else {
			filteredVars = allVars.filter(v => activeCategories.includes(v.category));
			if (!filteredVars.length) filteredVars = allVars;
		}

		showMenu(e, input, allVars, filteredVars);
	};

	// -------------------------------------------------------------------------
	// Global close handlers
	// -------------------------------------------------------------------------

	document.addEventListener('mousedown', (e) => {
		if (menuEl?.style.display === 'flex' && !menuEl.contains(e.target)) hideMenu();
	}, true);

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && menuEl?.style.display === 'flex') hideMenu();
	});

	// -------------------------------------------------------------------------
	// Init — wait for Bricks panel
	// -------------------------------------------------------------------------

	const init = () => {
		buildMenu();
		document.addEventListener('contextmenu', onContextMenu, true);
	};

	const pollInterval = setInterval(() => {
		if (document.getElementById('bricks-panel')) {
			clearInterval(pollInterval);
			init();
		}
	}, 500);
})();
