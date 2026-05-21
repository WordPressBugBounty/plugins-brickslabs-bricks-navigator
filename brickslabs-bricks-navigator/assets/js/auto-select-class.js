(() => {
	const state = {
		lastElementFocus: false,
		isComponentActive: false,
	};

	const getVue = () => {
		const brxBody = document.querySelector('.brx-body');
		return brxBody?.__vue_app__?.config.globalProperties ?? null;
	};

	const isElementActive = (vueGlobalProp) => {
		const vueState = vueGlobalProp.$_state;
		return (
			vueState.activePanel === 'element' &&
			(
				('id' in (vueState.activeElement ?? {})) ||
				(vueState.activeElement === undefined &&
					vueState.activeComponent &&
					'id' in vueState.activeComponent)
			)
		);
	};

	const isComponentActive = (vueGlobalProp) => {
		const vueState = vueGlobalProp.$_state;
		if (!('components' in vueState)) return false;
		const ac = vueState.activeComponent;
		return ac && typeof ac === 'object' && ac !== false && ac !== '' && 'id' in ac;
	};

	const focusOnFirstClass = () => {
		const vueGlobalProp = getVue();
		if (!vueGlobalProp) return;
		const vueState = vueGlobalProp.$_state;

		if (!isElementActive(vueGlobalProp)) {
			state.lastElementFocus = false;
			return;
		}

		const elementObj = vueState.activeElement;
		const hasClass =
			elementObj &&
			'id' in elementObj &&
			'settings' in elementObj &&
			Array.isArray(elementObj.settings._cssGlobalClasses);

		if (!hasClass) {
			state.lastElementFocus = false;
			return;
		}

		const componentActive = isComponentActive(vueGlobalProp);
		if (state.lastElementFocus === elementObj.id && state.isComponentActive === componentActive) return;

		state.isComponentActive = componentActive;
		state.lastElementFocus = elementObj.id;

		if (elementObj.settings._cssGlobalClasses.length > 0) {
			const unlockedClassId = elementObj.settings._cssGlobalClasses.find(classId => {
				const globalClass = vueGlobalProp.$_getGlobalClass(classId);
				return classId && globalClass && !vueGlobalProp.$_isLocked(classId);
			});

			if (unlockedClassId) {
				const classObj = vueState.globalClasses.find(el => el.id === unlockedClassId);
				if (classObj) {
					vueState.messageOrigin = 'main';
					vueState.activeClass = classObj;
				}
			}
		}
	};

	const init = () => {
		const panelInner = document.querySelector('#bricks-panel-inner');
		if (!panelInner) return;

		const observer = new MutationObserver((mutations) => {
			const shouldSkip = mutations.some(m => m.target.closest?.('.CodeMirror'));
			if (!shouldSkip) Promise.resolve().then(focusOnFirstClass);
		});

		observer.observe(panelInner, { subtree: true, childList: true });
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
