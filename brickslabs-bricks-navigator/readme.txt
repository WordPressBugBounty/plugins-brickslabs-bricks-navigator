=== Bricks Navigator ===

Contributors: srikat
Tags: bricks, bricks builder, admin bar, toolbar, templates
Donate link: https://www.paypal.me/sridharkatakam
Requires at least: 6.0
Tested up to: 7.1.1
Stable tag: 1.2.1
Requires PHP: 8.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adds quick links in the WordPress admin bar for users of Bricks theme.

== Description ==

=== Main function ===

This plugin adds a handy "Bricks" menu item in the WP admin bar for directly editing Pages and Templates with Bricks, as well as quickly navigating to various areas within the site and external sites relevant for the users of [Bricks Builder theme](https://bricksbuilder.io/).

A very useful feature is being able to directly view the list of all Templates and Pages and edit any of them with Bricks directly with a single click without going to Templates and Pages list screens first.

The admin bar can also be enabled in Bricks editor pages via the plugin's settings page at Bricks → Bricks Navigator.

Links to Bricks-specific plugins' settings page are also provided.

Links to community sites, internal and external Bricks links can be enabled in the plugin's settings page.

A "new tab" icon is provided for site-specific menu items added by the plugin to open that menu item in a new tab.

All external links open in a new tab.

Built for the Bricks community by Sridhar Katakam of [BricksLabs](https://brickslabs.com/).

Performance Notice: The free version loads all templates and pages in the menu and works best for smaller sites (up to ~20 templates and ~50 pages). For larger sites with extensive content, consider upgrading to our upcoming Pro version for better performance. Note that this only applies for admins and other logged-in users for whom the WP toolbar shows.

=== Grouped Templates & Bricks-only Pages ===

The Templates submenu can be grouped by Bricks template type - Header, Footer, Single, Section, Popup, Archive, Search results and so on - instead of one long alphabetical list, and each group links to that type's filtered list in the Templates screen. The Pages submenu can be limited to pages that actually have Bricks content, so you never open an empty canvas by mistake. Both are toggles on the settings page.

=== BEM Classes (Beta) ===

A BEM class action on each structure panel layer to assign global classes in BEM format with a checkbox to move ID styles to the class.

=== CSS Variables Context Menu (Beta) ===

Right-click any CSS value input in the Bricks editor to insert a CSS variable from your registered custom properties - with live preview on hover.

=== Class Tooltip (Beta) ===

Hold Shift or Cmd/Ctrl while hovering over any element in the Bricks structure panel to see a tooltip listing all active CSS global classes applied to that element. Saves time when writing custom CSS — no need to click elements one by one just to check which classes are applied.

=== Keyboard Shortcuts ===

Adding common elements in Bricks editor is now a single key-press away.

- S: Section
- C: Container
- B: Block
- H: Heading
- T: Basic Text
- I: Image
- L: Text Link
- W: Wrap with Block
- R: Rich Text
- D: Div

Alt + H: Toggle :hover

=== Settings ===

The plugin can be configured at Bricks → Bricks Navigator. Three settings are enabled out of the box:

* Bricks Menu - show the Bricks menu in the WordPress admin bar. Turning this off hides the whole menu.
* Plugin Settings - list the settings pages of whichever supported Bricks plugins are active.
* Group Templates by Type - group the Templates submenu by Bricks template type.

Everything else is off until you turn it on: Admin bar in Bricks Editor, Community Menu, Internal Bricks Links, External Bricks Links, Only Pages Built With Bricks, and the editor enhancements (Keyboard Shortcuts, BEM Classes, CSS Variable Context Menu and Class Tooltip).

Defaults only apply while a setting has never been saved. Saving the settings page writes a stored value for every toggle, including the unchecked ones, so a later change to a default will not alter a site that has already saved its settings.

== Installation ==

=== Automatic Installation ===

Search for `bricks navigator` from within your WordPress plugins' Add New page and install.

=== Manual Installation ===

1. Click on the `Download` button to download the plugin.
2. Upload the entire `brickslabs-bricks-navigator` folder to the `/wp-content/plugins/` directory.
3. Activate the plugin through the `Plugins` menu in WordPress.

== Developers ==

Add-ons can extend the menus and the settings page through these hooks.

Filters:

* `brickslabs_bricks_navigator_templates_results` - `( mixed $results, array $query_args )`. Replace the set of templates listed in the menu, for example with a cached or limited query. Return post IDs, WP_Post objects, or any objects exposing an ID property; the result is normalised before use.
* `brickslabs_bricks_navigator_pages_results` - `( mixed $results, array $query_args )`. The same, for the Pages menu.

Actions:

* `brickslabs_bricks_navigator_loaded` - `( Plugin $plugin )`. Fires on `plugins_loaded` once the plugin's services exist. Use it to bootstrap an add-on rather than checking for the plugin yourself.
* `brickslabs_bricks_navigator_after_templates_menu` - `( WP_Admin_Bar $bar, int[] $ids )`. Fires once the Templates menu has been built, with the IDs that were added.
* `brickslabs_bricks_navigator_after_pages_menu` - `( WP_Admin_Bar $bar, int[] $ids )`. The same, for the Pages menu.
* `brickslabs_bricks_navigator_register_pro_settings` - fires on `admin_init` after this plugin registers its own settings. Add sections and fields using `brickslabs-bricks-navigator` as both the page slug and the option group.
* `brickslabs_bricks_navigator_show_upgrade_notices` - fires near the top of the settings page, above the form, for licensing or upgrade notices.

== Screenshots ==

1. Screenshot showing the sub menu of Settings.
2. Screenshot showing 1-click direct link to edit the hovered Template directly with Bricks in a new tab.
3. Screenshot showing 1-click direct link to edit the hovered Page directly with Bricks.
4. Screenshot showing the plugin's settings page.
5. Screenshot showing 'Add BEM classes' button when a structure panel layer is hovered.
6. Screenshot showing BEM Classes dialog.
7. Screenshot showing contextual menu (with live preview on hover) for the builder controls.
8. Screenshot showing class tooltip when an element in the structure panel is held down with Shift or Cmd/Ctrl key.

== Upgrade Notice ==

= 1.2.1 =
Fixes the Bricks 2.4 builder toolbar being hidden behind the WP admin bar, and groups the Templates submenu by type. Removes the CSS Editor and Auto-select Class enhancements, which Bricks now does natively - see "Class dropdown: Auto-select first class" in Bricks settings.

== Changelog ==

= 1.2.1 ( September 21, 2026 ) =
* Fixed "Show admin bar in Bricks" for Bricks 2.4: the builder toolbar was hidden behind the WP admin bar. The offset now targets the new #bricks-workspace layout, and works with the toolbar docked top, bottom, left or right.
* Added "Group Templates by Type": the Templates submenu is now grouped by Bricks template type (Header, Footer, Single, Section, Popup, Archive, ...) instead of one flat alphabetical list. Each group links to that type's filtered list in the Templates admin screen. Enabled by default; falls back to a flat list when every template shares a single type.
* Added "Only Pages Built With Bricks": an optional filter so the Pages submenu lists only pages that already have Bricks content, instead of every published page. Disabled by default.
* Removed the CSS Editor enhancement (and its Auto Apply option). Bricks 2.4 ships bi-directional sync between Custom CSS and style controls natively, so the enhancement is no longer needed.
* Removed the Auto-select Class enhancement. Bricks covers this with its own "Class dropdown: Auto-select first class" setting under Bricks → Settings → Builder. Note that the Bricks setting does not skip locked classes, which this enhancement did.
* Added an uninstall routine: deleting the plugin now removes all of its options, including those of retired settings. Multisite networks are cleaned up site by site.
* Added seven extension points for add-ons. Menu content: the `brickslabs_bricks_navigator_templates_results` and `brickslabs_bricks_navigator_pages_results` filters let an add-on supply its own result set for each menu, and the `brickslabs_bricks_navigator_after_templates_menu` and `brickslabs_bricks_navigator_after_pages_menu` actions fire once each menu is built. Filtered results may be post IDs, WP_Post objects or any objects exposing an ID property. Bootstrapping and UI: `brickslabs_bricks_navigator_loaded` fires on `plugins_loaded` with the plugin instance, `brickslabs_bricks_navigator_register_pro_settings` fires on `admin_init` so an add-on can add sections to the settings page, and `brickslabs_bricks_navigator_show_upgrade_notices` fires above the settings form for licensing or upgrade notices. Signatures are listed in the Developers section.
* The settings page accordions now stop at the next section heading, so sections added by an add-on are no longer absorbed into the Enhancements box.
* Regenerated the translation template. It was missing ten strings added in 1.1.9 and 1.2.0 (Bricks Menu, Class Tooltip, Internal/External Bricks and others), which translators had no way to translate. Added translator comments to the BEM Classes notification strings.

= 1.2.0 ( May 26, 2026 ) =
* Internal Bricks links and external Bricks links now appear under their own submenus.
* Fixed CSS Editor: the CSS editor panel now stays fixed at the bottom of the structure panel at all times. The structure tree scrolls independently above it, so the editor is always accessible regardless of how many elements are on the page. Works correctly with Advanced Themer active.

= 1.1.9 ( May 25, 2026 ) =
* Fixed compatibility issues with Advanced Themer.
* Added a setting for Bricks Menu in the WP admin bar.
* Separated Admin Bar Menu and Enhancements into separate accordion sections on the plugin settings page.
* Added full WordPress JavaScript i18n support (wp-i18n) to BEM Classes, CSS Editor, and CSS Variables Context Menu editor enhancements: all user-facing strings are now translatable via standard wp.i18n.__() calls and wp_set_script_translations().
* Fixed .pot file: corrected doubled plugin filename in source-file references (brickslabs-brickslabs-bricks-navigator.php → brickslabs-bricks-navigator.php).

= 1.1.8 ( May 21, 2026 ) =
* Added Class Tooltip enhancement (Beta): hold Shift or Cmd/Ctrl while hovering over any element in the Bricks structure panel to instantly see a tooltip listing all active CSS global classes on that element — no need to select elements one by one.
* Modernized all JavaScript files to ES6+ syntax: arrow functions, `const`/`let`, optional chaining (`?.`), nullish coalescing (`??`), template literals, `for...of`, destructuring, and spread across all six enhancement modules.

= 1.1.7 ( May 20, 2026 ) =
* Improved CSS Variables Context Menu: added "All / Rel" toggle button to switch between relevant-only and all variables; preference is persisted to localStorage so custom design system users only set it once.
* Improved CSS Variables Context Menu: auto-fallback to all variables when category filtering returns no results, ensuring custom-prefixed CSS variables like `--utopia-space-xs` and `--brand-color-primary` are never silently hidden.
* Improved CSS Variables Context Menu: added unanchored regex patterns for color (`-color-`, `-clr-`), spacing (`-space-`, `-spacing-`, `-gap-`), and font-size (`-step-`) to correctly classify custom-prefixed variables into their categories.
* Fixed Auto-select Class: replaced `hasOwnProperty` check with `Array.isArray` to prevent a TypeError crash when `_cssGlobalClasses` exists on an element but is not an array (e.g. after a malformed JSON import).
* Fixed Keyboard Shortcuts: native `<select>` dropdowns inside the Bricks panel are now correctly treated as editable targets, preventing shortcuts from firing while a dropdown is focused.
* Removed unused internal constant `CACHE_ATTR` from the CSS Variables Context Menu module.

= 1.1.6 ( May 20, 2026 ) =
* Fixed translations not loading: text domain renamed from `bricks-navigator` to `brickslabs-bricks-navigator` to match the plugin slug, which is how WordPress names downloaded language pack files.
* Fixed translations not loading for users whose profile language differs from the site language: `load_plugin_textdomain()` moved from `plugins_loaded` to `init` (priority 1) so the effective locale is fully resolved before the translation file is looked up.
* Fixed BEM Classes dialog styling in Bricks light mode.

= 1.1.5 ( May 19, 2026 ) =
* Fixed plugin internationalization: added `Domain Path: /languages` header, created `languages/` directory, and generated `bricks-navigator.pot` so translations from translate.wordpress.org are correctly loaded.
* Fixed CSS Variables Context Menu: hovering over a variable now previews the value in the canvas without writing to Bricks undo history (only `input` event fires on hover; `change` fires only on click).
* Fixed CSS Variables Context Menu: context menu now closes when clicking anywhere on the Bricks canvas.
* Fixed CSS Variables Context Menu: variable scanning now reads from the parent document stylesheets (via `window.parent.document`), picking up all CSS custom properties defined on the page rather than only those visible inside the builder iframe.
* Fixed external and community admin bar links to include `rel="noopener noreferrer"` on all `target="_blank"` links.

= 1.1.4 ( May 19, 2026 ) =
* Added CSS Editor enhancement (Beta): inline CSS editor panel in the Bricks element panel with two-way binding between CSS and controls. Editable CSS maps back to layout controls; unmappable properties (color, background, border, etc.) are stored in the element's Custom CSS field.
* Added BEM Classes enhancement (Beta): adds a BEM class action to each Bricks structure panel layer to choose a block class, review descendants, exclude specific elements, and assign global classes in BEM format. A checkbox to move ID styles to the class is provided.
* Added CSS Variables Context Menu enhancement (Beta): right-click any CSS value input in the Bricks editor to insert a CSS variable from your registered custom properties - live preview on hover.

= 1.1.3 ( May 14, 2026 ) =
* Refactored codebase to use OOP with namespaced classes (Settings, Admin_Bar, Editor) replacing procedural include files.
* Added Auto-select Class enhancement: automatically activates the first unlocked class in the classes panel when an element with a class is selected in the editor.
* Added Keyboard Shortcuts enhancement: single-key shortcuts in the Bricks editor to insert elements (S to add Section, C to add Container, B to add Block, D to add Div, T to add Basic Text, H to add Heading, I to add Image, R to add Rich Text, L to add Text Link) and wrap with Block (W); Alt+H to toggle :hover.
* Enhancements section added to the settings page with both new features disabled by default.
* Fixed unwanted gap in the Bricks editor when admin bar was set to show.
* Scoped scrollable overflow CSS to Templates and Pages lists only, fixing Community sub-submenus not opening on hover.
* Settings page styles now loaded via an enqueued stylesheet instead of inline output.
* Editor layout-fix CSS now attached via wp_add_inline_style() instead of a raw echo in wp_head.
* Cached wp_get_theme() and Bricks permission checks for the duration of each request.
* Removed dead inc/pages.php file (legacy kn- prefix, never included).

= 1.1.2 ( Aug 13, 2025 ) =
* Fixed the CSS for making long Pages/Templates lists scrollable.

= 1.1.1 ( Aug 09, 2025 ) =
* Fixed the plugin settings menu visibility when no third-party plugins are active.

= 1.1.0 ( Aug 09, 2025 ) =
* Fixed the CSS for the "Show admin bar in Bricks" setting in Bricks 2.0.
* Improved performance and reliability. Plugin now gracefully degrades when Bricks isn't available. Resolved cPanel WP Toolkit SSO login issue and prevents similar problems with WP-CLI, automated backups, or any other tools that load WordPress without themes.
* Revamped UI.
* Community, Internal and External Bricks links have been disabled by default. They are now opt-in rather than opt-out.

= 1.0.3 ( Dec 03, 2023 ) =
* Fixed the CSS for the "Show admin bar in Bricks" setting for Bricks 1.9.3.

= 1.0.2 ( Nov 10, 2023 ) =
* Fixed the CSS for the "Show admin bar in Bricks" setting.

= 1.0.1 ( Jul 30, 2023 ) =
* Link to WooCommerce Bricks Settings page now appears only if WooCommerce is active.
* Added "Add New" link under Templates.
* Added "Plugin Settings" node which links to Bricks-specific plugins' settings pages.
* Added a "Bricks Navigator" Settings page under Bricks admin menu. The Settings page has options to show the admin bar in the editor and hide unwanted items.
* Added a link to plugin's settings page in the Plugins list screen.

= 1.0.0 ( May 27, 2022 ) =
* Initial Release.
