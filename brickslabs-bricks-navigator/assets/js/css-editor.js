(() => {
	// ---------------------------------------------------------------------------
	// Constants
	// ---------------------------------------------------------------------------

	const STORAGE_KEY = 'blcss_collapsed';
	const PANEL_ID    = 'blcss-editor-panel';

	// ---------------------------------------------------------------------------
	// Property map: CSS property → Bricks settings key + type
	// ---------------------------------------------------------------------------

	const PROP_MAP = {
		// Spacing shorthands
		margin:  { key: '_margin',  type: 'spacing' },
		padding: { key: '_padding', type: 'spacing' },
		// Spacing longhands
		'margin-top':    { key: '_margin',  type: 'spacing-dir', dir: 'top'    },
		'margin-right':  { key: '_margin',  type: 'spacing-dir', dir: 'right'  },
		'margin-bottom': { key: '_margin',  type: 'spacing-dir', dir: 'bottom' },
		'margin-left':   { key: '_margin',  type: 'spacing-dir', dir: 'left'   },
		'padding-top':    { key: '_padding', type: 'spacing-dir', dir: 'top'    },
		'padding-right':  { key: '_padding', type: 'spacing-dir', dir: 'right'  },
		'padding-bottom': { key: '_padding', type: 'spacing-dir', dir: 'bottom' },
		'padding-left':   { key: '_padding', type: 'spacing-dir', dir: 'left'   },
		// Display
		display: { key: '_display', type: 'value' },
		// Flex / layout (self)
		'align-self':   { key: '_alignSelf',            type: 'value' },
		'justify-self': { key: '_gridItemJustifySelf',   type: 'value' },
		// Flex container
		'flex-direction':  { key: '_flexDirection',  type: 'value' },
		'flex-wrap':       { key: '_flexWrap',       type: 'value' },
		'justify-content': { key: '_justifyContent', type: 'value' },
		'align-items':     { key: '_alignItems',     type: 'value' },
		// Flex item
		'flex-grow':   { key: '_flexGrow',   type: 'number' },
		'flex-shrink': { key: '_flexShrink', type: 'number' },
		'flex-basis':  { key: '_flexBasis',  type: 'value'  },
		// Sizing
		width:      { key: '_width',    type: 'value' },
		'min-width':  { key: '_widthMin', type: 'value' },
		'max-width':  { key: '_widthMax', type: 'value' },
		height:     { key: '_height',   type: 'value' },
		'min-height': { key: '_heightMin', type: 'value' },
		'max-height': { key: '_heightMax', type: 'value' },
		'aspect-ratio': { key: '_aspectRatio', type: 'value' },
		// Gap
		gap:      { key: '_gridGap',   type: 'value' },
		'grid-gap':   { key: '_gridGap',   type: 'value' },
		'column-gap': { key: '_columnGap', type: 'value' },
		'row-gap':    { key: '_rowGap',    type: 'value' },
		// Grid layout
		'grid-template-columns': { key: '_gridTemplateColumns', type: 'value' },
		'grid-template-rows':    { key: '_gridTemplateRows',    type: 'value' },
		'grid-auto-columns':     { key: '_gridAutoColumns',     type: 'value' },
		'grid-auto-rows':        { key: '_gridAutoRows',        type: 'value' },
		'grid-auto-flow':        { key: '_gridAutoFlow',        type: 'value' },
		// Position
		position: { key: '_position', type: 'value' },
		top:      { key: '_top',      type: 'value' },
		right:    { key: '_right',    type: 'value' },
		bottom:   { key: '_bottom',   type: 'value' },
		left:     { key: '_left',     type: 'value' },
		// Numeric
		'z-index': { key: '_zIndex',   type: 'number' },
		opacity:   { key: '_opacity',  type: 'number' },
		order:     { key: '_order',    type: 'number' },
		// Transform
		'transform-origin': { key: '_transformOrigin', type: 'value' },
		// Background
		background:            { key: '_background', type: 'bg-shorthand' },
		'background-color':    { key: '_background', type: 'bg-color'    },
		'background-image':    { key: '_background', type: 'bg-image'    },
		'background-repeat':   { key: '_background', type: 'bg-sub', sub: 'repeat'     },
		'background-position': { key: '_background', type: 'bg-sub', sub: 'position'   },
		'background-size':     { key: '_background', type: 'bg-sub', sub: 'size'       },
		'background-attachment': { key: '_background', type: 'bg-sub', sub: 'attachment' },
		// Typography
		color:             { key: '_typography', type: 'typography', sub: 'color'           },
		'font-size':       { key: '_typography', type: 'typography', sub: 'font-size'       },
		'font-weight':     { key: '_typography', type: 'typography', sub: 'font-weight'     },
		'font-style':      { key: '_typography', type: 'typography', sub: 'font-style'      },
		'text-decoration': { key: '_typography', type: 'typography', sub: 'text-decoration' },
		'text-transform':  { key: '_typography', type: 'typography', sub: 'text-transform'  },
		'line-height':     { key: '_typography', type: 'typography', sub: 'line-height'     },
		'letter-spacing':  { key: '_typography', type: 'typography', sub: 'letter-spacing'  },
		// Border
		border:                    { key: '_border', type: 'border', sub: 'shorthand'    },
		'border-top':              { key: '_border', type: 'border', sub: 'side-top'     },
		'border-right':            { key: '_border', type: 'border', sub: 'side-right'   },
		'border-bottom':           { key: '_border', type: 'border', sub: 'side-bottom'  },
		'border-left':             { key: '_border', type: 'border', sub: 'side-left'    },
		'border-width':            { key: '_border', type: 'border', sub: 'width'        },
		'border-top-width':        { key: '_border', type: 'border', sub: 'width-top'    },
		'border-right-width':      { key: '_border', type: 'border', sub: 'width-right'  },
		'border-bottom-width':     { key: '_border', type: 'border', sub: 'width-bottom' },
		'border-left-width':       { key: '_border', type: 'border', sub: 'width-left'   },
		'border-style':            { key: '_border', type: 'border', sub: 'style'        },
		'border-color':            { key: '_border', type: 'border', sub: 'color'        },
		'border-radius':           { key: '_border', type: 'border', sub: 'radius'       },
		'border-top-left-radius':     { key: '_border', type: 'border', sub: 'radius-top'    },
		'border-top-right-radius':    { key: '_border', type: 'border', sub: 'radius-right'  },
		'border-bottom-right-radius': { key: '_border', type: 'border', sub: 'radius-bottom' },
		'border-bottom-left-radius':  { key: '_border', type: 'border', sub: 'radius-left'   },
	};

	// Unique Bricks setting keys for 'value' and 'number' entries — used to clear absent keys.
	const SIMPLE_SETTING_KEYS = [...new Set(
		Object.values(PROP_MAP)
			.filter(({ type }) => type === 'value' || type === 'number')
			.map(({ key }) => key),
	)];

	// ---------------------------------------------------------------------------
	// Config (injected by wp_localize_script as window.blCssEditorConfig)
	// ---------------------------------------------------------------------------

	const CONFIG      = typeof blCssEditorConfig !== 'undefined' ? blCssEditorConfig : {};
	const AUTO_APPLY  = !!CONFIG.autoApply;
	const AUTO_APPLY_MS = 800;

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	const state = {
		applying: false,
		lastContextKey: null,
		dirty: false,
		autoApplyTimer: null,
	};

	// Per-context typed CSS property order — session-only.
	const typedOrderByContext = {};

	/**
	 * Sort a list of canonical CSS-line strings to follow a user-typed property order.
	 */
	const sortLinesByOrder = (lines, order) => {
		if (!order?.length) return lines;
		const orderMap = Object.fromEntries(order.map((prop, i) => [prop, i]));
		const indexForLine = (line) => {
			const m = line.match(/^([\w-]+)\s*:/);
			if (!m) return Infinity;
			const prop = m[1].toLowerCase();
			if (prop in orderMap) return orderMap[prop];
			for (let i = 0; i < order.length; i++) {
				if (prop.startsWith(`${order[i]}-`)) return orderMap[order[i]];
			}
			return Infinity;
		};
		return lines
			.map((line, origIdx) => ({ line, oIdx: indexForLine(line), origIdx }))
			.sort((a, b) => a.oIdx !== b.oIdx ? a.oIdx - b.oIdx : a.origIdx - b.origIdx)
			.map(({ line }) => line);
	};

	// ---------------------------------------------------------------------------
	// Vue helpers
	// ---------------------------------------------------------------------------

	let _gp = null;

	const getGP = () => {
		if (!_gp) {
			const body = document.querySelector('.brx-body');
			if (body?.__vue_app__) _gp = body.__vue_app__.config.globalProperties;
		}
		return _gp;
	};

	const getVueState = () => getGP()?.$_state ?? null;

	// ---------------------------------------------------------------------------
	// Context: element or class scope
	// ---------------------------------------------------------------------------

	const getContext = (vueState) => {
		const ac = vueState.activeClass;
		if (ac && typeof ac === 'object' && ac !== false && ac !== '' && ac.id) {
			const className = ac.name ?? ac.id;
			return { type: 'class', id: ac.id, settings: ac.settings ?? {}, selector: `.${className}` };
		}
		const ae = vueState.activeElement;
		if (ae?.id) {
			const cssId = ae.settings?._cssId ?? null;
			return {
				type: 'element',
				id: ae.id,
				settings: ae.settings ?? {},
				selector: cssId ? `#${cssId}` : `#brxe-${ae.id}`,
			};
		}
		return null;
	};

	// ---------------------------------------------------------------------------
	// _cssCustom helpers
	// ---------------------------------------------------------------------------

	const findMatchingClose = (s, openIdx) => {
		let depth = 0;
		for (let i = openIdx; i < s.length; i++) {
			const ch = s[i];
			if (ch === '{') depth++;
			else if (ch === '}' && --depth === 0) return i;
		}
		return -1;
	};

	const stripCssCustomWrapper = (raw, selector) => {
		const s = raw.trim();
		const prefixes = ['%root%'];
		if (selector) prefixes.push(selector);

		for (const prefix of prefixes) {
			const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const re = new RegExp(`^${escaped}\\s*\\{`);
			const m = s.match(re);
			if (!m) continue;

			const openIdx  = m[0].length - 1;
			const closeIdx = findMatchingClose(s, openIdx);
			if (closeIdx === -1) continue;
			if (s.slice(closeIdx + 1).trim() !== '') continue;
			return s.slice(openIdx + 1, closeIdx).trim();
		}
		return s;
	};

	const wrapCssCustom = (inner) => {
		inner = inner.trim();
		if (!inner) return '';
		const indented = inner.split('\n').map(l => `  ${l}`).join('\n');
		return `%root% {\n${indented}\n}`;
	};

	// ---------------------------------------------------------------------------
	// settingsToCss — Controls → CSS text
	// ---------------------------------------------------------------------------

	const spacingValueStr = (obj, dir) => {
		if (!obj || typeof obj !== 'object') return null;
		const num  = obj[dir];
		const unit = obj.unit?.[dir] ?? '';
		if (num === undefined || num === null || num === '') return null;
		if (unit === 'auto') return 'auto';
		const unitStr = (unit === '-' || unit === 'none') ? '' : unit;
		const numStr  = String(num);
		return (unitStr && numStr.includes(unitStr)) ? numStr : `${numStr}${unitStr}`;
	};

	const settingsToCss = (settings, ctx) => {
		if (!settings) return '';
		const selector = ctx?.selector ?? null;
		let lines = [];

		// --- Spacing controls ---
		for (const [key, cssprop] of [['_margin', 'margin'], ['_padding', 'padding']]) {
			const val = settings[key];
			if (!val || typeof val !== 'object') continue;

			const dirs   = ['top', 'right', 'bottom', 'left'];
			const values = dirs.map(d => spacingValueStr(val, d));
			const allSet = values.every(v => v !== null);

			if (allSet) {
				if (values.every(v => v === values[0])) {
					lines.push(`${cssprop}: ${values[0]};`);
				} else {
					lines.push(`${cssprop}: ${values.join(' ')};`);
				}
			} else {
				dirs.forEach((d, i) => {
					if (values[i] !== null) lines.push(`${cssprop}-${d}: ${values[i]};`);
				});
			}
		}

		// --- Background control ---
		const bg = settings['_background'];
		if (bg && typeof bg === 'object') {
			if (bg.color && typeof bg.color === 'object') {
				const bgColorVal = bg.color.raw ?? bg.color.hex ?? bg.color.rgb ?? null;
				if (bgColorVal) lines.push(`background-color: ${bgColorVal};`);
			}
			if (bg.image?.url) lines.push(`background-image: url(${bg.image.url});`);
			if (bg.repeat)     lines.push(`background-repeat: ${bg.repeat};`);
			if (bg.position) {
				if (bg.position === 'custom') {
					lines.push(`background-position: ${bg.positionX ?? 'center'} ${bg.positionY ?? 'center'};`);
				} else {
					lines.push(`background-position: ${bg.position};`);
				}
			}
			if (bg.size) {
				if (bg.size === 'custom' && bg.custom) {
					lines.push(`background-size: ${bg.custom};`);
				} else if (bg.size !== 'custom') {
					lines.push(`background-size: ${bg.size};`);
				}
			}
			if (bg.attachment) lines.push(`background-attachment: ${bg.attachment};`);
		}

		// --- Typography control ---
		const typo = settings['_typography'];
		if (typo && typeof typo === 'object') {
			if (typo.color && typeof typo.color === 'object') {
				const typoColorVal = typo.color.raw ?? typo.color.hex ?? typo.color.rgb ?? null;
				if (typoColorVal) lines.push(`color: ${typoColorVal};`);
			}
			for (const prop of ['font-size', 'font-weight', 'font-style', 'text-decoration', 'text-transform', 'line-height', 'letter-spacing']) {
				const val = typo[prop];
				if (val !== undefined && val !== null && val !== '') lines.push(`${prop}: ${val};`);
			}
		}

		// --- Border control ---
		const brd = settings['_border'];
		if (brd && typeof brd === 'object') {
			const bw = brd.width;
			const bs = brd.style ?? '';
			const bc = brd.color;
			const bColorStr = (bc && typeof bc === 'object') ? (bc.raw ?? bc.hex ?? bc.rgb ?? '') : '';

			if (bw && typeof bw === 'object') {
				const bDirs   = ['top', 'right', 'bottom', 'left'];
				const bVals   = bDirs.map(d => spacingValueStr(bw, d));
				const bAllSet = bVals.every(v => v !== null);
				const bAllSame = bAllSet && bVals.every(v => v === bVals[0]);

				if (bAllSame) {
					if (bVals[0] === '0') {
						lines.push('border: 0;');
					} else if (bs) {
						const bFinalColor = bColorStr || 'var(--bricks-border-color)';
						lines.push(`border: ${bVals[0]} ${bs} ${bFinalColor};`);
					} else {
						lines.push(`border-width: ${bVals[0]};`);
						if (bColorStr) lines.push(`border-color: ${bColorStr};`);
					}
				} else {
					bDirs.forEach((d, i) => {
						if (bVals[i] === null) return;
						if (bs && bColorStr) {
							lines.push(`border-${d}: ${bVals[i]} ${bs} ${bColorStr};`);
						} else if (bs) {
							lines.push(`border-${d}: ${bVals[i]} ${bs};`);
						} else {
							lines.push(`border-${d}-width: ${bVals[i]};`);
						}
					});
					if (!bs && bColorStr) lines.push(`border-color: ${bColorStr};`);
					if (bs && !bAllSet)   lines.push(`border-style: ${bs};`);
				}
			} else if (bs) {
				lines.push(`border-style: ${bs};`);
				if (bColorStr) lines.push(`border-color: ${bColorStr};`);
			} else if (bColorStr) {
				lines.push(`border-color: ${bColorStr};`);
			}

			const brad = brd.radius;
			if (brad && typeof brad === 'object') {
				const rDirs    = ['top', 'right', 'bottom', 'left'];
				const rVals    = rDirs.map(d => spacingValueStr(brad, d));
				const rAllSet  = rVals.every(v => v !== null);
				const rAllSame = rAllSet && rVals.every(v => v === rVals[0]);

				if (rAllSame) {
					lines.push(`border-radius: ${rVals[0]};`);
				} else if (rAllSet) {
					lines.push(`border-radius: ${rVals.join(' ')};`);
				} else {
					const rCorners = [
						['top',    'border-top-left-radius'],
						['right',  'border-top-right-radius'],
						['bottom', 'border-bottom-right-radius'],
						['left',   'border-bottom-left-radius'],
					];
					for (const [dir, prop] of rCorners) {
						const rv = spacingValueStr(brad, dir);
						if (rv !== null) lines.push(`${prop}: ${rv};`);
					}
				}
			}
		}

		// --- Display + gap + grid layout ---
		const displayVal = settings['_display'];
		if (displayVal !== undefined && displayVal !== null && displayVal !== '') {
			lines.push(`display: ${displayVal};`);
		}

		const isFlexDisp = displayVal === 'flex' || displayVal === 'inline-flex';
		let gapVal = isFlexDisp ? settings['_gap'] : settings['_gridGap'];
		if (gapVal === undefined || gapVal === null || gapVal === '') {
			gapVal = isFlexDisp ? settings['_gridGap'] : settings['_gap'];
		}
		if (gapVal !== undefined && gapVal !== null && gapVal !== '') {
			lines.push(`gap: ${gapVal};`);
		}

		// --- Value / number controls ---
		const valuePairs = [
			['align-self',             '_alignSelf'],
			['justify-self',           '_gridItemJustifySelf'],
			['flex-direction',         '_flexDirection'],
			['flex-wrap',              '_flexWrap'],
			['justify-content',        '_justifyContent'],
			['align-items',            '_alignItems'],
			['flex-grow',              '_flexGrow'],
			['flex-shrink',            '_flexShrink'],
			['flex-basis',             '_flexBasis'],
			['width',                  '_width'],
			['min-width',              '_widthMin'],
			['max-width',              '_widthMax'],
			['height',                 '_height'],
			['min-height',             '_heightMin'],
			['max-height',             '_heightMax'],
			['aspect-ratio',           '_aspectRatio'],
			['column-gap',             '_columnGap'],
			['row-gap',                '_rowGap'],
			['grid-template-columns',  '_gridTemplateColumns'],
			['grid-template-rows',     '_gridTemplateRows'],
			['grid-auto-columns',      '_gridAutoColumns'],
			['grid-auto-rows',         '_gridAutoRows'],
			['grid-auto-flow',         '_gridAutoFlow'],
			['position',               '_position'],
			['top',                    '_top'],
			['right',                  '_right'],
			['bottom',                 '_bottom'],
			['left',                   '_left'],
			['z-index',                '_zIndex'],
			['opacity',                '_opacity'],
			['order',                  '_order'],
			['transform-origin',       '_transformOrigin'],
		];

		for (const [cssprop, settingKey] of valuePairs) {
			const val = settings[settingKey];
			if (val === undefined || val === null || val === '') continue;
			lines.push(`${cssprop}: ${val};`);
		}

		if (ctx) {
			const ctxKey     = `${ctx.type}:${ctx.id}`;
			const typedOrder = typedOrderByContext[ctxKey];
			if (typedOrder?.length) lines = sortLinesByOrder(lines, typedOrder);
		}

		// --- Custom CSS ---
		const custom = settings['_cssCustom'];
		if (custom && typeof custom === 'string' && custom.trim()) {
			const inner = stripCssCustomWrapper(custom, selector);
			if (inner) lines.push(inner);
		}

		return lines.join('\n');
	};

	// ---------------------------------------------------------------------------
	// cssToSettings — CSS text → Controls
	// ---------------------------------------------------------------------------

	const parseValueWithUnit = (v) => {
		v = v.trim();
		if (v === 'auto') return { num: '', unit: 'auto' };
		if (/^var\(|^calc\(|^min\(|^max\(|^clamp\(/.test(v)) return { num: v, unit: '' };
		const m = v.match(/^(-?[\d.]+)([a-z%]*)$/i);
		if (m) return { num: m[1], unit: m[2] || 'px' };
		return { num: v, unit: '' };
	};

	const buildSpacingObj = (t, r, b, l) => {
		const obj = { unit: {} };
		for (const [dir, rawVal] of [['top', t], ['right', r], ['bottom', b], ['left', l]]) {
			const parsed = parseValueWithUnit(rawVal);
			obj[dir]      = parsed.unit === 'auto' ? '' : parsed.num;
			obj.unit[dir] = parsed.unit;
		}
		return obj;
	};

	const makeBricksColor = (cssVal) => {
		cssVal = cssVal.trim();
		return /^#[0-9a-fA-F]{3,8}$/.test(cssVal) ? { hex: cssVal } : { raw: cssVal };
	};

	const parseBorderShorthand = (val) => {
		const STYLES = ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'];
		const result = { width: null, style: null, color: null };
		for (const p of val.trim().split(/\s+/)) {
			if (STYLES.includes(p.toLowerCase())) {
				result.style = p.toLowerCase();
			} else if (/^[\d.]/.test(p) || /^(thin|medium|thick)$/.test(p)) {
				result.width = p;
			} else if (p) {
				result.color = p;
			}
		}
		return result;
	};

	const parseBackgroundShorthand = (val) => {
		const result = { image: null, repeat: null, position: null, size: null, attachment: null, color: null };
		let remaining = val.trim();

		const urlRe    = /url\((['"]?)([^)]*)\1\)/;
		const urlMatch = remaining.match(urlRe);
		if (urlMatch) {
			result.image = { url: urlMatch[2] };
			remaining = remaining.replace(urlMatch[0], '').replace(/\s+/g, ' ').trim();
		}

		const REPEATS     = ['no-repeat', 'repeat-x', 'repeat-y', 'space', 'round', 'repeat'];
		const ATTACHMENTS = ['fixed', 'scroll', 'local'];
		const POSITIONS   = ['top', 'right', 'bottom', 'left', 'center'];

		const parts        = remaining.split(/\s+/).filter(Boolean);
		const positionParts = [];
		let i = 0;

		while (i < parts.length) {
			const p  = parts[i];
			const pl = p.toLowerCase();

			if (pl === 'none' && result.image === null) { result.image = { url: '' }; i++; continue; }

			if (p === '/') {
				if (i + 1 < parts.length) { result.size = parts[i + 1]; i += 2; } else { i++; }
				continue;
			}

			if (REPEATS.includes(pl))     { result.repeat = pl; i++; continue; }
			if (ATTACHMENTS.includes(pl)) { result.attachment = pl; i++; continue; }

			if (pl === 'cover' || pl === 'contain') { result.size = pl; i++; continue; }

			if (POSITIONS.includes(pl) || /^-?[\d.]/.test(p) || p.slice(-1) === '%') {
				if (parts[i + 1] === '/') {
					positionParts.push(p);
					result.size = parts[i + 2] ?? null;
					i += 3;
					continue;
				}
				positionParts.push(p);
				i++;
				continue;
			}

			if (p) result.color = p;
			i++;
		}

		if (positionParts.length > 0) result.position = positionParts.join(' ');
		return result;
	};

	const assignBgSub = (bgObj, sub, val) => {
		if (sub === 'position') {
			const POS_KEYWORDS = /^(top|right|bottom|left|center)$/i;
			const parts        = String(val).trim().split(/\s+/);
			const allKeywords  = parts.length > 0 && parts.length <= 2 && parts.every(p => POS_KEYWORDS.test(p));
			if (allKeywords) {
				bgObj.position = String(val).trim().toLowerCase();
				delete bgObj.positionX;
				delete bgObj.positionY;
			} else {
				bgObj.position  = 'custom';
				bgObj.positionX = parts[0] ?? 'center';
				bgObj.positionY = parts[1] ?? parts[0] ?? 'center';
			}
			return;
		}
		if (sub === 'size') {
			const sizeVal = String(val).trim().toLowerCase();
			if (sizeVal === 'cover' || sizeVal === 'contain' || sizeVal === 'auto') {
				bgObj.size = sizeVal;
				delete bgObj.custom;
			} else {
				bgObj.size   = 'custom';
				bgObj.custom = String(val).trim();
			}
			return;
		}
		bgObj[sub] = val;
	};

	const cssToSettings = (cssText) => {
		const mappable            = {};
		const spacingPatches      = [];
		const typographyPatches   = [];
		const borderPatches       = [];
		const unmappedLines       = [];
		const typedOrder          = [];
		const typedSeen           = {};

		const lines = cssText.split('\n');
		let depth   = 0;

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

			const opens  = (trimmed.match(/\{/g) ?? []).length;
			const closes = (trimmed.match(/\}/g) ?? []).length;
			const depthBefore = depth;
			depth += opens - closes;
			if (depth < 0) depth = 0;

			if (depthBefore > 0 || opens > 0 || closes > 0) { unmappedLines.push(trimmed); continue; }

			const m = trimmed.match(/^([\w-]+)\s*:\s*(.+?)\s*;?\s*$/);
			if (!m) { unmappedLines.push(trimmed); continue; }

			const prop  = m[1].toLowerCase();
			const val   = m[2].trim();
			const entry = PROP_MAP[prop];

			if (!entry) { unmappedLines.push(trimmed); continue; }

			if (!typedSeen[prop]) { typedSeen[prop] = true; typedOrder.push(prop); }

			if (entry.type === 'value') {
				mappable[entry.key] = val;
			} else if (entry.type === 'number') {
				const numParsed = parseFloat(val);
				if (isNaN(numParsed)) { unmappedLines.push(trimmed); continue; }
				mappable[entry.key] = numParsed;
			} else if (entry.type === 'spacing') {
				const parts = val.split(/\s+/);
				let t, r, b, l;
				if (parts.length === 1)      { t = r = b = l = parts[0]; }
				else if (parts.length === 2) { t = b = parts[0]; r = l = parts[1]; }
				else if (parts.length === 3) { t = parts[0]; r = l = parts[1]; b = parts[2]; }
				else                         { t = parts[0]; r = parts[1]; b = parts[2]; l = parts[3]; }
				mappable[entry.key] = buildSpacingObj(t, r, b, l);
			} else if (entry.type === 'spacing-dir') {
				const parsed = parseValueWithUnit(val);
				spacingPatches.push({ key: entry.key, dir: entry.dir, num: parsed.unit === 'auto' ? '' : parsed.num, unit: parsed.unit });
			} else if (entry.type === 'bg-color') {
				if (!mappable['_background'] || typeof mappable['_background'] !== 'object') mappable['_background'] = {};
				mappable['_background'].color = makeBricksColor(val);
			} else if (entry.type === 'bg-image') {
				if (!mappable['_background'] || typeof mappable['_background'] !== 'object') mappable['_background'] = {};
				const imgM = val.match(/url\((['"]?)([^)]*)\1\)/);
				if (imgM) {
					mappable['_background'].image = { url: imgM[2] };
				} else if (val.toLowerCase() === 'none') {
					mappable['_background'].image = { url: '' };
				}
			} else if (entry.type === 'bg-sub') {
				if (!mappable['_background'] || typeof mappable['_background'] !== 'object') mappable['_background'] = {};
				assignBgSub(mappable['_background'], entry.sub, val);
			} else if (entry.type === 'bg-shorthand') {
				if (!mappable['_background'] || typeof mappable['_background'] !== 'object') mappable['_background'] = {};
				const bgParsed = parseBackgroundShorthand(val);
				const bgObjM   = mappable['_background'];
				if (bgParsed.image    !== null) bgObjM.image = bgParsed.image;
				if (bgParsed.repeat   !== null) bgObjM.repeat = bgParsed.repeat;
				if (bgParsed.position !== null) assignBgSub(bgObjM, 'position', bgParsed.position);
				if (bgParsed.size     !== null) assignBgSub(bgObjM, 'size', bgParsed.size);
				if (bgParsed.attachment !== null) bgObjM.attachment = bgParsed.attachment;
				if (bgParsed.color    !== null) bgObjM.color = makeBricksColor(bgParsed.color);
			} else if (entry.type === 'typography') {
				let typoVal = val;
				if (entry.sub === 'font-weight') {
					const FW_MAP = {
						thin: '100', hairline: '100', 'extra-light': '200', ultralight: '200',
						'ultra-light': '200', light: '300', normal: '400', regular: '400',
						medium: '500', 'semi-bold': '600', semibold: '600', 'demi-bold': '600',
						demibold: '600', bold: '700', 'extra-bold': '800', extrabold: '800',
						'ultra-bold': '800', ultrabold: '800', black: '900', heavy: '900',
					};
					typoVal = FW_MAP[val.toLowerCase()] ?? val;
				}
				typographyPatches.push({ sub: entry.sub, val: entry.sub === 'color' ? makeBricksColor(typoVal) : typoVal });
			} else if (entry.type === 'border') {
				borderPatches.push({ sub: entry.sub, val });
			}
		}

		mappable['_cssCustom'] = unmappedLines.length > 0 ? wrapCssCustom(unmappedLines.join('\n')) : '';

		return { mappable, spacingPatches, typographyPatches, borderPatches, typedOrder };
	};

	// ---------------------------------------------------------------------------
	// Panel DOM references (set in createPanel)
	// ---------------------------------------------------------------------------

	let panel      = null;
	let textarea   = null;
	let selectorEl = null;
	let badge      = null;
	let applyBtn   = null;

	// ---------------------------------------------------------------------------
	// createPanel
	// ---------------------------------------------------------------------------

	const createPanel = () => {
		panel = document.createElement('div');
		panel.id = PANEL_ID;
		if (localStorage.getItem(STORAGE_KEY) === '1') panel.classList.add('blcss-collapsed');

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

		textarea   = panel.querySelector('.blcss-textarea');
		selectorEl = panel.querySelector('.blcss-selector');
		badge      = panel.querySelector('.blcss-context-badge');
		applyBtn   = panel.querySelector('.blcss-apply-btn');

		if (AUTO_APPLY) applyBtn.style.display = 'none';

		panel.querySelector('.blcss-header').addEventListener('click', () => {
			panel.classList.toggle('blcss-collapsed');
			localStorage.setItem(STORAGE_KEY, panel.classList.contains('blcss-collapsed') ? '1' : '0');
		});

		textarea.addEventListener('input', () => {
			state.dirty = true;
			panel.classList.add('blcss-dirty');
			if (AUTO_APPLY) {
				clearTimeout(state.autoApplyTimer);
				state.autoApplyTimer = setTimeout(() => {
					if (state.dirty && !state.applying) applyCSS();
				}, AUTO_APPLY_MS);
			}
		});

		panel.addEventListener('click', (e) => e.stopPropagation());
		applyBtn.addEventListener('click', applyCSS);

		textarea.addEventListener('keydown', (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); applyCSS(); }
		});

		return panel;
	};

	const injectPanel = () => {
		if (document.getElementById(PANEL_ID)) return;
		const structure = document.querySelector('#bricks-structure');
		if (!structure) return;
		structure.appendChild(createPanel());
	};

	// ---------------------------------------------------------------------------
	// updatePanel
	// ---------------------------------------------------------------------------

	const updatePanel = () => {
		if (state.applying || !panel) return;

		const vueState = getVueState();
		if (!vueState) return;

		const ctx = getContext(vueState);
		if (!ctx) { panel.style.display = 'none'; return; }
		panel.style.display = '';

		const contextKey     = `${ctx.type}:${ctx.id}`;
		const contextChanged = contextKey !== state.lastContextKey;
		state.lastContextKey = contextKey;

		selectorEl.textContent = ctx.selector;
		badge.textContent = ctx.type === 'class' ? 'class' : 'ID';
		badge.classList.toggle('blcss-class-context', ctx.type === 'class');

		if (contextChanged || !state.dirty) {
			textarea.value = settingsToCss(ctx.settings, ctx);
			state.dirty = false;
			panel.classList.remove('blcss-dirty');
		}
	};

	// ---------------------------------------------------------------------------
	// applyCSS
	// ---------------------------------------------------------------------------

	const applyCSS = () => {
		const vueState = getVueState();
		if (!vueState) return;

		const ctx = getContext(vueState);
		if (!ctx) return;

		const gp = getGP();
		if (!gp) return;

		const hasUpdateSetting    = typeof gp.$_updateSetting === 'function';
		const hasRerenderElementId = typeof gp.$_rerenderElementId === 'function';
		const hasForceRender      = typeof gp.$_forceRender === 'function';
		const hasRerenderControls = typeof gp.$_rerenderControls === 'function';

		const result       = cssToSettings(textarea.value);
		const liveSettings = ctx.settings;
		const isClassCtx   = ctx.type === 'class';

		typedOrderByContext[`${ctx.type}:${ctx.id}`] = result.typedOrder;

		// Remap _gridGap → _gap for flex elements.
		if ('_gridGap' in result.mappable) {
			const curDisp = liveSettings['_display'] ?? '';
			if (curDisp === 'flex' || curDisp === 'inline-flex') {
				result.mappable['_gap'] = result.mappable['_gridGap'];
				delete result.mappable['_gridGap'];
			}
		}

		const bgMentioned = { color: false, image: false, repeat: false, position: false, size: false, attachment: false };
		if ('_background' in result.mappable && result.mappable['_background'] && typeof result.mappable['_background'] === 'object') {
			const bgM = result.mappable['_background'];
			if (bgM.color     !== undefined) bgMentioned.color      = true;
			if (bgM.image     !== undefined) bgMentioned.image      = true;
			if (bgM.repeat    !== undefined) bgMentioned.repeat     = true;
			if (bgM.position  !== undefined || bgM.positionX !== undefined) bgMentioned.position = true;
			if (bgM.size      !== undefined || bgM.custom    !== undefined) bgMentioned.size     = true;
			if (bgM.attachment !== undefined) bgMentioned.attachment = true;
		}

		state.applying   = true;
		applyBtn.disabled = true;

		const writeSetting = (key, writeVal) => {
			if (!isClassCtx && hasUpdateSetting) {
				gp.$_updateSetting(ctx.id, key, writeVal);
			} else {
				if (writeVal === null) { delete liveSettings[key]; }
				else                  { liveSettings[key] = writeVal; }
			}
		};

		// --- 1. Write full-object mappable settings ---
		for (const settingKey of Object.keys(result.mappable)) {
			let val = result.mappable[settingKey];
			if (isClassCtx && settingKey === '_cssCustom' && val && typeof val === 'string') {
				val = val.replaceAll('%root%', ctx.selector);
			}
			if (settingKey === '_background') continue;
			const writeVal = (val === '' || val === null)
				? (settingKey === '_cssCustom' ? '' : null)
				: val;
			writeSetting(settingKey, writeVal);
		}

		// --- _background: compute final object, then write once ---
		const bgExists = !!(liveSettings['_background'] && typeof liveSettings['_background'] === 'object');
		if ('_background' in result.mappable || bgExists) {
			const finalBg = {};
			if (bgExists) {
				for (const k of Object.keys(liveSettings['_background'])) finalBg[k] = liveSettings['_background'][k];
			}
			if ('_background' in result.mappable && result.mappable['_background'] && typeof result.mappable['_background'] === 'object') {
				for (const k of Object.keys(result.mappable['_background'])) finalBg[k] = result.mappable['_background'][k];
			}
			if (!bgMentioned.color)      delete finalBg.color;
			if (!bgMentioned.image)      delete finalBg.image;
			if (!bgMentioned.repeat)     delete finalBg.repeat;
			if (!bgMentioned.position)   { delete finalBg.position; delete finalBg.positionX; delete finalBg.positionY; }
			if (!bgMentioned.size)       { delete finalBg.size; delete finalBg.custom; }
			if (!bgMentioned.attachment) delete finalBg.attachment;
			writeSetting('_background', Object.keys(finalBg).length > 0 ? finalBg : null);
		}

		// --- 2. Spacing longhands — surgical per-direction patches ---
		for (const patch of result.spacingPatches) {
			if (!liveSettings[patch.key] || typeof liveSettings[patch.key] !== 'object') {
				liveSettings[patch.key] = { top: '', right: '', bottom: '', left: '', unit: { top: '', right: '', bottom: '', left: '' } };
			}
			const so = liveSettings[patch.key];
			if (!so.unit || typeof so.unit !== 'object') so.unit = { top: '', right: '', bottom: '', left: '' };
			so[patch.dir]      = patch.num;
			so.unit[patch.dir] = patch.unit;
		}

		// --- 3. Typography patches ---
		const typoExists = !!(liveSettings['_typography'] && typeof liveSettings['_typography'] === 'object');
		if (result.typographyPatches.length > 0 || typoExists) {
			if (result.typographyPatches.length > 0 && (!liveSettings['_typography'] || typeof liveSettings['_typography'] !== 'object')) {
				liveSettings['_typography'] = {};
			}
			const typoObj = liveSettings['_typography'];
			if (typoObj && typeof typoObj === 'object') {
				for (const patch of result.typographyPatches) typoObj[patch.sub] = patch.val;
				const TYPO_MAPPED = ['color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-transform', 'line-height', 'letter-spacing'];
				for (const sub of TYPO_MAPPED) {
					if (result.typographyPatches.some(p => p.sub === sub)) continue;
					if (typoObj[sub] === undefined || typoObj[sub] === '') continue;
					delete typoObj[sub];
				}
				if (Object.keys(typoObj).length === 0) writeSetting('_typography', null);
			}
		}

		// --- 3b. Border patches ---
		const brdMentioned = { width: false, style: false, color: false, radius: false };
		const brdExists    = !!(liveSettings['_border'] && typeof liveSettings['_border'] === 'object');

		if (result.borderPatches.length > 0) {
			if (!liveSettings['_border'] || typeof liveSettings['_border'] !== 'object') liveSettings['_border'] = {};
			const brdObj = liveSettings['_border'];

			for (const { sub, val: bVal } of result.borderPatches) {
				if (sub === 'style') {
					brdMentioned.style = true;
					brdObj.style = bVal;
				} else if (sub === 'color') {
					brdMentioned.color = true;
					brdObj.color = makeBricksColor(bVal);
				} else if (sub === 'width') {
					brdMentioned.width = true;
					const wParts = bVal.split(/\s+/);
					let wt, wr, wb, wl;
					if (wParts.length === 1)      { wt = wr = wb = wl = wParts[0]; }
					else if (wParts.length === 2) { wt = wb = wParts[0]; wr = wl = wParts[1]; }
					else if (wParts.length === 3) { wt = wParts[0]; wr = wl = wParts[1]; wb = wParts[2]; }
					else                          { wt = wParts[0]; wr = wParts[1]; wb = wParts[2]; wl = wParts[3]; }
					brdObj.width = buildSpacingObj(wt, wr, wb, wl);
				} else if (sub.startsWith('width-')) {
					brdMentioned.width = true;
					const wDir = sub.slice(6);
					if (!brdObj.width || typeof brdObj.width !== 'object') {
						brdObj.width = { top: '', right: '', bottom: '', left: '', unit: { top: '', right: '', bottom: '', left: '' } };
					}
					const wParsed = parseValueWithUnit(bVal);
					brdObj.width[wDir] = wParsed.unit === 'auto' ? '' : wParsed.num;
					if (!brdObj.width.unit || typeof brdObj.width.unit !== 'object') brdObj.width.unit = {};
					brdObj.width.unit[wDir] = wParsed.unit;
				} else if (sub === 'radius') {
					brdMentioned.radius = true;
					const rParts = bVal.split(/\s+/);
					let rt, rr, rb2, rl;
					if (rParts.length === 1)      { rt = rr = rb2 = rl = rParts[0]; }
					else if (rParts.length === 2) { rt = rb2 = rParts[0]; rr = rl = rParts[1]; }
					else if (rParts.length === 3) { rt = rParts[0]; rr = rl = rParts[1]; rb2 = rParts[2]; }
					else                          { rt = rParts[0]; rr = rParts[1]; rb2 = rParts[2]; rl = rParts[3]; }
					brdObj.radius = buildSpacingObj(rt, rr, rb2, rl);
				} else if (sub.startsWith('radius-')) {
					brdMentioned.radius = true;
					const rDir = sub.slice(7);
					if (!brdObj.radius || typeof brdObj.radius !== 'object') {
						brdObj.radius = { top: '', right: '', bottom: '', left: '', unit: { top: '', right: '', bottom: '', left: '' } };
					}
					const rParsed = parseValueWithUnit(bVal);
					brdObj.radius[rDir] = rParsed.unit === 'auto' ? '' : rParsed.num;
					if (!brdObj.radius.unit || typeof brdObj.radius.unit !== 'object') brdObj.radius.unit = {};
					brdObj.radius.unit[rDir] = rParsed.unit;
				} else if (sub === 'shorthand' || sub.startsWith('side-')) {
					brdMentioned.width = brdMentioned.style = brdMentioned.color = true;
					const sDir    = sub.startsWith('side-') ? sub.slice(5) : null;
					const bParsed = parseBorderShorthand(bVal);
					if (bParsed.width) {
						const sParsed = parseValueWithUnit(bParsed.width);
						if (sDir) {
							if (!brdObj.width || typeof brdObj.width !== 'object') {
								brdObj.width = { top: '', right: '', bottom: '', left: '', unit: { top: '', right: '', bottom: '', left: '' } };
							}
							brdObj.width[sDir] = sParsed.unit === 'auto' ? '' : sParsed.num;
							if (!brdObj.width.unit) brdObj.width.unit = {};
							brdObj.width.unit[sDir] = sParsed.unit;
						} else {
							brdObj.width = buildSpacingObj(bParsed.width, bParsed.width, bParsed.width, bParsed.width);
						}
					}
					if (bParsed.style) brdObj.style = bParsed.style;
					if (bParsed.color) brdObj.color = makeBricksColor(bParsed.color);
				}
			}
		}

		if (brdExists || result.borderPatches.length > 0) {
			const brdObj2 = liveSettings['_border'];
			if (brdObj2 && typeof brdObj2 === 'object') {
				if (!brdMentioned.width  && brdObj2.width  !== undefined) delete brdObj2.width;
				if (!brdMentioned.style  && brdObj2.style  !== undefined) delete brdObj2.style;
				if (!brdMentioned.color  && brdObj2.color  !== undefined) delete brdObj2.color;
				if (!brdMentioned.radius && brdObj2.radius !== undefined) delete brdObj2.radius;
				if (Object.keys(brdObj2).length === 0) writeSetting('_border', null);
			}
		}

		if (hasRerenderControls && (isClassCtx || result.spacingPatches.length > 0 || result.typographyPatches.length > 0 || result.borderPatches.length > 0)) {
			gp.$_rerenderControls();
		}

		// --- 4. Clear spacing keys absent from the typed CSS ---
		for (const spKey of ['_margin', '_padding']) {
			const wasMentioned = spKey in result.mappable || result.spacingPatches.some(p => p.key === spKey);
			if (wasMentioned) continue;
			if (!liveSettings[spKey] || typeof liveSettings[spKey] !== 'object') continue;
			writeSetting(spKey, null);
		}

		// --- 4b. Clear value/number keys absent from the typed CSS ---
		for (const key of SIMPLE_SETTING_KEYS) {
			if (key in result.mappable) continue;
			const cur = liveSettings[key];
			if (cur === undefined || cur === null || cur === '') continue;
			writeSetting(key, null);
		}

		const gapWasMentioned = '_gridGap' in result.mappable || '_gap' in result.mappable;
		if (!gapWasMentioned) {
			const curFlexGap = liveSettings['_gap'];
			if (curFlexGap !== undefined && curFlexGap !== null && curFlexGap !== '') writeSetting('_gap', null);
		}

		// --- 5. Trigger canvas CSS re-render ---
		if (isClassCtx) {
			const vueStateForRender = getVueState();
			if (vueStateForRender) vueStateForRender.rerenderClassNames = Date.now();
			if (hasForceRender) gp.$_forceRender(100);
		} else {
			if (hasRerenderElementId) gp.$_rerenderElementId(ctx.id);
			if (hasForceRender) gp.$_forceRender(100);
		}

		state.dirty        = false;
		panel.classList.remove('blcss-dirty');

		setTimeout(() => {
			state.applying    = false;
			applyBtn.disabled = false;
			updatePanel();
		}, 200);
	};

	// ---------------------------------------------------------------------------
	// MutationObserver
	// ---------------------------------------------------------------------------

	const startObserver = (panelInner) => {
		const observer = new MutationObserver((mutations) => {
			if (state.applying) return;
			const isSelf = mutations.some(m => panel?.contains(m.target));
			if (isSelf) return;
			Promise.resolve().then(updatePanel);
		});
		observer.observe(panelInner, { subtree: true, childList: true });
	};

	// ---------------------------------------------------------------------------
	// Initialisation
	// ---------------------------------------------------------------------------

	const init = () => {
		const panelInner = document.querySelector('#bricks-panel-inner');
		const structure  = document.querySelector('#bricks-structure');
		if (!panelInner || !structure) { setTimeout(init, 200); return; }
		injectPanel();
		updatePanel();
		startObserver(panelInner);
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
