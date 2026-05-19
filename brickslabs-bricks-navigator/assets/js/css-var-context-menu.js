(function () {
	'use strict';

	// -------------------------------------------------------------------------
	// Constants
	// -------------------------------------------------------------------------

	var MENU_ID      = 'bl-css-var-menu';
	var CACHE_ATTR   = 'data-bl-var-cached';

	// Bricks controlkeys that should never show the variable picker
	// (query-loop numeric params, slider speed, etc.)
	var EXCLUDED_KEYS = [
		'start', 'perPage', 'perMove', 'speed', 'rating', 'maxRating',
	];

	// Specific text controlkeys that accept CSS values and benefit from variables
	var ALLOWED_TEXT_KEYS = [
		'_backdropFilter', '_pointerEvents', '_aspectRatio', '_perspectiveOrigin',
		'_cssTransition', '_transformOrigin', '_flexBasis', '_overflow',
		'_gridTemplateColumns', '_gridTemplateRows', '_gridAutoColumns', '_gridAutoRows',
		'_objectPosition',
	];

	// -------------------------------------------------------------------------
	// Variable naming patterns → category
	//
	// Typography is split into sub-categories so each Bricks typography
	// sub-control (font-size, font-weight, line-height, letter-spacing,
	// font-family) shows only its own relevant variables.
	//
	// Key rule: more-specific sub-categories are listed BEFORE the general
	// 'typography' catch-all so getVarCategory() returns the right bucket.
	// -------------------------------------------------------------------------

	var CATEGORY_PATTERNS = {
		color: [
			/^--color/, /^--clr/, /^--palette/, /^--primary/, /^--secondary/,
			/^--accent/, /^--base/, /^--surface/, /^--bg/, /^--background/,
			/^--text-color/, /^--link/, /^--heading/, /^--foreground/,
			/^--border-color/, // e.g. --border-color-light; checked before border patterns
			/color$/, /-bg$/, /-background$/, /-foreground$/, /-fill$/,
		],
		spacing: [
			/^--space/, /^--spacing/, /^--gap/, /^--s-[0-9]/, /^--s$/,
			/^--padding/, /^--margin/, /^--inset/, /^--size-/,
		],
		sizing: [
			/^--width/, /^--height/, /^--w-/, /^--h-/, /^--max-w/,
			/^--min-w/, /^--max-h/, /^--min-h/, /^--container/, /^--measure/,
		],
		// --- typography sub-categories (checked before the general catch-all) ---
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
			// Core Framework: --text-xs, --text-s, --text-m, --text-mm, --text-l, --text-xl, --text-xxl
			// Negative lookahead excludes --text-font-*, --text-weight*, --text-color*,
			// --text-line*, --text-letter*, --text-family*, --text-style*, --text-transform*.
			/^--text-(?!font|weight|color|line|letter|family|style|transform|decoration)/,
			/^--font-size/, /^--fs-/, /^--f-size/,
			/^--step-/, /^--fluid-text/, /^--fluid-type/,
			/^--text-size/, /^--text-fluid/,
			/^--heading-size/, /^--body-size/, /^--small-size/, /^--large-size/,
			// Core Framework heading scale: --h1 … --h6, --h1-*, --heading-*, --title-*
			/^--h[1-6]$/, /^--h[1-6]-/, /^--heading-/, /^--title-/,
			/font-size$/,
		],
		// --- general typography catch-all (vars that don't fit a sub-category) ---
		typography: [
			/^--font/, /^--type/, /^--text-/,
		],
		// --- other categories ---
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

	// All typography sub-category keys (used as a fallback when the specific
	// sub-control label can't be detected).
	var ALL_TYPOGRAPHY_CATS = [ 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-family', 'typography' ];

	// -------------------------------------------------------------------------
	// Detect the visible label text for a Bricks panel control
	// -------------------------------------------------------------------------

	function getControlLabel(controlEl) {
		var label = controlEl.querySelector('label');
		if ( label ) return label.textContent.trim().toLowerCase();

		var inner = controlEl.closest('.control-inner');
		if ( inner ) {
			label = inner.querySelector('label');
			if ( label ) return label.textContent.trim().toLowerCase();
		}

		return '';
	}

	// -------------------------------------------------------------------------
	// Control type → relevant categories (null = show all)
	// -------------------------------------------------------------------------

	function getRelevantCategories(controlEl) {
		if ( ! controlEl ) return null;

		var dataControl = controlEl.dataset.control || '';
		var ckEl        = controlEl.closest('[data-controlkey]');
		var ck          = ckEl ? ckEl.dataset.controlkey.toLowerCase() : '';

		if ( dataControl === 'color' || controlEl.closest('.color-input') ) {
			return [ 'color' ];
		}

		var inTypography = [ 'typography', 'font' ].some( function (s) { return ck.includes(s); } );
		if ( inTypography ) {
			// Use the control's visible label to pick the specific sub-category.
			var label = getControlLabel(controlEl);
			if ( /size/.test(label) )                              return [ 'font-size' ];
			if ( /weight/.test(label) )                            return [ 'font-weight' ];
			if ( /line.?height|leading/.test(label) )              return [ 'line-height' ];
			if ( /letter.?spacing|tracking/.test(label) )         return [ 'letter-spacing' ];
			if ( /family|typeface/.test(label) )                   return [ 'font-family' ];
			// Unknown sub-control: show all typography buckets.
			return ALL_TYPOGRAPHY_CATS;
		}

		if ( [ 'padding', 'margin', 'gap' ].some( function (s) { return ck.includes(s); } ) ) {
			return [ 'spacing' ];
		}
		if ( [ 'width', 'height' ].some( function (s) { return ck.includes(s); } ) ) {
			return [ 'sizing', 'spacing' ];
		}
		if ( [ 'border', 'outline', 'radius' ].some( function (s) { return ck.includes(s); } ) ) {
			// Bricks radius corner inputs (Top Left, Top Right, …) share the parent
			// _border controlkey, so ck alone says "border" not "radius".
			// The input's id and its label's for="" both carry the setting key
			// (e.g. _borderTopLeftRadius), which reliably contains "radius".
			var inp      = controlEl.querySelector('input');
			var inpId    = inp ? inp.id.toLowerCase() : '';
			var lbl      = controlEl.querySelector('label');
			var lblFor   = lbl ? ( lbl.getAttribute('for') || '' ).toLowerCase() : '';

			if ( ck.includes('radius') || inpId.includes('radius') || lblFor.includes('radius') ) {
				return [ 'border' ];
			}
			return [ 'border', 'sizing' ];
		}
		if ( [ 'grid', 'template', 'columns', 'rows' ].some( function (s) { return ck.includes(s); } ) ) {
			return [ 'grid', 'spacing', 'sizing' ];
		}
		if ( [ 'transition', 'animation', 'duration', 'ease' ].some( function (s) { return ck.includes(s); } ) ) {
			return [ 'transition' ];
		}
		if ( [ 'zindex', 'z-index', 'order' ].some( function (s) { return ck.includes(s); } ) ) {
			return [ 'zindex' ];
		}
		if ( [ 'shadow' ].some( function (s) { return ck.includes(s); } ) ) {
			return [ 'shadow' ];
		}
		if ( dataControl === 'number' ) {
			return [ 'spacing', 'sizing' ];
		}

		return null;
	}

	// -------------------------------------------------------------------------
	// Categorise a CSS custom property name
	// -------------------------------------------------------------------------

	function getVarCategory(name) {
		for ( var cat in CATEGORY_PATTERNS ) {
			if ( ! CATEGORY_PATTERNS.hasOwnProperty(cat) ) continue;
			var patterns = CATEGORY_PATTERNS[ cat ];
			for ( var i = 0; i < patterns.length; i++ ) {
				if ( patterns[ i ].test(name) ) return cat;
			}
		}
		return 'other';
	}

	// -------------------------------------------------------------------------
	// Collect CSS custom properties (cached)
	// -------------------------------------------------------------------------

	var cachedVars = null;

	function collectVars() {
		if ( cachedVars ) return cachedVars;

		var vars = [];
		var seen = {};

		// The builder runs inside #bricks-builder-iframe; the page's own stylesheets
		// (and therefore most CSS custom properties) live in the parent document.
		// window.parent.document gives access to those without any iframe lookup.
		var sources = [ document ];
		try {
			if ( window.parent && window.parent !== window && window.parent.document ) {
				sources.unshift(window.parent.document);
			}
		} catch ( e ) {} // guard against cross-origin edge cases

		sources.forEach( function (doc) {
			try {
				Array.from(doc.styleSheets).forEach( function (sheet) {
					try {
						Array.from(sheet.cssRules || []).forEach( function (rule) {
							var sel = rule.selectorText || '';
							if ( sel !== ':root' && ! sel.includes(':root') ) return;
							Array.from(rule.style).forEach( function (prop) {
								if ( prop.startsWith('--') && ! seen[ prop ] ) {
									seen[ prop ] = true;
									var value = rule.style.getPropertyValue(prop).trim();
									vars.push({
										name: prop,
										value: value,
										category: getVarCategory(prop),
									});
								}
							});
						});
					} catch (e) {}
				});
			} catch (e) {}
		});

		vars.sort( function (a, b) { return a.name.localeCompare(b.name); });
		cachedVars = vars;
		return vars;
	}

	function invalidateCache() {
		cachedVars = null;
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function isExcludedControlKey(el) {
		var ckEl = el.closest('[data-controlkey]');
		if ( ! ckEl ) return false;
		return EXCLUDED_KEYS.indexOf(ckEl.dataset.controlkey) !== -1;
	}

	// -------------------------------------------------------------------------
	// Determine whether the right-clicked target should open the variable menu
	// and return the <input> to write into.
	// -------------------------------------------------------------------------

	function resolveInput(target) {
		var controlEl = target.closest('[data-control]');
		if ( ! controlEl ) return null;

		// Never inside a query-loop control
		if ( controlEl.closest('.control-query') ) return null;

		// Never on excluded numeric controlkeys
		if ( isExcludedControlKey(target) ) return null;

		var dataControl = controlEl.dataset.control;

		// Color control
		if ( dataControl === 'color' ) {
			return controlEl.querySelector('.color-input input') || null;
		}

		// Number control (Bricks dimension / unit inputs)
		if ( dataControl === 'number' ) {
			return controlEl.querySelector('input[type="number"], input[type="text"]') || null;
		}

		// has-variables controls (Bricks marks these natively)
		if ( controlEl.classList.contains('has-variables') ) {
			return controlEl.querySelector('input') || null;
		}

		// Specific text controlkeys that accept raw CSS
		if ( dataControl === 'text' ) {
			var ckEl = controlEl.closest('[data-controlkey]');
			if ( ! ckEl ) return null;
			var ck = ckEl.dataset.controlkey;
			if ( ck.startsWith('raw-') || ALLOWED_TEXT_KEYS.indexOf(ck) !== -1 ) {
				return controlEl.querySelector('input') || null;
			}
			return null;
		}

		return null;
	}

	// -------------------------------------------------------------------------
	// Menu DOM
	// -------------------------------------------------------------------------

	var menuEl             = null;
	var activeInput        = null;
	var activeVars         = [];
	var originalInputValue = null; // value of activeInput before any hover preview
	var previewCommitted   = false; // true when the user clicked an item
	var canvasBlurHandler  = null; // window blur handler — fires when click enters the canvas iframe

	function buildMenu() {
		if ( document.getElementById(MENU_ID) ) {
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
				'<button class="bl-var-refresh" title="Re-collect variables">&#8635;</button>' +
				'<button class="bl-var-close" aria-label="Close">&times;</button>' +
			'</div>' +
			'<div class="bl-var-list"></div>';

		document.body.appendChild(menuEl);

		menuEl.querySelector('.bl-var-close').addEventListener('mousedown', function (e) {
			e.preventDefault();
			hideMenu();
		});

		menuEl.querySelector('.bl-var-refresh').addEventListener('mousedown', function (e) {
			e.preventDefault();
			invalidateCache();
			activeVars = collectVars();
			renderList(menuEl.querySelector('.bl-var-search').value.toLowerCase());
		});

		menuEl.querySelector('.bl-var-search').addEventListener('input', function () {
			renderList(this.value.toLowerCase());
		});

		menuEl.addEventListener('keydown', function (e) {
			if ( e.key === 'Escape' ) {
				e.stopPropagation();
				hideMenu();
			}
		});
	}

	function renderList(filter) {
		var list     = menuEl.querySelector('.bl-var-list');
		var filtered = filter
			? activeVars.filter( function (v) {
				return v.name.includes(filter) || v.value.toLowerCase().includes(filter);
			})
			: activeVars;

		if ( ! filtered.length ) {
			list.innerHTML = '<p class="bl-var-empty">No variables found.</p>';
			return;
		}

		// Group by category
		var groups = {};
		filtered.forEach( function (v) {
			if ( ! groups[ v.category ] ) groups[ v.category ] = [];
			groups[ v.category ].push(v);
		});

		var html = '';
		Object.keys(groups).sort().forEach( function (cat) {
			html += '<div class="bl-var-group">';
			html += '<div class="bl-var-group-label">' + escapeHtml(cat) + '</div>';
			groups[ cat ].forEach( function (v) {
				var swatch = v.category === 'color' && v.value
					? '<span class="bl-var-swatch" style="background:' + escapeHtml(v.value) + '"></span>'
					: '';
				html +=
					'<button class="bl-var-item" data-insert="var(' + escapeHtml(v.name) + ')" data-category="' + escapeHtml(v.category) + '" title="' + escapeHtml(v.name) + '">' +
						swatch +
						'<span class="bl-var-name">' + escapeHtml(v.name.replace('--', '')) + '</span>' +
					'</button>';
			});
			html += '</div>';
		});

		list.innerHTML = html;

		list.querySelectorAll('.bl-var-item').forEach( function (btn) {
			btn.addEventListener('mouseenter', function () {
				applyPreview(btn.dataset.insert);
			});
			btn.addEventListener('mouseleave', function () {
				restorePreview();
			});
			btn.addEventListener('mousedown', function (e) {
				e.preventDefault();
				insertVariable(btn.dataset.insert);
			});
		});
	}

	// Write varStr into the active input and fire only the input event so the
	// canvas updates live. The change event is intentionally omitted to avoid
	// dirtying Bricks state or polluting undo history on hover.
	function applyPreview(varStr) {
		if ( ! activeInput ) return;
		activeInput.value = varStr;
		activeInput.dispatchEvent(new Event('input', { bubbles: true }));
	}

	// Restore the input to its value at menu-open time (input-only, no change).
	function restorePreview() {
		if ( ! activeInput || originalInputValue === null ) return;
		activeInput.value = originalInputValue;
		activeInput.dispatchEvent(new Event('input', { bubbles: true }));
	}

	function showMenu(e, input, vars) {
		activeInput        = input;
		activeVars         = vars;
		originalInputValue = input.value;
		previewCommitted   = false;

		renderList('');
		menuEl.querySelector('.bl-var-search').value = '';

		// Initial position near cursor
		menuEl.style.left    = e.clientX + 'px';
		menuEl.style.top     = e.clientY + 'px';
		menuEl.style.display = 'flex';

		// Adjust if off-screen, then focus the search box and arm the blur handler.
		// Registering the blur handler inside rAF ensures focus has already settled
		// on the search input, so the handler won't fire spuriously on menu open.
		requestAnimationFrame( function () {
			var rect = menuEl.getBoundingClientRect();
			if ( rect.right > window.innerWidth - 8 ) {
				menuEl.style.left = ( window.innerWidth - rect.width - 8 ) + 'px';
			}
			if ( rect.bottom > window.innerHeight - 8 ) {
				menuEl.style.top = Math.max(8, e.clientY - rect.height) + 'px';
			}
			menuEl.querySelector('.bl-var-search').focus();

			// Clicks inside the canvas iframe don't bubble to the parent document.
			// When focus shifts into the iframe the parent window fires 'blur', which
			// is the only reliable cross-document signal for an iframe click.
			canvasBlurHandler = function () { hideMenu(); };
			window.addEventListener('blur', canvasBlurHandler);
		});
	}

	function hideMenu() {
		if ( ! previewCommitted ) restorePreview();
		if ( menuEl ) menuEl.style.display = 'none';
		activeInput        = null;
		originalInputValue = null;
		previewCommitted   = false;

		if ( canvasBlurHandler ) {
			window.removeEventListener('blur', canvasBlurHandler);
			canvasBlurHandler = null;
		}
	}

	function insertVariable(varStr) {
		if ( ! activeInput ) return;

		previewCommitted = true; // prevent hideMenu() from restoring the old value

		var input = activeInput;
		input.value = varStr;
		input.dispatchEvent(new Event('input',  { bubbles: true }));
		input.dispatchEvent(new Event('change', { bubbles: true }));

		hideMenu();
		input.focus();
	}

	// -------------------------------------------------------------------------
	// Event delegation — contextmenu on the Bricks panel
	// -------------------------------------------------------------------------

	function onContextMenu(e) {
		var input = resolveInput(e.target);
		if ( ! input ) return;

		e.preventDefault();
		e.stopPropagation();

		var allVars    = collectVars();
		var controlEl  = e.target.closest('[data-control]');
		var categories = getRelevantCategories(controlEl);
		var vars;

		if ( categories === null ) {
			vars = allVars;
		} else {
			vars = allVars.filter( function (v) {
				return categories.indexOf(v.category) !== -1;
			});
			// Fall back to all if filtering left nothing
			if ( ! vars.length ) vars = allVars;
		}

		showMenu(e, input, vars);
	}

	// -------------------------------------------------------------------------
	// Global close handlers
	// -------------------------------------------------------------------------

	document.addEventListener('mousedown', function (e) {
		if ( menuEl && menuEl.style.display === 'flex' && ! menuEl.contains(e.target) ) {
			hideMenu();
		}
	}, true);

	document.addEventListener('keydown', function (e) {
		if ( e.key === 'Escape' && menuEl && menuEl.style.display === 'flex' ) {
			hideMenu();
		}
	});

	// -------------------------------------------------------------------------
	// Init — wait for Bricks panel
	// -------------------------------------------------------------------------

	function init() {
		buildMenu();
		document.addEventListener('contextmenu', onContextMenu, true);
	}

	var pollInterval = setInterval( function () {
		if ( document.getElementById('bricks-panel') ) {
			clearInterval(pollInterval);
			init();
		}
	}, 500);

})();
