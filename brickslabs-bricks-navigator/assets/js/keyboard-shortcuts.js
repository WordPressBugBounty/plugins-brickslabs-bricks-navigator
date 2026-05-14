( function () {
	/**
	 * Single-key shortcuts to insert elements.
	 *
	 * s = Section, c = Container, b = Block, d = Div,
	 * t = Text (Basic), h = Heading, i = Image,
	 * r = Rich Text, l = Text Link,
	 * w = Wrap selected element(s) with configured wrap element
	 */
	var ELEMENT_SHORTCUTS = {
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
	var _gp = null;
	var _state = null;
	/**
	 * Return the cached Vue global properties, initialising on first call.
	 */
	function gp() {
		if ( ! _gp ) {
			var app = window.top.document.querySelector( '.brx-body' );
			if ( app && app.__vue_app__ ) {
				_gp = app.__vue_app__.config.globalProperties;
				_state = _gp.$_state;
			}
		}
		return _gp;
	}
	/* -----------------------------------------------------------------------
	 * Element lookup helper.
	 *
	 * Prefers Bricks' built-in $_getDynamicElementById (likely O(1)) and
	 * falls back to an array search on $_dynamicElements.value.
	 * ----------------------------------------------------------------------- */
	/**
	 * Look up an element by its ID using the fastest available method.
	 *
	 * @param {string} id Element ID.
	 * @return {Object|null} The element object or null.
	 */
	function getElementById( id ) {
		var props = gp();
		if ( ! props ) {
			return null;
		}
		// Bricks provides $_getDynamicElementById for fast lookups.
		if ( typeof props.$_getDynamicElementById === 'function' ) {
			return props.$_getDynamicElementById( id );
		}
		// Fallback: linear search through the elements array.
		var elements = props.$_dynamicElements && props.$_dynamicElements.value;
		return elements
			? elements.find( function ( el ) { return el.id === id; } )
			: null;
	}
	/* -----------------------------------------------------------------------
	 * Editable-target guard.
	 * ----------------------------------------------------------------------- */
	/**
	 * Check if the event target is an editable field where typing should be allowed.
	 * Readonly inputs inside the structure panel are NOT considered editable (the user
	 * is just selecting an element, not renaming it).
	 */
	function isEditableTarget( e ) {
		var tag = e.target.tagName;
		if ( tag === 'INPUT' ) {
			// Allow shortcuts on readonly structure-panel label inputs.
			if ( e.target.readOnly && e.target.closest( '.structure-item .title' ) ) {
				return false;
			}
			return true;
		}
		if ( tag === 'TEXTAREA' || e.target.isContentEditable ) {
			return true;
		}
		// CodeMirror editor
		if ( e.target.closest && e.target.closest( '.CodeMirror' ) ) {
			return true;
		}
		return false;
	}
	/* -----------------------------------------------------------------------
	 * Shortcut handlers — action-only (guard logic lives in the dispatcher).
	 * ----------------------------------------------------------------------- */
	/**
	 * Toggle :hover pseudo-class.
	 */
	function toggleHover( e ) {
		e.preventDefault();
		if ( ! _state ) {
			return;
		}
		_state.pseudoClassActive = _state.pseudoClassActive === ':hover' ? undefined : ':hover';
		_state.activeSelector = undefined;
		_state.showElementClasses = false;
		// Ensure pseudo-classes panel is visible (same as watcher behavior).
		if ( _state.pseudoClassActive ) {
			localStorage.setItem( 'brx_show_pseudo_classes', 'true' );
		}
	}
	/**
	 * Walk up the element tree from the active element to find its ancestor section.
	 * Returns the section element object, or null if not found.
	 */
	function findAncestorSection() {
		if ( ! _state || ! _state.activeElement ) {
			return null;
		}
		var current = _state.activeElement;
		while ( current ) {
			if ( current.name === 'section' ) {
				return current;
			}
			if ( ! current.parent ) {
				return null;
			}
			current = getElementById( current.parent );
		}
		return null;
	}
	/**
	 * Insert an element by name via the matching ELEMENT_SHORTCUTS entry.
	 */
	function insertElement( e ) {
		var elementName = ELEMENT_SHORTCUTS[ e.code ];
		if ( ! elementName ) {
			return;
		}
		e.preventDefault();
		var props = gp();
		var el = props.$_createElement( { name: elementName } );
		// When inserting a section, place it immediately after the current section
		// (or the section that contains the active element). Bricks' addNewElement
		// overwrites the index for sections, so we temporarily set the active element
		// to the ancestor section and enable insertAfter.
		if ( elementName === 'section' ) {
			var section = findAncestorSection();
			if ( section ) {
				_state.activeId = section.id;
				_state.insertAfter = true;
				props.$_addNewElement( { element: el } );
				_state.insertAfter = false;
				return;
			}
		}
		props.$_addNewElement( { element: el } );
	}
	/**
	 * Wrap selected element(s) with the configured wrap element (default: Block).
	 * Respects the same builderWrapElement setting as Bricks' CMD/CTRL+Shift+P.
	 */
	function wrapWithBlock( e ) {
		if ( ! _state.activeElement ) {
			return;
		}
		e.preventDefault();
		var wrapType = ( window.bricksData && window.bricksData.builderWrapElement ) || 'block';
		gp().$_wrapInNestable( null, wrapType );
	}
	/* -----------------------------------------------------------------------
	 * Unified keyboard dispatcher.
	 *
	 * A single keydown listener per document replaces the previous three.
	 * Guard logic (modifier keys, editable targets, command palette) is
	 * checked once, then the appropriate handler is called.
	 * ----------------------------------------------------------------------- */
	function handleKeydown( e ) {
		// Never intercept typing in form fields.
		if ( isEditableTarget( e ) ) {
			return;
		}
		// Alt+H — toggle :hover (allows Alt modifier, blocks others).
		if ( e.altKey && e.code === 'KeyH' && ! e.ctrlKey && ! e.metaKey && ! e.shiftKey && ! e.repeat ) {
			gp();
			toggleHover( e );
			return;
		}
		// Everything below requires NO modifier keys.
		if ( e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat ) {
			return;
		}
		if ( ! gp() || ! _state ) {
			return;
		}
		// Don't act when the command palette is open.
		if ( _state.showCommandPalette ) {
			return;
		}
		if ( e.code === 'KeyW' ) {
			wrapWithBlock( e );
			return;
		}
		if ( ELEMENT_SHORTCUTS[ e.code ] ) {
			insertElement( e );
		}
	}
	/**
	 * Attach the unified keydown listener to a document (main or iframe).
	 */
	function attachListeners( doc ) {
		doc.addEventListener( 'keydown', handleKeydown );
	}
	/* -----------------------------------------------------------------------
	 * Auto-expand new Sections and select their Container.
	 *
	 * Wraps $_addNewElement so that when a Section is added (via any method —
	 * keyboard shortcut, + button, command palette) the new Section is
	 * expanded in the structure panel and its auto-created Container becomes
	 * the active element.
	 *
	 * Instead of relying on scrollToElementId (which only works when Bricks'
	 * structureAutoSync is enabled), we click the DOM toggle arrow directly,
	 * matching the approach used by Advanced Themer.
	 * ----------------------------------------------------------------------- */
	function patchAddNewElementForSections() {
		var props = gp();
		if ( ! props || ! props.$_addNewElement ) {
			return;
		}
		var original = props.$_addNewElement;
		// Idempotency guard — avoid double-wrapping if the script runs twice.
		if ( original.__bl_patched ) {
			return;
		}
		props.$_addNewElement = function () {
			var result = original.apply( this, arguments );
			// Only act when a section was just created.
			if ( ! result || result.name !== 'section' ) {
				return result;
			}
			var sectionId = result.id;
			// Wait one tick for Vue / Xp() to finish creating nestable children.
			setTimeout( function () {
				var section = getElementById( sectionId );
				if ( ! section || ! section.children || ! section.children.length ) {
					return;
				}
				// First child is the auto-created Container.
				var containerId = section.children[ 0 ];
				// Expand the section in the structure panel by clicking its toggle
				// arrow. This works regardless of the structureAutoSync setting.
				var toggle = document.querySelector(
					'#bricks-structure .element[data-id="' + sectionId + '"] .toggle'
				);
				if ( toggle && toggle.dataset.name === 'arrow-right' ) {
					toggle.click();
				}
				// Select the container.
				_state.activeId = containerId;
				_state.activePanel = 'element';
			}, 0 );
			return result;
		};
		props.$_addNewElement.__bl_patched = true;
	}
	/* -----------------------------------------------------------------------
	 * Initialisation.
	 * ----------------------------------------------------------------------- */
	// Listen on main document.
	attachListeners( document );
	// Also listen inside the builder canvas iframe (where focus usually is).
	var iframe = document.getElementById( 'bricks-builder-iframe' );
	if ( iframe ) {
		iframe.addEventListener( 'load', function () {
			try {
				attachListeners( iframe.contentDocument );
			} catch ( err ) {
				// Same-origin policy — should not happen on local dev.
			}
		} );
		// Iframe may already be loaded.
		try {
			if ( iframe.contentDocument && iframe.contentDocument.readyState === 'complete' ) {
				attachListeners( iframe.contentDocument );
			}
		} catch ( err ) {
			// Ignore.
		}
	}
	// Patch addNewElement to auto-select container inside new sections.
	// Retries until Vue is fully mounted and the global property is available.
	function initPatches() {
		if ( ! gp() || ! gp().$_addNewElement ) {
			setTimeout( initPatches, 100 );
			return;
		}
		patchAddNewElementForSections();
	}
	initPatches();
} )();
