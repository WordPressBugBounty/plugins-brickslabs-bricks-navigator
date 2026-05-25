(() => {
	const __ = ( wp && wp.i18n ) ? wp.i18n.__ : function( s ) { return s; };
	const _n = ( wp && wp.i18n ) ? wp.i18n._n : function( s, p, n ) { return n === 1 ? s : p; };
	const sprintf = ( wp && wp.i18n ) ? wp.i18n.sprintf : function( fmt, ...args ) { let i = 0; return fmt.replace( /%[sd]/g, () => args[ i++ ] ?? '' ); };

	const BUTTON_CLASS = 'bl-bem-button';
	const MODAL_CLASS = 'bl-bem-modal';
	const PROCESSED_ATTR = 'data-bl-bem-ready';
	let currentRootId = null;

	// Element-settings keys that are content/behaviour — never copy to a class.
	const NON_STYLE_PREFIXES = [
		'_cssGlobalClasses',
		'_cssId',
		'classConverterComponent',
		'text',
		'content',
		'link',
		'icon',
		'image',
		'src',
		'alt',
		'type',
		'code',
		'label',
		'tag',
		'query',
		'hasLoop',
		'hasStaticLoop',
		'size',
		'ratio',
		'lazy',
		'loading',
		'caption',
		'lightbox',
		'action',
		'fields',
		'submit',
		'redirect',
		'message',
		'validation',
		'items',
		'popup',
		'slides',
		'logo',
		'nav',
		'tabs',
		'accordion',
		'counter',
		'video',
		'audio',
		'map',
		'template',
		'number',
		'svg',
		'divider',
		'table',
		'pricing',
		'social',
		'share',
		'posts',
	];

	const getGP = () => {
		const body = document.querySelector('.brx-body');
		return body?.__vue_app__?.config.globalProperties ?? null;
	};

	const getState = () => getGP()?.$_state ?? null;

	const getElements = () => {
		const gp = getGP();
		if (!gp) return [];
		if (gp.$_dynamicElements?.value) return gp.$_dynamicElements.value;
		const state = gp.$_state;
		if (!state) return [];
		return [...(state.header ?? []), ...(state.content ?? []), ...(state.footer ?? [])];
	};

	const getElementById = (id) => {
		const gp = getGP();
		if (!gp || !id) return null;
		if (typeof gp.$_getDynamicElementById === 'function') return gp.$_getDynamicElementById(id);
		return getElements().find(el => el.id === id) ?? null;
	};

	const getStructureItemFromTarget = (target) =>
		target.closest('#bricks-structure .element[data-id]');

	const cssEscape = (value) =>
		window.CSS?.escape ? CSS.escape(value) : String(value).replace(/"/g, '\\"');

	const getElementLabel = (element) => {
		const node = document.querySelector(
			`#bricks-structure .element[data-id="${cssEscape(element.id)}"]`,
		);
		const titleInput = node?.querySelector('.title input, input.title, .structure-title input');
		const titleText = node?.querySelector('.title, .structure-title, .label');

		let raw;
		if (titleInput?.value) {
			raw = titleInput.value;
		} else if (titleText) {
			const clone = titleText.cloneNode(true);
			clone.querySelectorAll('.brxc-tag-btn-wrapper, .brxc-tag-btn').forEach(el => el.remove());
			raw = clone.textContent;
		} else {
			raw = element.label || element.name || 'element';
		}

		return (
			raw.replace(/\s*(section|container|block|div|heading|text|image)$/i, '').trim() ||
			element.name ||
			'element'
		);
	};

	const slugify = (value) =>
		String(value ?? '')
			.trim()
			.toLowerCase()
			.replace(/&/g, ' and ')
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^[-_]+|[-_]+$/g, '');

	const sanitizeClassName = (value) => slugify(String(value ?? '').replace(/^\.+/, ''));

	const collectTree = (root) => {
		const rows = [];
		const walk = (element, depth) => {
			rows.push({
				id: element.id,
				label: getElementLabel(element),
				name: element.name ?? 'element',
				depth,
				element,
			});
			for (const childId of (element.children ?? [])) {
				const child = getElementById(childId);
				if (child) walk(child, depth + 1);
			}
		};
		walk(root, 0);
		return rows;
	};

	const makeClassMap = (rows, blockName) => {
		const map = {};
		const counts = {};
		rows.forEach((row, index) => {
			if (index === 0) { map[row.id] = blockName; return; }
			const base = `${blockName}__${slugify(row.label) || slugify(row.name) || 'element'}`;
			counts[base] = (counts[base] ?? 0) + 1;
			map[row.id] = counts[base] > 1 ? `${base}-${counts[base]}` : base;
		});
		return map;
	};

	const ensureGlobalClass = (className) => {
		const state = getState();
		const gp = getGP();
		if (!state || !gp || !className) return null;

		const existing = (state.globalClasses ?? []).find(item => item.name === className);
		if (existing) return existing;

		const newClass = {
			id: typeof gp.$_generateId === 'function'
				? gp.$_generateId()
				: `blbem${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
			name: className,
			settings: {},
		};

		if (state.popupFilters?.categories?.[0]) {
			newClass.category = state.popupFilters.categories[0];
		}

		if (typeof gp.$_stopPostMessages === 'function') gp.$_stopPostMessages();
		state.globalClasses.push(newClass);
		if (typeof gp.$_postMessage === 'function') {
			gp.$_postMessage({ key: 'globalClassesNew', value: JSON.stringify([newClass]) });
		}
		return newClass;
	};

	const removeClassFromElement = (element, classId) => {
		const gp = getGP();
		if (!element || !classId) return;
		const classes = Array.isArray(element.settings?._cssGlobalClasses)
			? element.settings._cssGlobalClasses.filter(id => id !== classId)
			: [];
		if (gp && typeof gp.$_updateSetting === 'function') {
			gp.$_updateSetting(element.id, '_cssGlobalClasses', classes);
		} else if (element.settings) {
			element.settings._cssGlobalClasses = classes;
		}
	};

	/**
	 * Copy all CSS-related settings from an element to its new global class,
	 * replacing the element's ID selector with the class name in custom CSS,
	 * then delete those keys from the element so styles live on the class only.
	 */
	const migrateStylesToClass = (element, globalClass) => {
		if (!element?.settings || !globalClass) return;
		if (!globalClass.settings || typeof globalClass.settings !== 'object') {
			globalClass.settings = {};
		}

		const cssId = element.settings._cssId ?? `brxe-${element.id}`;
		const idSel = `#${cssId}`;
		const clsSel = `.${globalClass.name}`;

		for (const key of Object.keys(element.settings)) {
			const baseKey = key.split(':')[0];
			if (NON_STYLE_PREFIXES.includes(baseKey)) continue;
			const value = element.settings[key];
			if (baseKey === '_cssCustom' || baseKey === '_cssCustomSass') {
				globalClass.settings[key] = String(value).split(idSel).join(clsSel);
			} else {
				try {
					globalClass.settings[key] = JSON.parse(JSON.stringify(value));
				} catch (e) {
					globalClass.settings[key] = value;
				}
			}
			delete element.settings[key];
		}
	};

	const addClassToElement = (element, classId) => {
		const gp = getGP();
		if (!element || !classId) return;
		if (!element.settings || typeof element.settings !== 'object') element.settings = {};
		const classes = Array.isArray(element.settings._cssGlobalClasses)
			? element.settings._cssGlobalClasses.slice()
			: [];
		if (!classes.includes(classId)) classes.push(classId);
		if (gp && typeof gp.$_updateSetting === 'function') {
			gp.$_updateSetting(element.id, '_cssGlobalClasses', classes);
		} else {
			element.settings._cssGlobalClasses = classes;
		}
	};

	const rerender = () => {
		const state = getState();
		const gp = getGP();
		if (state) state.rerenderClassNames = Date.now();
		if (typeof gp?.$_rerenderControls === 'function') gp.$_rerenderControls();
		if (typeof gp?.$_forceRender === 'function') gp.$_forceRender(100);
	};

	const showMessage = (text) => {
		const gp = getGP();
		if (typeof gp?.$_showMessage === 'function') gp.$_showMessage(text);
	};

	const escapeHtml = (value) =>
		String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');

	const removeExistingModal = () => document.querySelector(`.${MODAL_CLASS}`)?.remove();

	const closeModal = () => {
		removeExistingModal();
		currentRootId = null;
	};

	const openModal = (rootId) => {
		const root = getElementById(rootId);
		if (!root) return;

		removeExistingModal();
		currentRootId = rootId;

		const rows = collectTree(root);
		const defaultBlock = sanitizeClassName(getElementLabel(root));
		const overlay = document.createElement('div');
		overlay.className = MODAL_CLASS;
		overlay.innerHTML = `
			<div class="bl-bem-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml( __( 'BEM Classes', 'brickslabs-bricks-navigator' ) )}">
				<div class="bl-bem-header">
					<strong>${escapeHtml( __( 'BEM Classes', 'brickslabs-bricks-navigator' ) )}</strong>
					<button type="button" class="bl-bem-close" aria-label="${escapeHtml( __( 'Close', 'brickslabs-bricks-navigator' ) )}">x</button>
				</div>
				<label class="bl-bem-field">
					<span>${escapeHtml( __( 'Block class', 'brickslabs-bricks-navigator' ) )}</span>
					<input type="text" class="bl-bem-input" value="${escapeHtml(defaultBlock)}" placeholder="hero-card">
				</label>
				<div class="bl-bem-list"></div>
				<label class="bl-bem-option">
					<div data-control="checkbox"><input type="checkbox" class="bl-bem-move-styles"></div>
					<span>${escapeHtml( __( 'Move ID styles to classes', 'brickslabs-bricks-navigator' ) )}</span>
				</label>
				<div class="bl-bem-footer">
					<button type="button" class="bl-bem-secondary">${escapeHtml( __( 'Cancel', 'brickslabs-bricks-navigator' ) )}</button>
					<button type="button" class="bl-bem-primary">${escapeHtml( __( 'Assign Classes', 'brickslabs-bricks-navigator' ) )}</button>
				</div>
			</div>`;

		document.body.appendChild(overlay);

		const input = overlay.querySelector('.bl-bem-input');
		const list = overlay.querySelector('.bl-bem-list');

		// Build rows once — checkboxes are never recreated so the browser
		// preserves their checked state across block-name edits.
		const defaultBlockName = sanitizeClassName(input.value);
		const initialClassMap = makeClassMap(rows, defaultBlockName || 'block');
		list.innerHTML = rows.map((row, index) => {
			const isRoot = index === 0;
			return `<label class="bl-bem-row" style="--depth:${row.depth}">
				<div data-control="checkbox"><input type="checkbox" data-id="${escapeHtml(row.id)}" checked></div>
				<span class="bl-bem-row-title">${escapeHtml(row.label)}</span>
				<code>${escapeHtml(initialClassMap[row.id])}</code>
				${isRoot ? `<span class="bl-bem-root">${escapeHtml( __( 'root', 'brickslabs-bricks-navigator' ) )}</span>` : ''}
			</label>`;
		}).join('');

		// Keep .is-excluded on each row in sync with its checkbox.
		list.addEventListener('change', (event) => {
			const cb = event.target;
			if (cb.tagName !== 'INPUT' || cb.type !== 'checkbox') return;
			cb.closest('.bl-bem-row')?.classList.toggle('is-excluded', !cb.checked);
		});

		// On block-name input, only patch the <code> text — never touch checkboxes.
		input.addEventListener('input', () => {
			const blockName = sanitizeClassName(input.value);
			const classMap = makeClassMap(rows, blockName || 'block');
			list.querySelectorAll('.bl-bem-row').forEach(rowEl => {
				const id = rowEl.querySelector('input[type="checkbox"]').dataset.id;
				const code = rowEl.querySelector('code');
				if (code) code.textContent = classMap[id] ?? '';
			});
		});

		overlay.addEventListener('click', (event) => {
			if (
				event.target === overlay ||
				event.target.closest('.bl-bem-close') ||
				event.target.closest('.bl-bem-secondary')
			) {
				closeModal();
			}
		});

		const moveStylesToggle = overlay.querySelector('.bl-bem-move-styles');

		overlay.querySelector('.bl-bem-primary').addEventListener('click', () => {
			const blockName = sanitizeClassName(input.value);
			if (!blockName) { input.focus(); return; }

			const classMap = makeClassMap(rows, blockName);
			const state = getState();
			const moveStyles = moveStylesToggle.checked;
			let assigned = 0;
			let removed = 0;

			list.querySelectorAll('.bl-bem-row').forEach(rowEl => {
				const cb = rowEl.querySelector('input[type="checkbox"]');
				const element = getElementById(cb.dataset.id);
				const className = classMap[cb.dataset.id];
				if (!element || !className) return;

				if (cb.checked) {
					const globalClass = ensureGlobalClass(className);
					if (globalClass) {
						addClassToElement(element, globalClass.id);
						if (moveStyles) migrateStylesToClass(element, globalClass);
						assigned++;
					}
				} else if (state) {
					const existing = (state.globalClasses ?? []).find(item => item.name === className);
					if (existing) { removeClassFromElement(element, existing.id); removed++; }
				}
			});

			rerender();
			closeModal();

			const parts = [];
			if (assigned) parts.push( sprintf( _n( 'assigned to %d element', 'assigned to %d elements', assigned, 'brickslabs-bricks-navigator' ), assigned ) );
			if (removed) parts.push( sprintf( _n( 'removed from %d element', 'removed from %d elements', removed, 'brickslabs-bricks-navigator' ), removed ) );
			const bemMsg = parts.length
				? sprintf( __( 'BEM classes %s', 'brickslabs-bricks-navigator' ), parts.join(', ') )
				: __( 'BEM classes unchanged', 'brickslabs-bricks-navigator' );
			showMessage( bemMsg );
		});

		setTimeout(() => { input.focus(); input.select(); }, 0);
	};

	const injectButtons = () => {
		const structure = document.querySelector('#bricks-structure');
		if (!structure) return;

		structure.querySelectorAll('.element[data-id]').forEach(item => {
			if (item.getAttribute(PROCESSED_ATTR) === '1') return;

			const actions =
				item.querySelector('.actions, .element-actions, .structure-item-actions') ||
				item.querySelector('.title') ||
				item;

			const button = document.createElement('button');
			button.type = 'button';
			button.className = BUTTON_CLASS;
			button.setAttribute('aria-label', __( 'Add BEM classes', 'brickslabs-bricks-navigator' ));
			button.title = __( 'Add BEM classes', 'brickslabs-bricks-navigator' );
			button.innerHTML = '<span aria-hidden="true">B</span>';

			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				const structureItem = getStructureItemFromTarget(event.target);
				if (structureItem?.dataset.id) openModal(structureItem.dataset.id);
			});

			const li = document.createElement('li');
			li.className = 'action';
			li.appendChild(button);
			actions.appendChild(li);
			item.setAttribute(PROCESSED_ATTR, '1');
		});
	};

	let initAttempts = 0;

	const init = () => {
		const structure = document.querySelector('#bricks-structure');
		if (!structure) {
			if (++initAttempts < 25) setTimeout(init, 200);
			return;
		}

		injectButtons();
		new MutationObserver(injectButtons).observe(structure, { childList: true, subtree: true });

		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && currentRootId) closeModal();
		});
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
