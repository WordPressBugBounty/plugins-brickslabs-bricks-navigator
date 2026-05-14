(function () {
    'use strict';

    var state = {
        lastElementFocus: false,
        isComponentActive: false,
    };

    function getVue() {
        var brxBody = document.querySelector('.brx-body');
        if (!brxBody || !brxBody.__vue_app__) return null;
        return brxBody.__vue_app__.config.globalProperties;
    }

    function isElementActive(vueGlobalProp) {
        var vueState = vueGlobalProp.$_state;
        return (
            vueState.activePanel === 'element' &&
            (
                (vueState.activeElement && vueState.activeElement.hasOwnProperty('id')) ||
                (typeof vueState.activeElement === 'undefined' &&
                    vueState.activeComponent &&
                    vueState.activeComponent.hasOwnProperty('id'))
            )
        );
    }

    function isComponentActive(vueGlobalProp) {
        var vueState = vueGlobalProp.$_state;
        if (!vueState.hasOwnProperty('components')) return false;
        var ac = vueState.activeComponent;
        return ac && typeof ac === 'object' && ac !== false && ac !== '' && ac.hasOwnProperty('id');
    }

    function focusOnFirstClass() {
        var vueGlobalProp = getVue();
        if (!vueGlobalProp) return;
        var vueState = vueGlobalProp.$_state;

        if (!isElementActive(vueGlobalProp)) {
            state.lastElementFocus = false;
            return;
        }

        var elementObj = vueState.activeElement;
        var hasClass = elementObj &&
            elementObj.hasOwnProperty('id') &&
            elementObj.hasOwnProperty('settings') &&
            elementObj.settings.hasOwnProperty('_cssGlobalClasses');

        if (!hasClass) {
            state.lastElementFocus = false;
            return;
        }

        var componentActive = isComponentActive(vueGlobalProp);
        if (state.lastElementFocus === elementObj.id && state.isComponentActive === componentActive) {
            return;
        }

        state.isComponentActive = componentActive;
        state.lastElementFocus = elementObj.id;

        if (elementObj.settings._cssGlobalClasses.length > 0) {
            var unlockedClassId = elementObj.settings._cssGlobalClasses.find(function (classId) {
                var globalClass = vueGlobalProp.$_getGlobalClass(classId);
                return classId && globalClass && !vueGlobalProp.$_isLocked(classId);
            });

            if (unlockedClassId) {
                var classObj = vueState.globalClasses.find(function (el) {
                    return el.id === unlockedClassId;
                });
                if (classObj) {
                    vueState.messageOrigin = 'main';
                    vueState.activeClass = classObj;
                }
            }
        }
    }

    function init() {
        var panelInner = document.querySelector('#bricks-panel-inner');
        if (!panelInner) return;

        var observer = new MutationObserver(function (mutations) {
            var shouldSkip = false;
            mutations.forEach(function (mutation) {
                if (mutation.target.closest && mutation.target.closest('.CodeMirror')) {
                    shouldSkip = true;
                }
            });
            if (!shouldSkip) {
                Promise.resolve().then(focusOnFirstClass);
            }
        });

        observer.observe(panelInner, { subtree: true, childList: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
