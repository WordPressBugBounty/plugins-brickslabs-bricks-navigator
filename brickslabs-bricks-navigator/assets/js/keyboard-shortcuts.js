(() => {
	/**
	 * Single-key shortcuts to insert elements.
	 *
	 * s = Section, c = Container, b = Block, d = Div,
	 * t = Text (Basic), h = Heading, i = Image,
	 * r = Rich Text, l = Text Link,
	 * w = Wrap selected element(s) with configured wrap element
	 */
	const ELEMENT_SHORTCUTS = {
		KeyS: 'section',
		KeyC: 'container',
		KeyB: 'block',
		KeyD: 'div',
		KeyT: 'text-basic',
		KeyH: 'heading',
		KeyI: 'image',
		KeyR: 'text',
		KeyL: 'text-link',
	};

	/* -----------------------------------------------------------------------
	 * Vue reference caching (lazy-init).
	 *
	 * The Bricks Vue app, its globalProperties and $_state are stable
	 * references for the entire builder session. We cache them on first
	 * access instead of querying the DOM on every keypress.
	 * ----------------------------------------------------------------------- */
	let _gp = null;
	let _state = null;

	const gp = () => {
		if (!_gp) {
			const app = window.top.document.querySelector('.brx-body');
			if (app?.__vue_app__) {
				_gp = app.__vue_app__.config.globalProperties;
				_state = _gp.$_state;
			}
		}
		return _gp;
	};

	/* -----------------------------------------------------------------------
	 * Element lookup helper.
	 * ----------------------------------------------------------------------- */
	const getElementById = (id) => {
		const props = gp();
		if (!props) return null;
		if (typeof props.$_getDynamicElementById === 'function') {
			return props.$_getDynamicElementById(id);
		}
		const elements = props.$_dynamicElements?.value;
		return elements ? elements.find(el => el.id === id) ?? null : null;
	};

	/* -----------------------------------------------------------------------
	 * Editable-target guard.
	 * ----------------------------------------------------------------------- */
	const isEditableTarget = (e) => {
		const tag = e.target.tagName;
		if (tag === 'INPUT' || tag === 'SELECT') {
			if (e.target.readOnly && e.target.closest('.structure-item .title')) return false;
			return true;
		}
		if (tag === 'TEXTAREA' || e.target.isContentEditable) return true;
		if (e.target.closest?.('.CodeMirror')) return true;
		return false;
	};

	/* -----------------------------------------------------------------------
	 * Shortcut handlers
	 * ----------------------------------------------------------------------- */
	const toggleHover = (e) => {
		e.preventDefault();
		if (!_state) return;
		_state.pseudoClassActive = _state.pseudoClassActive === ':hover' ? undefined : ':hover';
		_state.activeSelector = undefined;
		_state.showElementClasses = false;
		if (_state.pseudoClassActive) {
			localStorage.setItem('brx_show_pseudo_classes', 'true');
		}
	};

	const findAncestorSection = () => {
		if (!_state?.activeElement) return null;
		let current = _state.activeElement;
		while (current) {
			if (current.name === 'section') return current;
			if (!current.parent) return null;
			current = getElementById(current.parent);
		}
		return null;
	};

	const insertElement = (e) => {
		const elementName = ELEMENT_SHORTCUTS[e.code];
		if (!elementName) return;
		e.preventDefault();
		const props = gp();
		const el = props.$_createElement({ name: elementName });
		if (elementName === 'section') {
			const section = findAncestorSection();
			if (section) {
				_state.activeId = section.id;
				_state.insertAfter = true;
				props.$_addNewElement({ element: el });
				_state.insertAfter = false;
				return;
			}
		}
		props.$_addNewElement({ element: el });
	};

	const wrapWithBlock = (e) => {
		if (!_state.activeElement) return;
		e.preventDefault();
		const wrapType = (window.bricksData?.builderWrapElement) ?? 'block';
		gp().$_wrapInNestable(null, wrapType);
	};

	/* -----------------------------------------------------------------------
	 * Unified keyboard dispatcher.
	 * ----------------------------------------------------------------------- */
	const handleKeydown = (e) => {
		if (isEditableTarget(e)) return;

		if (e.altKey && e.code === 'KeyH' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.repeat) {
			gp();
			toggleHover(e);
			return;
		}

		if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
		if (!gp() || !_state) return;
		if (_state.showCommandPalette) return;

		if (e.code === 'KeyW') { wrapWithBlock(e); return; }
		if (ELEMENT_SHORTCUTS[e.code]) insertElement(e);
	};

	const attachListeners = (doc) => {
		doc.addEventListener('keydown', handleKeydown);
	};

	/* -----------------------------------------------------------------------
	 * Auto-expand new Sections and select their Container.
	 * ----------------------------------------------------------------------- */
	const patchAddNewElementForSections = () => {
		const props = gp();
		if (!props?.$_addNewElement) return;

		const original = props.$_addNewElement;
		if (original.__bl_patched) return;

		props.$_addNewElement = function (...args) {
			const result = original.apply(this, args);
			if (!result || result.name !== 'section') return result;
			const sectionId = result.id;
			setTimeout(() => {
				const section = getElementById(sectionId);
				if (!section?.children?.length) return;
				const containerId = section.children[0];
				const toggle = document.querySelector(
					`#bricks-structure .element[data-id="${sectionId}"] .toggle`,
				);
				if (toggle?.dataset.name === 'arrow-right') toggle.click();
				_state.activeId = containerId;
				_state.activePanel = 'element';
			}, 0);
			return result;
		};
		props.$_addNewElement.__bl_patched = true;
	};

	/* -----------------------------------------------------------------------
	 * Initialisation.
	 * ----------------------------------------------------------------------- */
	attachListeners(document);

	const iframe = document.getElementById('bricks-builder-iframe');
	if (iframe) {
		iframe.addEventListener('load', () => {
			try { attachListeners(iframe.contentDocument); } catch (err) {}
		});
		try {
			if (iframe.contentDocument?.readyState === 'complete') {
				attachListeners(iframe.contentDocument);
			}
		} catch (err) {}
	}

	const initPatches = () => {
		if (!gp()?.$_addNewElement) { setTimeout(initPatches, 100); return; }
		patchAddNewElementForSections();
	};
	initPatches();
})();
