(function () {
	'use strict';

	var BUTTON_CLASS = 'bl-bem-button';
	var MODAL_CLASS = 'bl-bem-modal';
	var PROCESSED_ATTR = 'data-bl-bem-ready';
	var currentRootId = null;

	// Element-settings keys that are content/behaviour — never copy to a class.
	var NON_STYLE_PREFIXES = [
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

	function getGP() {
		var body = document.querySelector('.brx-body');
		return body && body.__vue_app__
			? body.__vue_app__.config.globalProperties
			: null;
	}

	function getState() {
		var gp = getGP();
		return gp ? gp.$_state : null;
	}

	function getElements() {
		var gp = getGP();
		if (!gp) return [];
		if (gp.$_dynamicElements && gp.$_dynamicElements.value) {
			return gp.$_dynamicElements.value;
		}
		var state = gp.$_state;
		if (!state) return [];
		return []
			.concat(state.header || [])
			.concat(state.content || [])
			.concat(state.footer || []);
	}

	function getElementById(id) {
		var gp = getGP();
		if (!gp || !id) return null;
		if (typeof gp.$_getDynamicElementById === 'function') {
			return gp.$_getDynamicElementById(id);
		}
		return (
			getElements().find(function (element) {
				return element.id === id;
			}) || null
		);
	}

	function getStructureItemFromTarget(target) {
		return target.closest('#bricks-structure .element[data-id]');
	}

	function getElementLabel(element) {
		var node = document.querySelector(
			'#bricks-structure .element[data-id="' + cssEscape(element.id) + '"]',
		);
		var titleInput = node
			? node.querySelector('.title input, input.title, .structure-title input')
			: null;
		var titleText = node
			? node.querySelector('.title, .structure-title, .label')
			: null;
		var raw =
			(titleInput && titleInput.value) ||
			(titleText && titleText.textContent) ||
			element.label ||
			element.name ||
			'element';

		return (
			raw
				.replace(/\s*(section|container|block|div|heading|text|image)$/i, '')
				.trim() ||
			element.name ||
			'element'
		);
	}

	function cssEscape(value) {
		if (window.CSS && typeof window.CSS.escape === 'function') {
			return window.CSS.escape(value);
		}
		return String(value).replace(/"/g, '\\"');
	}

	function slugify(value) {
		return String(value || '')
			.trim()
			.toLowerCase()
			.replace(/&/g, ' and ')
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^[-_]+|[-_]+$/g, '');
	}

	function sanitizeClassName(value) {
		return slugify(String(value || '').replace(/^\.+/, ''));
	}

	function collectTree(root) {
		var rows = [];

		function walk(element, depth) {
			rows.push({
				id: element.id,
				label: getElementLabel(element),
				name: element.name || 'element',
				depth: depth,
				element: element,
			});

			(element.children || []).forEach(function (childId) {
				var child = getElementById(childId);
				if (child) walk(child, depth + 1);
			});
		}

		walk(root, 0);
		return rows;
	}

	function makeClassMap(rows, blockName) {
		var map = {};
		var counts = {};
		rows.forEach(function (row, index) {
			if (index === 0) {
				map[row.id] = blockName;
				return;
			}

			var base =
				blockName +
				'__' +
				(slugify(row.label) || slugify(row.name) || 'element');
			counts[base] = (counts[base] || 0) + 1;
			map[row.id] = counts[base] > 1 ? base + '-' + counts[base] : base;
		});
		return map;
	}

	function ensureGlobalClass(className) {
		var state = getState();
		var gp = getGP();
		if (!state || !gp || !className) return null;

		var existing = (state.globalClasses || []).find(function (item) {
			return item.name === className;
		});
		if (existing) return existing;

		var newClass = {
			id:
				typeof gp.$_generateId === 'function'
					? gp.$_generateId()
					: 'blbem' +
						Date.now().toString(36) +
						Math.random().toString(36).slice(2, 7),
			name: className,
			settings: {},
		};

		if (
			state.popupFilters &&
			state.popupFilters.categories &&
			state.popupFilters.categories[0]
		) {
			newClass.category = state.popupFilters.categories[0];
		}

		if (typeof gp.$_stopPostMessages === 'function') {
			gp.$_stopPostMessages();
		}

		state.globalClasses.push(newClass);

		if (typeof gp.$_postMessage === 'function') {
			gp.$_postMessage({
				key: 'globalClassesNew',
				value: JSON.stringify([newClass]),
			});
		}

		return newClass;
	}

	function removeClassFromElement(element, classId) {
		var gp = getGP();
		if (!element || !classId) return;

		var classes = Array.isArray(
			element.settings && element.settings._cssGlobalClasses,
		)
			? element.settings._cssGlobalClasses.filter(function (id) {
					return id !== classId;
				})
			: [];

		if (gp && typeof gp.$_updateSetting === 'function') {
			gp.$_updateSetting(element.id, '_cssGlobalClasses', classes);
		} else if (element.settings) {
			element.settings._cssGlobalClasses = classes;
		}
	}

	/**
	 * Copy all CSS-related settings from an element to its new global class,
	 * replacing the element's ID selector with the class name in custom CSS,
	 * then delete those keys from the element so styles live on the class only.
	 */
	function migrateStylesToClass(element, globalClass) {
		if (!element || !element.settings || !globalClass) return;

		if (!globalClass.settings || typeof globalClass.settings !== 'object') {
			globalClass.settings = {};
		}

		var cssId = element.settings._cssId || 'brxe-' + element.id;
		var idSel = '#' + cssId;
		var clsSel = '.' + globalClass.name;

		Object.keys(element.settings).forEach(function (key) {
			var baseKey = key.split(':')[0];

			if (NON_STYLE_PREFIXES.indexOf(baseKey) !== -1) return;

			var value = element.settings[key];

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
		});
	}

	function addClassToElement(element, classId) {
		var gp = getGP();
		if (!element || !classId) return;

		if (!element.settings || typeof element.settings !== 'object') {
			element.settings = {};
		}

		var classes = Array.isArray(element.settings._cssGlobalClasses)
			? element.settings._cssGlobalClasses.slice()
			: [];

		if (!classes.includes(classId)) {
			classes.push(classId);
		}

		if (gp && typeof gp.$_updateSetting === 'function') {
			gp.$_updateSetting(element.id, '_cssGlobalClasses', classes);
		} else {
			element.settings._cssGlobalClasses = classes;
		}
	}

	function rerender() {
		var state = getState();
		var gp = getGP();
		if (state) {
			state.rerenderClassNames = Date.now();
		}
		if (gp && typeof gp.$_rerenderControls === 'function') {
			gp.$_rerenderControls();
		}
		if (gp && typeof gp.$_forceRender === 'function') {
			gp.$_forceRender(100);
		}
	}

	function showMessage(text) {
		var gp = getGP();
		if (gp && typeof gp.$_showMessage === 'function') {
			gp.$_showMessage(text);
		}
	}

	function removeExistingModal() {
		var modal = document.querySelector('.' + MODAL_CLASS);
		if (modal) modal.remove();
	}

	function closeModal() {
		removeExistingModal();
		currentRootId = null;
	}

	function openModal(rootId) {
		var root = getElementById(rootId);
		if (!root) return;

		removeExistingModal();
		currentRootId = rootId;

		var rows = collectTree(root);
		var defaultBlock = sanitizeClassName(getElementLabel(root));
		var overlay = document.createElement('div');
		overlay.className = MODAL_CLASS;
		overlay.innerHTML =
			'<div class="bl-bem-dialog" role="dialog" aria-modal="true" aria-label="BEM Classes">' +
			'<div class="bl-bem-header">' +
			'<strong>BEM Classes</strong>' +
			'<button type="button" class="bl-bem-close" aria-label="Close">x</button>' +
			'</div>' +
			'<label class="bl-bem-field">' +
			'<span>Block class</span>' +
			'<input type="text" class="bl-bem-input" value="' +
			escapeHtml(defaultBlock) +
			'" placeholder="hero-card">' +
			'</label>' +
			'<div class="bl-bem-list"></div>' +
			'<label class="bl-bem-option">' +
			'<input type="checkbox" class="bl-bem-move-styles">' +
			'<span>Move ID styles to classes</span>' +
			'</label>' +
			'<div class="bl-bem-footer">' +
			'<button type="button" class="bl-bem-secondary">Cancel</button>' +
			'<button type="button" class="bl-bem-primary">Assign Classes</button>' +
			'</div>' +
			'</div>';

		document.body.appendChild(overlay);

		var input = overlay.querySelector('.bl-bem-input');
		var list = overlay.querySelector('.bl-bem-list');

		// Build rows once — checkboxes are never recreated so the browser
		// preserves their checked state across block-name edits.
		var defaultBlockName = sanitizeClassName(input.value);
		var initialClassMap = makeClassMap(rows, defaultBlockName || 'block');
		list.innerHTML = rows
			.map(function (row, index) {
				var isRoot = index === 0;
				return (
					'<label class="bl-bem-row" style="--depth:' +
					row.depth +
					'">' +
					'<input type="checkbox" data-id="' +
					escapeHtml(row.id) +
					'" checked>' +
					'<span class="bl-bem-row-title">' +
					escapeHtml(row.label) +
					'</span>' +
					'<code>' +
					escapeHtml(initialClassMap[row.id]) +
					'</code>' +
					(isRoot ? '<span class="bl-bem-root">root</span>' : '') +
					'</label>'
				);
			})
			.join('');

		// On block-name input, only patch the <code> text — never touch checkboxes.
		input.addEventListener('input', function () {
			var blockName = sanitizeClassName(input.value);
			var classMap = makeClassMap(rows, blockName || 'block');
			list.querySelectorAll('.bl-bem-row').forEach(function (rowEl) {
				var id = rowEl.querySelector('input[type="checkbox"]').dataset.id;
				var code = rowEl.querySelector('code');
				if (code) code.textContent = classMap[id] || '';
			});
		});

		overlay.addEventListener('click', function (event) {
			if (
				event.target === overlay ||
				event.target.closest('.bl-bem-close') ||
				event.target.closest('.bl-bem-secondary')
			) {
				closeModal();
			}
		});

		var moveStylesToggle = overlay.querySelector('.bl-bem-move-styles');

		overlay
			.querySelector('.bl-bem-primary')
			.addEventListener('click', function () {
				var blockName = sanitizeClassName(input.value);
				if (!blockName) {
					input.focus();
					return;
				}

				var classMap = makeClassMap(rows, blockName);
				var state = getState();
				var moveStyles = moveStylesToggle.checked;
				var assigned = 0;
				var removed = 0;

				list.querySelectorAll('.bl-bem-row').forEach(function (rowEl) {
					var cb = rowEl.querySelector('input[type="checkbox"]');
					var element = getElementById(cb.dataset.id);
					var className = classMap[cb.dataset.id];
					if (!element || !className) return;

					if (cb.checked) {
						var globalClass = ensureGlobalClass(className);
						if (globalClass) {
							addClassToElement(element, globalClass.id);
							if (moveStyles) migrateStylesToClass(element, globalClass);
							assigned++;
						}
					} else if (state) {
						var existing = (state.globalClasses || []).find(function (item) {
							return item.name === className;
						});
						if (existing) {
							removeClassFromElement(element, existing.id);
							removed++;
						}
					}
				});

				rerender();
				closeModal();

				var parts = [];
				if (assigned)
					parts.push(
						'assigned to ' +
							assigned +
							' element' +
							(assigned === 1 ? '' : 's'),
					);
				if (removed)
					parts.push(
						'removed from ' + removed + ' element' + (removed === 1 ? '' : 's'),
					);
				showMessage(
					'BEM classes ' + (parts.length ? parts.join(', ') : 'unchanged'),
				);
			});

		setTimeout(function () {
			input.focus();
			input.select();
		}, 0);
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function injectButtons() {
		var structure = document.querySelector('#bricks-structure');
		if (!structure) return;

		structure.querySelectorAll('.element[data-id]').forEach(function (item) {
			if (item.getAttribute(PROCESSED_ATTR) === '1') return;

			var actions =
				item.querySelector(
					'.actions, .element-actions, .structure-item-actions',
				) ||
				item.querySelector('.title') ||
				item;

			var button = document.createElement('button');
			button.type = 'button';
			button.className = BUTTON_CLASS;
			button.setAttribute('aria-label', 'Add BEM classes');
			button.title = 'Add BEM classes';
			button.innerHTML = '<span aria-hidden="true">B</span>';

			button.addEventListener('click', function (event) {
				event.preventDefault();
				event.stopPropagation();
				var structureItem = getStructureItemFromTarget(event.target);
				if (structureItem && structureItem.dataset.id) {
					openModal(structureItem.dataset.id);
				}
			});

			var li = document.createElement('li');
			li.className = 'action';
			li.appendChild(button);
			actions.appendChild(li);
			item.setAttribute(PROCESSED_ATTR, '1');
		});
	}

	var initAttempts = 0;

	function init() {
		var structure = document.querySelector('#bricks-structure');
		if (!structure) {
			if (++initAttempts < 25) {
				setTimeout(init, 200);
			}
			return;
		}

		injectButtons();
		new MutationObserver(injectButtons).observe(structure, {
			childList: true,
			subtree: true,
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape' && currentRootId) {
				closeModal();
			}
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
