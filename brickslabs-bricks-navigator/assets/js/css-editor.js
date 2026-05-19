(function () {
	'use strict';

	// ---------------------------------------------------------------------------
	// Constants
	// ---------------------------------------------------------------------------

	var STORAGE_KEY = 'blcss_collapsed';
	var PANEL_ID = 'blcss-editor-panel';

	// ---------------------------------------------------------------------------
	// Property map: CSS property → Bricks settings key + type
	//
	// Types:
	//   'value'       – stored as a plain string (e.g. "100px", "relative")
	//   'number'      – stored as a JS number (e.g. 2, 10)
	//   'spacing'     – shorthand; parsed into the Bricks spacing object
	//   'spacing-dir' – single direction of a spacing object; 'dir' indicates which
	// ---------------------------------------------------------------------------

	var PROP_MAP = {
		// Spacing shorthands
		margin: { key: '_margin', type: 'spacing' },
		padding: { key: '_padding', type: 'spacing' },
		// Spacing longhands
		'margin-top': { key: '_margin', type: 'spacing-dir', dir: 'top' },
		'margin-right': { key: '_margin', type: 'spacing-dir', dir: 'right' },
		'margin-bottom': { key: '_margin', type: 'spacing-dir', dir: 'bottom' },
		'margin-left': { key: '_margin', type: 'spacing-dir', dir: 'left' },
		'padding-top': { key: '_padding', type: 'spacing-dir', dir: 'top' },
		'padding-right': { key: '_padding', type: 'spacing-dir', dir: 'right' },
		'padding-bottom': { key: '_padding', type: 'spacing-dir', dir: 'bottom' },
		'padding-left': { key: '_padding', type: 'spacing-dir', dir: 'left' },
		// Display
		display: { key: '_display', type: 'value' },
		// Flex / layout (self)
		'align-self': { key: '_alignSelf', type: 'value' },
		'justify-self': { key: '_gridItemJustifySelf', type: 'value' },
		// Flex container
		'flex-direction': { key: '_flexDirection', type: 'value' },
		'flex-wrap': { key: '_flexWrap', type: 'value' },
		'justify-content': { key: '_justifyContent', type: 'value' },
		'align-items': { key: '_alignItems', type: 'value' },
		// Flex item
		'flex-grow': { key: '_flexGrow', type: 'number' },
		'flex-shrink': { key: '_flexShrink', type: 'number' },
		'flex-basis': { key: '_flexBasis', type: 'value' },
		// Sizing
		width: { key: '_width', type: 'value' },
		'min-width': { key: '_widthMin', type: 'value' },
		'max-width': { key: '_widthMax', type: 'value' },
		height: { key: '_height', type: 'value' },
		'min-height': { key: '_heightMin', type: 'value' },
		'max-height': { key: '_heightMax', type: 'value' },
		'aspect-ratio': { key: '_aspectRatio', type: 'value' },
		// Gap — 'gap' and 'grid-gap' both map to _gridGap here; applyCSS redirects to
		// _gap at write-time when _display is flex/inline-flex. settingsToCss reads
		// whichever key is non-empty based on the current display value.
		gap: { key: '_gridGap', type: 'value' },
		'grid-gap': { key: '_gridGap', type: 'value' },
		'column-gap': { key: '_columnGap', type: 'value' },
		'row-gap': { key: '_rowGap', type: 'value' },
		// Grid layout
		'grid-template-columns': { key: '_gridTemplateColumns', type: 'value' },
		'grid-template-rows': { key: '_gridTemplateRows', type: 'value' },
		'grid-auto-columns': { key: '_gridAutoColumns', type: 'value' },
		'grid-auto-rows': { key: '_gridAutoRows', type: 'value' },
		'grid-auto-flow': { key: '_gridAutoFlow', type: 'value' },
		// Position
		position: { key: '_position', type: 'value' },
		top: { key: '_top', type: 'value' },
		right: { key: '_right', type: 'value' },
		bottom: { key: '_bottom', type: 'value' },
		left: { key: '_left', type: 'value' },
		// Numeric
		'z-index': { key: '_zIndex', type: 'number' },
		opacity: { key: '_opacity', type: 'number' },
		order: { key: '_order', type: 'number' },
		// Transform
		'transform-origin': { key: '_transformOrigin', type: 'value' },
		// Background — _background is an object with color, image, repeat, position, size, attachment sub-keys.
		// 'bg-color'      reads/writes _background.color as a Bricks color object.
		// 'bg-image'      reads/writes _background.image = { url: '...' }
		// 'bg-sub'        reads/writes a plain string sub-key of _background
		// 'bg-shorthand'  parses the full background shorthand into sub-keys
		background: { key: '_background', type: 'bg-shorthand' },
		'background-color': { key: '_background', type: 'bg-color' },
		'background-image': { key: '_background', type: 'bg-image' },
		'background-repeat': { key: '_background', type: 'bg-sub', sub: 'repeat' },
		'background-position': {
			key: '_background',
			type: 'bg-sub',
			sub: 'position',
		},
		'background-size': { key: '_background', type: 'bg-sub', sub: 'size' },
		'background-attachment': {
			key: '_background',
			type: 'bg-sub',
			sub: 'attachment',
		},
		// Typography — stored as sub-keys of the _typography object.
		// 'typography' type  : surgical patch on one sub-key; 'sub' names the key.
		// font-family is intentionally omitted (custom-font IDs, fallback strings).
		// The 'color' sub-key holds a Bricks color object (handled specially below).
		color: { key: '_typography', type: 'typography', sub: 'color' },
		'font-size': { key: '_typography', type: 'typography', sub: 'font-size' },
		'font-weight': {
			key: '_typography',
			type: 'typography',
			sub: 'font-weight',
		},
		'font-style': { key: '_typography', type: 'typography', sub: 'font-style' },
		'text-decoration': {
			key: '_typography',
			type: 'typography',
			sub: 'text-decoration',
		},
		'text-transform': {
			key: '_typography',
			type: 'typography',
			sub: 'text-transform',
		},
		'line-height': {
			key: '_typography',
			type: 'typography',
			sub: 'line-height',
		},
		'letter-spacing': {
			key: '_typography',
			type: 'typography',
			sub: 'letter-spacing',
		},
		// Border — all border-* properties funnel into surgical patches on _border.
		// Structure: { width:{top,right,bottom,left,unit:{…}}, style, color, radius:{…} }
		// Radius key mapping: top→top-left, right→top-right, bottom→bottom-right, left→bottom-left
		border: { key: '_border', type: 'border', sub: 'shorthand' },
		'border-top': { key: '_border', type: 'border', sub: 'side-top' },
		'border-right': { key: '_border', type: 'border', sub: 'side-right' },
		'border-bottom': { key: '_border', type: 'border', sub: 'side-bottom' },
		'border-left': { key: '_border', type: 'border', sub: 'side-left' },
		'border-width': { key: '_border', type: 'border', sub: 'width' },
		'border-top-width': { key: '_border', type: 'border', sub: 'width-top' },
		'border-right-width': {
			key: '_border',
			type: 'border',
			sub: 'width-right',
		},
		'border-bottom-width': {
			key: '_border',
			type: 'border',
			sub: 'width-bottom',
		},
		'border-left-width': { key: '_border', type: 'border', sub: 'width-left' },
		'border-style': { key: '_border', type: 'border', sub: 'style' },
		'border-color': { key: '_border', type: 'border', sub: 'color' },
		'border-radius': { key: '_border', type: 'border', sub: 'radius' },
		'border-top-left-radius': {
			key: '_border',
			type: 'border',
			sub: 'radius-top',
		},
		'border-top-right-radius': {
			key: '_border',
			type: 'border',
			sub: 'radius-right',
		},
		'border-bottom-right-radius': {
			key: '_border',
			type: 'border',
			sub: 'radius-bottom',
		},
		'border-bottom-left-radius': {
			key: '_border',
			type: 'border',
			sub: 'radius-left',
		},
	};

	// Flat list of every Bricks setting key managed by a 'value' or 'number' PROP_MAP entry.
	// Used in applyCSS to clear keys that were absent from the typed CSS.
	var SIMPLE_SETTING_KEYS = (function () {
		var seen = {},
			keys = [];
		Object.keys(PROP_MAP).forEach(function (cssProp) {
			var e = PROP_MAP[cssProp];
			if ((e.type === 'value' || e.type === 'number') && !seen[e.key]) {
				seen[e.key] = true;
				keys.push(e.key);
			}
		});
		return keys;
	})();

	// ---------------------------------------------------------------------------
	// Config (injected by wp_localize_script as window.blCssEditorConfig)
	// ---------------------------------------------------------------------------

	var CONFIG =
		typeof blCssEditorConfig !== 'undefined' ? blCssEditorConfig : {};
	var AUTO_APPLY = !!CONFIG.autoApply;
	var AUTO_APPLY_MS = 800; // debounce delay when auto-apply is on

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	var state = {
		applying: false, // true while we are writing settings → prevents observer loop
		lastContextKey: null, // 'element:id' or 'class:id'
		dirty: false, // textarea has changes not yet applied
		autoApplyTimer: null, // setTimeout handle for debounced auto-apply
	};

	// Per-context typed CSS property order — captured during cssToSettings on Apply
	// and consulted by settingsToCss to preserve the order the user typed in.
	// Keyed by context key ('element:<id>' or 'class:<id>'); session-only.
	var typedOrderByContext = {};

	/**
	 * Sort a list of canonical CSS-line strings to follow a user-typed property
	 * order.  Lines whose CSS property (or its longhand base, e.g. `padding-top`
	 * → `padding`) appears in `order` are placed first in that order; everything
	 * else keeps its relative canonical position at the end (stable sort).
	 */
	function sortLinesByOrder(lines, order) {
		if (!order || order.length === 0) return lines;

		var orderMap = {};
		order.forEach(function (prop, i) {
			orderMap[prop] = i;
		});

		function indexForLine(line) {
			var m = line.match(/^([\w-]+)\s*:/);
			if (!m) return Infinity;
			var prop = m[1].toLowerCase();
			if (prop in orderMap) return orderMap[prop];
			// Longhand fallback: line `padding-top` matches typed `padding`.
			for (var i = 0; i < order.length; i++) {
				if (prop.indexOf(order[i] + '-') === 0) return orderMap[order[i]];
			}
			return Infinity;
		}

		return lines
			.map(function (line, i) {
				return { line: line, oIdx: indexForLine(line), origIdx: i };
			})
			.sort(function (a, b) {
				if (a.oIdx !== b.oIdx) return a.oIdx - b.oIdx;
				return a.origIdx - b.origIdx;
			})
			.map(function (x) {
				return x.line;
			});
	}

	// ---------------------------------------------------------------------------
	// Vue helpers
	// ---------------------------------------------------------------------------

	var _gp = null;

	function getGP() {
		if (!_gp) {
			var body = document.querySelector('.brx-body');
			if (body && body.__vue_app__) {
				_gp = body.__vue_app__.config.globalProperties;
			}
		}
		return _gp;
	}

	function getVueState() {
		var gp = getGP();
		return gp ? gp.$_state : null;
	}

	// ---------------------------------------------------------------------------
	// Context: determine whether we are in element or class scope
	// ---------------------------------------------------------------------------

	function getContext(vueState) {
		// Class context: activeClass is a real object with an id
		var ac = vueState.activeClass;
		if (ac && typeof ac === 'object' && ac !== false && ac !== '' && ac.id) {
			var className = ac.name || ac.id;
			return {
				type: 'class',
				id: ac.id,
				settings: ac.settings || {},
				selector: '.' + className,
			};
		}
		// Element context
		var ae = vueState.activeElement;
		if (ae && ae.id) {
			var cssId = ae.settings && ae.settings._cssId ? ae.settings._cssId : null;
			return {
				type: 'element',
				id: ae.id,
				settings: ae.settings || {},
				selector: cssId ? '#' + cssId : '#brxe-' + ae.id,
			};
		}
		return null;
	}

	// ---------------------------------------------------------------------------
	// _cssCustom helpers
	// ---------------------------------------------------------------------------

	/**
	 * Strip the outer selector wrapper from a stored _cssCustom value.
	 *
	 * Bricks stores element custom CSS as: %root% { ... }
	 * Bricks stores class custom CSS as:   .className { ... }
	 * (The canvas CSS pipeline does not replace %root% for class context —
	 *  classes must be stored with the actual selector already substituted.)
	 *
	 * @param {string}      raw      Raw stored value.
	 * @param {string|null} selector Known selector for class context (e.g. ".foo").
	 */
	/**
	 * Walk a string with brace counting and return the index of the `}` that
	 * matches the opening `{` at position `openIdx`.  Returns -1 if not balanced.
	 */
	function findMatchingClose(s, openIdx) {
		var depth = 0;
		for (var i = openIdx; i < s.length; i++) {
			var ch = s.charAt(i);
			if (ch === '{') depth++;
			else if (ch === '}') {
				depth--;
				if (depth === 0) return i;
			}
		}
		return -1;
	}

	function stripCssCustomWrapper(raw, selector) {
		var s = raw.trim();

		// Only strip a wrapper when the entire content is a SINGLE outer block —
		// i.e. the `{` that opens `%root%` / selector is matched by the very last `}`
		// in the string.  Multi-block content (%root% { … } %root%:hover { … },
		// mixed @media and root blocks, etc.) must be left intact so it round-trips
		// correctly through the editor.
		var prefixes = ['%root%'];
		if (selector) prefixes.push(selector);

		for (var pi = 0; pi < prefixes.length; pi++) {
			var prefix = prefixes[pi];
			var escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			var re = new RegExp('^' + escaped + '\\s*\\{');
			var m = s.match(re);
			if (!m) continue;

			var openIdx = m[0].length - 1; // position of the `{`
			var closeIdx = findMatchingClose(s, openIdx);
			if (closeIdx === -1) continue;

			// The matching `}` must be the final non-whitespace char.
			var afterClose = s.slice(closeIdx + 1).trim();
			if (afterClose !== '') continue; // multi-block: leave wrapper in place

			return s.slice(openIdx + 1, closeIdx).trim();
		}

		return s;
	}

	function wrapCssCustom(inner) {
		inner = inner.trim();
		if (!inner) return '';
		// Indent each line by two spaces inside the wrapper
		var indented = inner
			.split('\n')
			.map(function (l) {
				return '  ' + l;
			})
			.join('\n');
		return '%root% {\n' + indented + '\n}';
	}

	// ---------------------------------------------------------------------------
	// settingsToCss — Controls → CSS text
	// ---------------------------------------------------------------------------

	function spacingValueStr(obj, dir) {
		if (!obj || typeof obj !== 'object') return null;
		var num = obj[dir];
		var unit = obj.unit && obj.unit[dir] ? obj.unit[dir] : '';
		if (num === undefined || num === null || num === '') return null;
		if (unit === 'auto') return 'auto';
		if (unit === '-' || unit === 'none') unit = '';
		var numStr = String(num);
		// Don't double-append unit if the value already contains it (e.g. stored as "20px")
		if (unit && numStr.indexOf(unit) !== -1) return numStr;
		return numStr + unit;
	}

	function settingsToCss(settings, ctx) {
		if (!settings) return '';
		var selector = ctx ? ctx.selector : null;
		var lines = [];

		// --- Spacing controls ---
		[
			['_margin', 'margin'],
			['_padding', 'padding'],
		].forEach(function (pair) {
			var key = pair[0];
			var cssprop = pair[1];
			var val = settings[key];
			if (!val || typeof val !== 'object') return;

			var dirs = ['top', 'right', 'bottom', 'left'];
			var values = dirs.map(function (d) {
				return spacingValueStr(val, d);
			});
			var allSet = values.every(function (v) {
				return v !== null;
			});

			if (allSet) {
				// Collapse to shorthand when all four sides are identical
				if (
					values[0] === values[1] &&
					values[1] === values[2] &&
					values[2] === values[3]
				) {
					lines.push(cssprop + ': ' + values[0] + ';');
				} else {
					lines.push(cssprop + ': ' + values.join(' ') + ';');
				}
			} else {
				dirs.forEach(function (d, i) {
					if (values[i] !== null) {
						lines.push(cssprop + '-' + d + ': ' + values[i] + ';');
					}
				});
			}
		});

		// --- Background control (_background.color / image / repeat / position / size / attachment) ---
		var bg = settings['_background'];
		if (bg && typeof bg === 'object') {
			// background-color
			if (bg.color && typeof bg.color === 'object') {
				var bgColorVal = bg.color.raw || bg.color.hex || bg.color.rgb || null;
				if (bgColorVal) {
					lines.push('background-color: ' + bgColorVal + ';');
				}
			}
			// background-image (from Bricks' media picker or external URL)
			if (bg.image && typeof bg.image === 'object' && bg.image.url) {
				lines.push('background-image: url(' + bg.image.url + ');');
			}
			// background-repeat
			if (bg.repeat) {
				lines.push('background-repeat: ' + bg.repeat + ';');
			}
			// background-position  (Bricks: 'custom' uses positionX/positionY)
			if (bg.position) {
				if (bg.position === 'custom') {
					var bpx = bg.positionX || 'center';
					var bpy = bg.positionY || 'center';
					lines.push('background-position: ' + bpx + ' ' + bpy + ';');
				} else {
					lines.push('background-position: ' + bg.position + ';');
				}
			}
			// background-size  (Bricks: 'custom' uses the 'custom' sub-key)
			if (bg.size) {
				if (bg.size === 'custom' && bg.custom) {
					lines.push('background-size: ' + bg.custom + ';');
				} else if (bg.size !== 'custom') {
					lines.push('background-size: ' + bg.size + ';');
				}
			}
			// background-attachment
			if (bg.attachment) {
				lines.push('background-attachment: ' + bg.attachment + ';');
			}
		}

		// --- Typography control (_typography sub-keys) ---
		var typo = settings['_typography'];
		if (typo && typeof typo === 'object') {
			// color is a Bricks color object: extract the CSS-ready string.
			if (typo.color && typeof typo.color === 'object') {
				var typoColorVal =
					typo.color.raw || typo.color.hex || typo.color.rgb || null;
				if (typoColorVal) {
					lines.push('color: ' + typoColorVal + ';');
				}
			}
			[
				'font-size',
				'font-weight',
				'font-style',
				'text-decoration',
				'text-transform',
				'line-height',
				'letter-spacing',
			].forEach(function (prop) {
				var val = typo[prop];
				if (val === undefined || val === null || val === '') return;
				lines.push(prop + ': ' + val + ';');
			});
		}

		// --- Border control (_border: { width, style, color, radius }) ---
		var brd = settings['_border'];
		if (brd && typeof brd === 'object') {
			var bw = brd.width;
			var bs = brd.style || '';
			var bc = brd.color;
			var bColorStr = '';
			if (bc && typeof bc === 'object') {
				bColorStr = bc.raw || bc.hex || bc.rgb || '';
			}

			if (bw && typeof bw === 'object') {
				var bDirs = ['top', 'right', 'bottom', 'left'];
				var bVals = bDirs.map(function (d) {
					return spacingValueStr(bw, d);
				});
				var bAllSet = bVals.every(function (v) {
					return v !== null;
				});
				var bAllSame =
					bAllSet &&
					bVals.every(function (v) {
						return v === bVals[0];
					});

				if (bAllSame) {
					if (bVals[0] === '0') {
						lines.push('border: 0;');
					} else if (bs) {
						// Mirror assets.php: use var(--bricks-border-color) fallback when no color.
						var bFinalColor = bColorStr || 'var(--bricks-border-color)';
						lines.push(
							'border: ' + bVals[0] + ' ' + bs + ' ' + bFinalColor + ';',
						);
					} else {
						lines.push('border-width: ' + bVals[0] + ';');
						if (bColorStr) lines.push('border-color: ' + bColorStr + ';');
					}
				} else {
					// Per-direction
					bDirs.forEach(function (d, i) {
						if (bVals[i] !== null) {
							if (bs && bColorStr) {
								lines.push(
									'border-' +
										d +
										': ' +
										bVals[i] +
										' ' +
										bs +
										' ' +
										bColorStr +
										';',
								);
							} else if (bs) {
								lines.push('border-' + d + ': ' + bVals[i] + ' ' + bs + ';');
							} else {
								lines.push('border-' + d + '-width: ' + bVals[i] + ';');
							}
						}
					});
					if (!bs && bColorStr) lines.push('border-color: ' + bColorStr + ';');
					if (bs && !bAllSet) lines.push('border-style: ' + bs + ';');
				}
			} else if (bs) {
				lines.push('border-style: ' + bs + ';');
				if (bColorStr) lines.push('border-color: ' + bColorStr + ';');
			} else if (bColorStr) {
				lines.push('border-color: ' + bColorStr + ';');
			}

			// Border radius: Bricks stores top→top-left, right→top-right,
			// bottom→bottom-right, left→bottom-left.
			var brad = brd.radius;
			if (brad && typeof brad === 'object') {
				var rDirs = ['top', 'right', 'bottom', 'left'];
				var rVals = rDirs.map(function (d) {
					return spacingValueStr(brad, d);
				});
				var rAllSet = rVals.every(function (v) {
					return v !== null;
				});
				var rAllSame =
					rAllSet &&
					rVals.every(function (v) {
						return v === rVals[0];
					});

				if (rAllSame) {
					lines.push('border-radius: ' + rVals[0] + ';');
				} else if (rAllSet) {
					lines.push('border-radius: ' + rVals.join(' ') + ';');
				} else {
					var rCorners = [
						['top', 'border-top-left-radius'],
						['right', 'border-top-right-radius'],
						['bottom', 'border-bottom-right-radius'],
						['left', 'border-bottom-left-radius'],
					];
					rCorners.forEach(function (pair) {
						var rv = spacingValueStr(brad, pair[0]);
						if (rv !== null) lines.push(pair[1] + ': ' + rv + ';');
					});
				}
			}
		}

		// --- Display + gap (context-aware) + grid layout ---
		var displayVal = settings['_display'];
		if (displayVal !== undefined && displayVal !== null && displayVal !== '') {
			lines.push('display: ' + displayVal + ';');
		}

		// gap: _gridGap for grid context, _gap for flex context.
		// Both can't coexist — emit whichever has a value.
		var isFlexDisp = displayVal === 'flex' || displayVal === 'inline-flex';
		var gapVal = isFlexDisp ? settings['_gap'] : settings['_gridGap'];
		// Fallback: if primary key is empty, try the other (handles unsaved legacy data).
		if (gapVal === undefined || gapVal === null || gapVal === '') {
			gapVal = isFlexDisp ? settings['_gridGap'] : settings['_gap'];
		}
		if (gapVal !== undefined && gapVal !== null && gapVal !== '') {
			lines.push('gap: ' + gapVal + ';');
		}

		// --- Value / number controls ---
		var valuePairs = [
			// Flex / layout (self)
			['align-self', '_alignSelf'],
			['justify-self', '_gridItemJustifySelf'],
			// Flex container
			['flex-direction', '_flexDirection'],
			['flex-wrap', '_flexWrap'],
			['justify-content', '_justifyContent'],
			['align-items', '_alignItems'],
			// Flex item
			['flex-grow', '_flexGrow'],
			['flex-shrink', '_flexShrink'],
			['flex-basis', '_flexBasis'],
			// Sizing
			['width', '_width'],
			['min-width', '_widthMin'],
			['max-width', '_widthMax'],
			['height', '_height'],
			['min-height', '_heightMin'],
			['max-height', '_heightMax'],
			['aspect-ratio', '_aspectRatio'],
			// Gap (column/row — explicit longhands; unified gap handled above)
			['column-gap', '_columnGap'],
			['row-gap', '_rowGap'],
			// Grid layout
			['grid-template-columns', '_gridTemplateColumns'],
			['grid-template-rows', '_gridTemplateRows'],
			['grid-auto-columns', '_gridAutoColumns'],
			['grid-auto-rows', '_gridAutoRows'],
			['grid-auto-flow', '_gridAutoFlow'],
			// Position
			['position', '_position'],
			['top', '_top'],
			['right', '_right'],
			['bottom', '_bottom'],
			['left', '_left'],
			// Other
			['z-index', '_zIndex'],
			['opacity', '_opacity'],
			['order', '_order'],
			['transform-origin', '_transformOrigin'],
		];

		valuePairs.forEach(function (pair) {
			var cssprop = pair[0];
			var settingKey = pair[1];
			var val = settings[settingKey];
			if (val === undefined || val === null || val === '') return;
			lines.push(cssprop + ': ' + val + ';');
		});

		// Sort the canonical-order mapped lines by the user's typed order (if known
		// for this context).  Custom CSS is appended as a trailing block AFTER the
		// sort so it always lives at the bottom, never interleaved with declarations.
		if (ctx) {
			var ctxKey = ctx.type + ':' + ctx.id;
			var typedOrder = typedOrderByContext[ctxKey];
			if (typedOrder && typedOrder.length > 0) {
				lines = sortLinesByOrder(lines, typedOrder);
			}
		}

		// --- Custom CSS (unwrapped inner content) ---
		var custom = settings['_cssCustom'];
		if (custom && typeof custom === 'string' && custom.trim()) {
			var inner = stripCssCustomWrapper(custom, selector);
			if (inner) {
				lines.push(inner);
			}
		}

		return lines.join('\n');
	}

	// ---------------------------------------------------------------------------
	// cssToSettings — CSS text → Controls
	// ---------------------------------------------------------------------------

	function parseValueWithUnit(v) {
		v = v.trim();
		if (v === 'auto') return { num: '', unit: 'auto' };
		// CSS variable, calc(), min(), max(), clamp() — store whole value; empty unit so
		// Bricks controls don't append any suffix (unit '-' gets rendered literally by Bricks).
		if (/^var\(|^calc\(|^min\(|^max\(|^clamp\(/.test(v)) {
			return { num: v, unit: '' };
		}
		var m = v.match(/^(-?[\d.]+)([a-z%]*)$/i);
		if (m) return { num: m[1], unit: m[2] || 'px' };
		// Unknown format (e.g. custom identifiers) — store as-is, empty unit
		return { num: v, unit: '' };
	}

	// Build a full Bricks spacing object from four raw CSS values.
	function buildSpacingObj(t, r, b, l) {
		var obj = { unit: {} };
		[
			['top', t],
			['right', r],
			['bottom', b],
			['left', l],
		].forEach(function (pair) {
			var dir = pair[0],
				rawVal = pair[1];
			var parsed = parseValueWithUnit(rawVal);
			obj[dir] = parsed.unit === 'auto' ? '' : parsed.num;
			obj.unit[dir] = parsed.unit;
		});
		return obj;
	}

	/**
	 * Build a Bricks color object from a raw CSS color string.
	 * Stores hex values as { hex } and everything else as { raw }.
	 */
	function makeBricksColor(cssVal) {
		cssVal = cssVal.trim();
		if (/^#[0-9a-fA-F]{3,8}$/.test(cssVal)) {
			return { hex: cssVal };
		}
		return { raw: cssVal };
	}

	/**
	 * Parse a CSS border shorthand value (e.g. "1px solid red") into its parts.
	 * Returns { width: string|null, style: string|null, color: string|null }.
	 */
	function parseBorderShorthand(val) {
		var STYLES = [
			'none',
			'hidden',
			'dotted',
			'dashed',
			'solid',
			'double',
			'groove',
			'ridge',
			'inset',
			'outset',
		];
		var result = { width: null, style: null, color: null };
		val
			.trim()
			.split(/\s+/)
			.forEach(function (p) {
				if (STYLES.indexOf(p.toLowerCase()) !== -1) {
					result.style = p.toLowerCase();
				} else if (/^[\d.]/.test(p) || /^(thin|medium|thick)$/.test(p)) {
					result.width = p;
				} else if (p) {
					result.color = p;
				}
			});
		return result;
	}

	/**
	 * Parse a CSS background shorthand value into its component parts.
	 * Returns { image, repeat, position, size, attachment, color } — any may be null.
	 * image is a Bricks-compatible { url } object; the rest are plain strings.
	 *
	 * Handles the most common cases:
	 *   background: url(...) no-repeat center
	 *   background: url(...) center/cover
	 *   background: #fff
	 *   background: url(...) no-repeat center / cover fixed rgba(0,0,0,.5)
	 */
	function parseBackgroundShorthand(val) {
		var result = {
			image: null,
			repeat: null,
			position: null,
			size: null,
			attachment: null,
			color: null,
		};
		var remaining = val.trim();

		// Extract url(...)  — handle single/double/no quotes inside
		var urlRe = /url\((['"]?)([^)]*)\1\)/;
		var urlMatch = remaining.match(urlRe);
		if (urlMatch) {
			result.image = { url: urlMatch[2] };
			remaining = remaining
				.replace(urlMatch[0], '')
				.replace(/\s+/g, ' ')
				.trim();
		}

		var REPEATS = [
			'no-repeat',
			'repeat-x',
			'repeat-y',
			'space',
			'round',
			'repeat',
		];
		var ATTACHMENTS = ['fixed', 'scroll', 'local'];
		var POSITIONS = ['top', 'right', 'bottom', 'left', 'center'];

		var parts = remaining.split(/\s+/).filter(Boolean);
		var positionParts = [];
		var i = 0;

		while (i < parts.length) {
			var p = parts[i];
			var pl = p.toLowerCase();

			// 'none' as image (explicit no-image)
			if (pl === 'none' && result.image === null) {
				result.image = { url: '' };
				i++;
				continue;
			}

			// position / size  — slash separates them, e.g. "center / cover" or "50% 50% / cover"
			if (p === '/') {
				// Everything before was position; next token is size
				if (i + 1 < parts.length) {
					result.size = parts[i + 1];
					i += 2;
				} else {
					i++;
				}
				continue;
			}

			// Repeat keywords
			if (REPEATS.indexOf(pl) !== -1) {
				result.repeat = pl;
				i++;
				continue;
			}

			// Attachment keywords
			if (ATTACHMENTS.indexOf(pl) !== -1) {
				result.attachment = pl;
				i++;
				continue;
			}

			// Size keywords (unambiguous)
			if (pl === 'cover' || pl === 'contain') {
				result.size = pl;
				i++;
				continue;
			}

			// Position keywords and length values
			if (
				POSITIONS.indexOf(pl) !== -1 ||
				/^-?[\d.]/.test(p) ||
				p.slice(-1) === '%'
			) {
				// Peek ahead: if followed by '/', the next token after '/' is size
				if (parts[i + 1] === '/') {
					positionParts.push(p);
					result.size = parts[i + 2] || null;
					i += 3;
					continue;
				}
				positionParts.push(p);
				i++;
				continue;
			}

			// Anything else: treat as color
			if (p) result.color = p;
			i++;
		}

		if (positionParts.length > 0) {
			result.position = positionParts.join(' ');
		}

		return result;
	}

	/**
	 * Write a value back to a _background sub-key, preserving Bricks' "custom"
	 * format for position and size so existing Background controls round-trip.
	 *
	 *   position:  keyword values (left/right/top/bottom/center, alone or paired)
	 *              → stored as a plain string (Bricks' built-in option).
	 *              Anything containing a length/percentage (or any number)
	 *              → position='custom' + positionX + positionY.
	 *   size:      'cover' / 'contain' / 'auto' → plain string.
	 *              anything else → size='custom' + custom: <value>.
	 *   other:     stored as a plain string.
	 */
	function assignBgSub(bgObj, sub, val) {
		if (sub === 'position') {
			var trimmedVal = String(val).trim();
			var POS_KEYWORDS = /^(top|right|bottom|left|center)$/i;
			var parts = trimmedVal.split(/\s+/);
			var allKeywords =
				parts.length > 0 &&
				parts.length <= 2 &&
				parts.every(function (p) {
					return POS_KEYWORDS.test(p);
				});
			if (allKeywords) {
				bgObj.position = trimmedVal.toLowerCase();
				delete bgObj.positionX;
				delete bgObj.positionY;
			} else {
				bgObj.position = 'custom';
				bgObj.positionX = parts[0] || 'center';
				bgObj.positionY = parts[1] || parts[0] || 'center';
			}
			return;
		}

		if (sub === 'size') {
			var sizeVal = String(val).trim().toLowerCase();
			if (sizeVal === 'cover' || sizeVal === 'contain' || sizeVal === 'auto') {
				bgObj.size = sizeVal;
				delete bgObj.custom;
			} else {
				bgObj.size = 'custom';
				bgObj.custom = String(val).trim();
			}
			return;
		}

		bgObj[sub] = val;
	}

	function cssToSettings(cssText) {
		var mappable = {};
		var spacingPatches = []; // { key, dir, num, unit } — surgical per-direction updates
		var typographyPatches = []; // { sub, val }            — surgical _typography sub-key updates
		var borderPatches = []; // { sub, val }            — surgical _border sub-key updates
		var unmappedLines = [];
		var typedOrder = []; // CSS property names in the order the user typed them
		var typedSeen = {};

		var lines = cssText.split('\n');

		// Brace depth tracks whether we are currently inside a nested block such as
		// @media, @supports, &:hover, etc.  Anything inside such a block must NOT be
		// promoted to root Bricks settings — declarations there belong to the nested
		// context and must stay in _cssCustom verbatim.
		var depth = 0;

		lines.forEach(function (line) {
			var trimmed = line.trim();

			// Skip blank lines and comments.
			if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*'))
				return;

			// Count braces on this line to update depth AFTER processing.
			// `opens`/`closes` are counted on the original line (string brace count).
			var opens = (trimmed.match(/\{/g) || []).length;
			var closes = (trimmed.match(/\}/g) || []).length;
			var depthBefore = depth;
			depth += opens - closes;
			if (depth < 0) depth = 0; // resilient to malformed input

			// Inside a nested block, or on lines that open/close one — keep verbatim.
			if (depthBefore > 0 || opens > 0 || closes > 0) {
				unmappedLines.push(trimmed);
				return;
			}

			var m = trimmed.match(/^([\w-]+)\s*:\s*(.+?)\s*;?\s*$/);
			if (!m) {
				// Non-declaration lines (stray text, multi-value blocks, etc.) → custom CSS.
				unmappedLines.push(trimmed);
				return;
			}

			var prop = m[1].toLowerCase();
			var val = m[2].trim();
			var entry = PROP_MAP[prop];

			if (!entry) {
				unmappedLines.push(trimmed);
				return;
			} // always unmapped, regardless of block

			// Record the typed order for mapped properties so settingsToCss can
			// preserve it on the next render.  Deduplicated so repeated properties
			// keep their first-seen position.
			if (!typedSeen[prop]) {
				typedSeen[prop] = true;
				typedOrder.push(prop);
			}

			if (entry.type === 'value') {
				mappable[entry.key] = val;
			} else if (entry.type === 'number') {
				// parseFloat returns NaN for CSS variables, 'auto', and other non-numeric
				// values that can't live in a Bricks numeric control. Route those to
				// _cssCustom instead of writing NaN into the setting.
				var numParsed = parseFloat(val);
				if (isNaN(numParsed)) {
					unmappedLines.push(trimmed);
					return;
				}
				mappable[entry.key] = numParsed;
			} else if (entry.type === 'spacing') {
				// Shorthand: always produces a full 4-direction object, no corruption risk.
				var parts = val.split(/\s+/);
				var t, r, b, l;
				if (parts.length === 1) {
					t = r = b = l = parts[0];
				} else if (parts.length === 2) {
					t = b = parts[0];
					r = l = parts[1];
				} else if (parts.length === 3) {
					t = parts[0];
					r = l = parts[1];
					b = parts[2];
				} else {
					t = parts[0];
					r = parts[1];
					b = parts[2];
					l = parts[3];
				}
				mappable[entry.key] = buildSpacingObj(t, r, b, l);
			} else if (entry.type === 'spacing-dir') {
				// Longhand: record a surgical patch so we only touch this one direction.
				var parsed = parseValueWithUnit(val);
				spacingPatches.push({
					key: entry.key,
					dir: entry.dir,
					num: parsed.unit === 'auto' ? '' : parsed.num,
					unit: parsed.unit,
				});
			} else if (entry.type === 'bg-color') {
				// Store as a Bricks color object inside _background.
				if (
					!mappable['_background'] ||
					typeof mappable['_background'] !== 'object'
				) {
					mappable['_background'] = {};
				}
				mappable['_background'].color = makeBricksColor(val);
			} else if (entry.type === 'bg-image') {
				// background-image: url(...)  →  _background.image = { url }
				if (
					!mappable['_background'] ||
					typeof mappable['_background'] !== 'object'
				) {
					mappable['_background'] = {};
				}
				var imgRe = /url\((['"]?)([^)]*)\1\)/;
				var imgM = val.match(imgRe);
				if (imgM) {
					mappable['_background'].image = { url: imgM[2] };
				} else if (val.toLowerCase() === 'none') {
					mappable['_background'].image = { url: '' };
				}
			} else if (entry.type === 'bg-sub') {
				// background-repeat / background-position / background-size / background-attachment
				if (
					!mappable['_background'] ||
					typeof mappable['_background'] !== 'object'
				) {
					mappable['_background'] = {};
				}
				assignBgSub(mappable['_background'], entry.sub, val);
			} else if (entry.type === 'bg-shorthand') {
				// background: url(...) no-repeat center / cover  etc.
				if (
					!mappable['_background'] ||
					typeof mappable['_background'] !== 'object'
				) {
					mappable['_background'] = {};
				}
				var bgParsed = parseBackgroundShorthand(val);
				var bgObjM = mappable['_background'];
				if (bgParsed.image !== null) bgObjM.image = bgParsed.image;
				if (bgParsed.repeat !== null) bgObjM.repeat = bgParsed.repeat;
				if (bgParsed.position !== null)
					assignBgSub(bgObjM, 'position', bgParsed.position);
				if (bgParsed.size !== null) assignBgSub(bgObjM, 'size', bgParsed.size);
				if (bgParsed.attachment !== null)
					bgObjM.attachment = bgParsed.attachment;
				if (bgParsed.color !== null)
					bgObjM.color = makeBricksColor(bgParsed.color);
			} else if (entry.type === 'typography') {
				// Normalize font-weight keywords → numeric strings (Bricks stores numbers).
				if (entry.sub === 'font-weight') {
					var FW_MAP = {
						thin: '100',
						hairline: '100',
						'extra-light': '200',
						ultralight: '200',
						'ultra-light': '200',
						light: '300',
						normal: '400',
						regular: '400',
						medium: '500',
						'semi-bold': '600',
						semibold: '600',
						'demi-bold': '600',
						demibold: '600',
						bold: '700',
						'extra-bold': '800',
						extrabold: '800',
						'ultra-bold': '800',
						ultrabold: '800',
						black: '900',
						heavy: '900',
					};
					val = FW_MAP[val.toLowerCase()] || val;
				}
				// color is a Bricks color object; other sub-keys are plain strings.
				var typoVal =
					entry.sub === 'color' ? makeBricksColor(val) : val;
				typographyPatches.push({ sub: entry.sub, val: typoVal });
			} else if (entry.type === 'border') {
				// Surgical patch on a sub-key of the _border object.
				borderPatches.push({ sub: entry.sub, val: val });
			}
		});

		if (unmappedLines.length > 0) {
			mappable['_cssCustom'] = wrapCssCustom(unmappedLines.join('\n'));
		} else {
			mappable['_cssCustom'] = '';
		}

		return {
			mappable: mappable,
			spacingPatches: spacingPatches,
			typographyPatches: typographyPatches,
			borderPatches: borderPatches,
			typedOrder: typedOrder,
		};
	}

	// ---------------------------------------------------------------------------
	// Panel DOM references (set in createPanel)
	// ---------------------------------------------------------------------------

	var panel = null;
	var textarea = null;
	var selectorEl = null;
	var badge = null;
	var applyBtn = null;

	// ---------------------------------------------------------------------------
	// createPanel — build panel HTML once and wire events
	// ---------------------------------------------------------------------------

	function createPanel() {
		panel = document.createElement('div');
		panel.id = PANEL_ID;
		if (localStorage.getItem(STORAGE_KEY) === '1') {
			panel.classList.add('blcss-collapsed');
		}

		panel.innerHTML = [
			'<div class="blcss-header">',
			'  <span class="blcss-title">CSS</span>',
			'  <span class="blcss-selector"></span>',
			'  <span class="blcss-toggle-icon">&#9662;</span>',
			'</div>',
			'<div class="blcss-body">',
			'  <textarea class="blcss-textarea" spellcheck="false" autocomplete="off"></textarea>',
			'  <div class="blcss-footer">',
			'    <span class="blcss-context-badge">element</span>',
			'    <button class="blcss-apply-btn">Apply</button>',
			'  </div>',
			'</div>',
		].join('');

		textarea = panel.querySelector('.blcss-textarea');
		selectorEl = panel.querySelector('.blcss-selector');
		badge = panel.querySelector('.blcss-context-badge');
		applyBtn = panel.querySelector('.blcss-apply-btn');

		if (AUTO_APPLY) {
			applyBtn.style.display = 'none';
		}

		// Toggle collapse on header click
		panel.querySelector('.blcss-header').addEventListener('click', function () {
			panel.classList.toggle('blcss-collapsed');
			localStorage.setItem(
				STORAGE_KEY,
				panel.classList.contains('blcss-collapsed') ? '1' : '0',
			);
		});

		// Mark dirty on any textarea input; schedule auto-apply when enabled.
		textarea.addEventListener('input', function () {
			state.dirty = true;
			panel.classList.add('blcss-dirty');

			if (AUTO_APPLY) {
				clearTimeout(state.autoApplyTimer);
				state.autoApplyTimer = setTimeout(function () {
					if (state.dirty && !state.applying) {
						applyCSS();
					}
				}, AUTO_APPLY_MS);
			}
		});

		// Stop click/keydown inside the panel from bubbling to Bricks
		panel.addEventListener('click', function (e) {
			e.stopPropagation();
		});

		// Apply on button click
		applyBtn.addEventListener('click', applyCSS);

		// Ctrl/Cmd+Enter in textarea also applies
		textarea.addEventListener('keydown', function (e) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
				e.preventDefault();
				applyCSS();
			}
		});

		return panel;
	}

	function injectPanel() {
		if (document.getElementById(PANEL_ID)) return;
		var structure = document.querySelector('#bricks-structure');
		if (!structure) return;
		structure.appendChild(createPanel());
	}

	// ---------------------------------------------------------------------------
	// updatePanel — refresh the display from current Vue state
	// ---------------------------------------------------------------------------

	function updatePanel() {
		if (state.applying) return;
		if (!panel) return;

		var vueState = getVueState();
		if (!vueState) return;

		var ctx = getContext(vueState);
		if (!ctx) {
			panel.style.display = 'none';
			return;
		}
		panel.style.display = '';

		var contextKey = ctx.type + ':' + ctx.id;
		var contextChanged = contextKey !== state.lastContextKey;
		state.lastContextKey = contextKey;

		// Update selector label
		selectorEl.textContent = ctx.selector;

		// Update context badge
		badge.textContent = ctx.type === 'class' ? 'class' : 'ID';
		badge.classList.toggle('blcss-class-context', ctx.type === 'class');

		// Refresh textarea only when context changed or no unsaved edits
		if (contextChanged || !state.dirty) {
			textarea.value = settingsToCss(ctx.settings, ctx);
			state.dirty = false;
			panel.classList.remove('blcss-dirty');
		}
	}

	// ---------------------------------------------------------------------------
	// applyCSS — write CSS back into Bricks settings
	// ---------------------------------------------------------------------------

	function applyCSS() {
		var vueState = getVueState();
		if (!vueState) return;

		var ctx = getContext(vueState);
		if (!ctx) return;

		var gp = getGP();
		if (!gp) return;

		var hasUpdateSetting = typeof gp.$_updateSetting === 'function';
		var hasRerenderElementId = typeof gp.$_rerenderElementId === 'function';
		var hasForceRender = typeof gp.$_forceRender === 'function';
		var hasRerenderControls = typeof gp.$_rerenderControls === 'function';

		var result = cssToSettings(textarea.value);
		var liveSettings = ctx.settings; // live Vue reactive proxy
		var isClassCtx = ctx.type === 'class';

		// Remember the order the user just typed so the next render preserves it.
		typedOrderByContext[ctx.type + ':' + ctx.id] = result.typedOrder;

		// Remap _gridGap → _gap when the element's display is flex/inline-flex.
		// PROP_MAP routes 'gap' and 'grid-gap' → _gridGap by default (grid key);
		// flex elements store gap under _gap instead.
		if ('_gridGap' in result.mappable) {
			var curDisp = liveSettings['_display'] || '';
			if (curDisp === 'flex' || curDisp === 'inline-flex') {
				result.mappable['_gap'] = result.mappable['_gridGap'];
				delete result.mappable['_gridGap'];
			}
		}

		// Pre-compute which _background sub-keys were mentioned in the typed CSS.
		// Used below to clear any sub-keys that were absent.
		var bgMentioned = {
			color: false,
			image: false,
			repeat: false,
			position: false,
			size: false,
			attachment: false,
		};
		if (
			'_background' in result.mappable &&
			result.mappable['_background'] &&
			typeof result.mappable['_background'] === 'object'
		) {
			var bgM = result.mappable['_background'];
			if (bgM.color !== undefined) bgMentioned.color = true;
			if (bgM.image !== undefined) bgMentioned.image = true;
			if (bgM.repeat !== undefined) bgMentioned.repeat = true;
			if (bgM.position !== undefined || bgM.positionX !== undefined)
				bgMentioned.position = true;
			if (bgM.size !== undefined || bgM.custom !== undefined)
				bgMentioned.size = true;
			if (bgM.attachment !== undefined) bgMentioned.attachment = true;
		}

		state.applying = true;
		applyBtn.disabled = true;

		// Helper: write or delete one setting key.
		// For element context we prefer $_updateSetting (handles internal side-effects).
		// For class context $_updateSetting expects an element ID and silently no-ops,
		// so we always mutate the reactive proxy directly instead.
		function writeSetting(key, writeVal) {
			if (!isClassCtx && hasUpdateSetting) {
				gp.$_updateSetting(ctx.id, key, writeVal);
			} else {
				if (writeVal === null) {
					delete liveSettings[key];
				} else {
					liveSettings[key] = writeVal;
				}
			}
		}

		// --- 1. Write full-object mappable settings ---
		Object.keys(result.mappable).forEach(function (settingKey) {
			var val = result.mappable[settingKey];

			// Class context: Bricks stores _cssCustom with the actual class selector
			// (not %root%) because the canvas CSS pipeline never replaces %root% for
			// global classes. Replace the placeholder before writing.
			if (
				isClassCtx &&
				settingKey === '_cssCustom' &&
				val &&
				typeof val === 'string'
			) {
				val = val.replaceAll('%root%', ctx.selector);
			}

			// _background is handled as a complete unit after the main loop so that
			// $_updateSetting is called once for the entire object, triggering Bricks'
			// CSS re-generation pipeline (sub-key mutations bypass that pipeline).
			if (settingKey === '_background') return;

			// _cssCustom: write '' (not null) to avoid null.replaceAll() errors in the
			// iframe's $_updateSetting handler. An empty string is falsy in settingsToCss
			// so the custom block never re-appears in the textarea.
			var writeVal =
				val === '' || val === null
					? settingKey === '_cssCustom'
						? ''
						: null
					: val;
			writeSetting(settingKey, writeVal);
		});

		// --- _background: compute final object, then write once via writeSetting ---
		//
		// All _background sub-key work (merge-in + clear-absent) is done here so that
		// writeSetting / $_updateSetting is called exactly once for the full object.
		// Direct sub-key mutations bypass Bricks' CSS-generation pipeline, which is why
		// deleted background-image settings would not re-render the canvas without a reload.
		var bgExists = !!(
			liveSettings['_background'] &&
			typeof liveSettings['_background'] === 'object'
		);
		if ('_background' in result.mappable || bgExists) {
			// Start from the existing live object (shallow copy).
			var finalBg = {};
			if (bgExists) {
				var existingBg = liveSettings['_background'];
				Object.keys(existingBg).forEach(function (k) {
					finalBg[k] = existingBg[k];
				});
			}
			// Merge in sub-keys from the newly parsed CSS.
			if (
				'_background' in result.mappable &&
				result.mappable['_background'] &&
				typeof result.mappable['_background'] === 'object'
			) {
				Object.keys(result.mappable['_background']).forEach(function (k) {
					finalBg[k] = result.mappable['_background'][k];
				});
			}
			// Remove sub-keys absent from the typed CSS.
			if (!bgMentioned.color) delete finalBg.color;
			if (!bgMentioned.image) delete finalBg.image;
			if (!bgMentioned.repeat) delete finalBg.repeat;
			if (!bgMentioned.position) {
				delete finalBg.position;
				delete finalBg.positionX;
				delete finalBg.positionY;
			}
			if (!bgMentioned.size) {
				delete finalBg.size;
				delete finalBg.custom;
			}
			if (!bgMentioned.attachment) delete finalBg.attachment;
			// Write the final object (or null) — routes through $_updateSetting for element
			// context, which triggers Bricks' internal CSS re-generation.
			writeSetting(
				'_background',
				Object.keys(finalBg).length > 0 ? finalBg : null,
			);
		}

		// --- 2. Apply spacing longhands as surgical per-direction patches ---
		// Always mutate the reactive proxy directly (surgical; $_updateSetting would
		// replace the whole object, destroying untouched directions).
		if (result.spacingPatches.length > 0) {
			result.spacingPatches.forEach(function (patch) {
				if (
					!liveSettings[patch.key] ||
					typeof liveSettings[patch.key] !== 'object'
				) {
					liveSettings[patch.key] = {
						top: '',
						right: '',
						bottom: '',
						left: '',
						unit: { top: '', right: '', bottom: '', left: '' },
					};
				}
				var so = liveSettings[patch.key];
				if (!so.unit || typeof so.unit !== 'object') {
					so.unit = { top: '', right: '', bottom: '', left: '' };
				}
				so[patch.dir] = patch.num;
				so.unit[patch.dir] = patch.unit;
			});
		}

		// --- 3. Typography patches — surgical _typography sub-key updates ---
		//
		// Run whenever there are new patches OR when _typography already exists.
		// The outer guard previously skipped clearing when all typography lines were
		// deleted (typographyPatches empty), causing removed properties to reappear.
		var typoExists =
			!!(
				liveSettings['_typography'] &&
				typeof liveSettings['_typography'] === 'object'
			);

		if (result.typographyPatches.length > 0 || typoExists) {
			// Create the object only when we have new values to write.
			if (
				result.typographyPatches.length > 0 &&
				(!liveSettings['_typography'] ||
					typeof liveSettings['_typography'] !== 'object')
			) {
				liveSettings['_typography'] = {};
			}

			var typoObj = liveSettings['_typography'];

			if (typoObj && typeof typoObj === 'object') {
				// Apply new patch values.
				result.typographyPatches.forEach(function (patch) {
					typoObj[patch.sub] = patch.val;
				});

				// Clear PROP_MAP-tracked sub-keys absent from the typed CSS.
				var TYPO_MAPPED = [
					'color',
					'font-size',
					'font-weight',
					'font-style',
					'text-decoration',
					'text-transform',
					'line-height',
					'letter-spacing',
				];
				TYPO_MAPPED.forEach(function (sub) {
					var wasMentioned = result.typographyPatches.some(function (p) {
						return p.sub === sub;
					});
					if (wasMentioned) return;
					if (typoObj[sub] === undefined || typoObj[sub] === '') return;
					delete typoObj[sub];
				});

				// If all keys are gone, remove the object entirely.
				if (Object.keys(typoObj).length === 0) {
					writeSetting('_typography', null);
				}
			}
		}

		// --- 3b. Border patches — surgical _border updates, and clear absent sub-aspects ---
		//
		// Track which of the four logical aspects were mentioned in the typed CSS.
		// Any aspect not mentioned gets its sub-key deleted from _border.
		// If nothing was mentioned and _border existed, remove it entirely.
		var brdMentioned = {
			width: false,
			style: false,
			color: false,
			radius: false,
		};
		var brdExists = !!(
			liveSettings['_border'] && typeof liveSettings['_border'] === 'object'
		);

		if (result.borderPatches.length > 0) {
			if (
				!liveSettings['_border'] ||
				typeof liveSettings['_border'] !== 'object'
			) {
				liveSettings['_border'] = {};
			}
			var brdObj = liveSettings['_border'];

			result.borderPatches.forEach(function (patch) {
				var sub = patch.sub;
				var bVal = patch.val;

				if (sub === 'style') {
					brdMentioned.style = true;
					brdObj.style = bVal;
				} else if (sub === 'color') {
					brdMentioned.color = true;
					brdObj.color = makeBricksColor(bVal);
				} else if (sub === 'width') {
					brdMentioned.width = true;
					var wParts = bVal.split(/\s+/);
					var wt, wr, wb, wl;
					if (wParts.length === 1) {
						wt = wr = wb = wl = wParts[0];
					} else if (wParts.length === 2) {
						wt = wb = wParts[0];
						wr = wl = wParts[1];
					} else if (wParts.length === 3) {
						wt = wParts[0];
						wr = wl = wParts[1];
						wb = wParts[2];
					} else {
						wt = wParts[0];
						wr = wParts[1];
						wb = wParts[2];
						wl = wParts[3];
					}
					brdObj.width = buildSpacingObj(wt, wr, wb, wl);
				} else if (sub.slice(0, 6) === 'width-') {
					brdMentioned.width = true;
					var wDir = sub.slice(6);
					if (!brdObj.width || typeof brdObj.width !== 'object') {
						brdObj.width = {
							top: '',
							right: '',
							bottom: '',
							left: '',
							unit: { top: '', right: '', bottom: '', left: '' },
						};
					}
					var wParsed = parseValueWithUnit(bVal);
					brdObj.width[wDir] = wParsed.unit === 'auto' ? '' : wParsed.num;
					if (!brdObj.width.unit || typeof brdObj.width.unit !== 'object')
						brdObj.width.unit = {};
					brdObj.width.unit[wDir] = wParsed.unit;
				} else if (sub === 'radius') {
					brdMentioned.radius = true;
					var rParts = bVal.split(/\s+/);
					var rt, rr, rb2, rl;
					if (rParts.length === 1) {
						rt = rr = rb2 = rl = rParts[0];
					} else if (rParts.length === 2) {
						rt = rb2 = rParts[0];
						rr = rl = rParts[1];
					} else if (rParts.length === 3) {
						rt = rParts[0];
						rr = rl = rParts[1];
						rb2 = rParts[2];
					} else {
						rt = rParts[0];
						rr = rParts[1];
						rb2 = rParts[2];
						rl = rParts[3];
					}
					brdObj.radius = buildSpacingObj(rt, rr, rb2, rl);
				} else if (sub.slice(0, 7) === 'radius-') {
					brdMentioned.radius = true;
					var rDir = sub.slice(7);
					if (!brdObj.radius || typeof brdObj.radius !== 'object') {
						brdObj.radius = {
							top: '',
							right: '',
							bottom: '',
							left: '',
							unit: { top: '', right: '', bottom: '', left: '' },
						};
					}
					var rParsed = parseValueWithUnit(bVal);
					brdObj.radius[rDir] = rParsed.unit === 'auto' ? '' : rParsed.num;
					if (!brdObj.radius.unit || typeof brdObj.radius.unit !== 'object')
						brdObj.radius.unit = {};
					brdObj.radius.unit[rDir] = rParsed.unit;
				} else if (sub === 'shorthand' || sub.slice(0, 5) === 'side-') {
					// border: or border-top: — touches width, style, and color.
					brdMentioned.width = brdMentioned.style = brdMentioned.color = true;
					var sDir = sub.slice(0, 5) === 'side-' ? sub.slice(5) : null;
					var bParsed = parseBorderShorthand(bVal);
					if (bParsed.width) {
						var sParsed = parseValueWithUnit(bParsed.width);
						if (sDir) {
							if (!brdObj.width || typeof brdObj.width !== 'object') {
								brdObj.width = {
									top: '',
									right: '',
									bottom: '',
									left: '',
									unit: { top: '', right: '', bottom: '', left: '' },
								};
							}
							brdObj.width[sDir] = sParsed.unit === 'auto' ? '' : sParsed.num;
							if (!brdObj.width.unit) brdObj.width.unit = {};
							brdObj.width.unit[sDir] = sParsed.unit;
						} else {
							brdObj.width = buildSpacingObj(
								bParsed.width,
								bParsed.width,
								bParsed.width,
								bParsed.width,
							);
						}
					}
					if (bParsed.style) brdObj.style = bParsed.style;
					if (bParsed.color) brdObj.color = makeBricksColor(bParsed.color);
				}
			});
		}

		// Clear any _border sub-aspect that was not mentioned in the typed CSS.
		// If _border existed before and now nothing is mentioned, remove it entirely.
		if (brdExists || result.borderPatches.length > 0) {
			var brdObj2 = liveSettings['_border'];
			if (brdObj2 && typeof brdObj2 === 'object') {
				if (!brdMentioned.width && brdObj2.width !== undefined)
					delete brdObj2.width;
				if (!brdMentioned.style && brdObj2.style !== undefined)
					delete brdObj2.style;
				if (!brdMentioned.color && brdObj2.color !== undefined)
					delete brdObj2.color;
				if (!brdMentioned.radius && brdObj2.radius !== undefined)
					delete brdObj2.radius;
				if (Object.keys(brdObj2).length === 0) {
					writeSetting('_border', null);
				}
			}
		}

		// For class context all writes go through direct proxy mutation, bypassing
		// $_updateSetting which would normally call $_rerenderControls() internally.
		// Call it once here after all mutations are done so the controls panel refreshes.
		// (For element context with spacing/typography/border patches we also need it.)
		if (
			hasRerenderControls &&
			(isClassCtx ||
				result.spacingPatches.length > 0 ||
				result.typographyPatches.length > 0 ||
				result.borderPatches.length > 0)
		) {
			gp.$_rerenderControls();
		}

		// --- 4. Clear spacing keys completely absent from the typed CSS ---
		var SPACING_KEYS = ['_margin', '_padding'];
		SPACING_KEYS.forEach(function (spKey) {
			var wasMentioned =
				spKey in result.mappable ||
				result.spacingPatches.some(function (p) {
					return p.key === spKey;
				});
			if (wasMentioned) return;
			var existed =
				liveSettings[spKey] && typeof liveSettings[spKey] === 'object';
			if (!existed) return;
			writeSetting(spKey, null);
		});

		// --- 4b. Clear value/number keys absent from the typed CSS ---
		SIMPLE_SETTING_KEYS.forEach(function (key) {
			if (key in result.mappable) return; // was present → already written
			var cur = liveSettings[key];
			if (cur === undefined || cur === null || cur === '') return; // nothing to clear
			writeSetting(key, null);
		});

		// _gap (flex gap) shares the 'gap' CSS property with _gridGap but is not in
		// PROP_MAP, so it is not caught by SIMPLE_SETTING_KEYS. Clear it explicitly
		// when neither _gridGap nor _gap was mentioned in the typed CSS.
		var gapWasMentioned =
			'_gridGap' in result.mappable || '_gap' in result.mappable;
		if (!gapWasMentioned) {
			var curFlexGap = liveSettings['_gap'];
			if (
				curFlexGap !== undefined &&
				curFlexGap !== null &&
				curFlexGap !== ''
			) {
				writeSetting('_gap', null);
			}
		}

		// --- 5. Trigger canvas CSS re-render ---
		if (isClassCtx) {
			// Setting rerenderClassNames to a new timestamp is how Bricks signals the
			// canvas iframe to regenerate and inject the CSS stylesheet for global classes.
			// $_forceRender only re-renders Vue component trees, not class stylesheets.
			var vueStateForRender = getVueState();
			if (vueStateForRender) {
				vueStateForRender.rerenderClassNames = Date.now();
			}
			if (hasForceRender) {
				gp.$_forceRender(100);
			}
		} else {
			// Element context: re-render just this element, then force a full repaint.
			if (hasRerenderElementId) {
				gp.$_rerenderElementId(ctx.id);
			}
			if (hasForceRender) {
				gp.$_forceRender(100);
			}
		}

		state.dirty = false;
		panel.classList.remove('blcss-dirty');

		setTimeout(function () {
			state.applying = false;
			applyBtn.disabled = false;
			updatePanel();
		}, 200);
	}

	// ---------------------------------------------------------------------------
	// MutationObserver — detect element/control changes and refresh panel
	// ---------------------------------------------------------------------------

	function startObserver(panelInner) {
		var observer = new MutationObserver(function (mutations) {
			// Skip while we are writing settings
			if (state.applying) return;
			// Skip mutations inside our own panel (textarea resizing, etc.)
			var isSelf = mutations.some(function (m) {
				return panel && panel.contains(m.target);
			});
			if (isSelf) return;
			Promise.resolve().then(updatePanel);
		});

		observer.observe(panelInner, { subtree: true, childList: true });
	}

	// ---------------------------------------------------------------------------
	// Initialisation
	// ---------------------------------------------------------------------------

	function init() {
		var panelInner = document.querySelector('#bricks-panel-inner');
		var structure = document.querySelector('#bricks-structure');
		if (!panelInner || !structure) {
			setTimeout(init, 200);
			return;
		}

		injectPanel();
		updatePanel();
		startObserver(panelInner); // still watch the left panel for selection changes
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
