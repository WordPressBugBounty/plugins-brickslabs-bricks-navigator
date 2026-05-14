=== Bricks Navigator ===

Contributors: srikat
Tags: bricks, bricks builder, admin bar
Donate link: https://www.paypal.me/sridharkatakam
Requires at least: 6.0
Tested up to: 6.8.2
Stable tag: 1.1.3
Requires PHP: 8.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adds quick links in the WordPress admin bar for users of Bricks theme.

== Description ==

This plugin adds a handy "Bricks" menu item in the WP admin bar for directly editing Pages and Templates with Bricks, as well as quickly navigating to various areas within the site and external sites relevant for the users of [Bricks Builder theme](https://bricksbuilder.io/).

A very useful feature is being able to directly view the list of all Templates and Pages and edit any of them with Bricks directly with a single click without going to Templates and Pages list screens first.

The admin bar can also be enabled in Bricks editor pages via the plugin's settings page at Bricks → Bricks Navigator.

New in v1.1.3 is the Enhancements section in the settings page, which includes the Auto-select Class and Single Keyboard Shortcuts features.

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

Alt+H: Toggle :hover

Links to Bricks-specific plugins' settings page are also provided.

Links to community sites, internal and external Bricks links can be enabled in the plugin's settings page.

A "new tab" icon is provided for site-specific menu items added by the plugin to open that menu item in a new tab.

All external links open in a new tab.

Built for the Bricks community by Sridhar Katakam of [BricksLabs](https://brickslabs.com/).

Performance Notice: The free version loads all templates and pages in the menu and works best for smaller sites (up to ~20 templates and ~50 pages). For larger sites with extensive content, consider upgrading to our upcoming Pro version for better performance. Note that this only applies for admins and other logged-in users for whom the WP toolbar shows.

== Installation ==

=== Automatic Installation ===

Search for `bricks navigator` from within your WordPress plugins' Add New page and install.

=== Manual Installation ===

1. Click on the `Download` button to download the plugin.
2. Upload the entire `brickslabs-bricks-navigator` folder to the `/wp-content/plugins/` directory.
3. Activate the plugin through the `Plugins` menu in WordPress.

== Screenshots ==

1. Screenshot showing the sub menu of Settings.
2. Screenshot showing 1-click direct link to edit the hovered Template directly with Bricks in a new tab.
3. Screenshot showing 1-click direct link to edit the hovered Page directly with Bricks.
4. Screenshot showing the plugin's settings page.

== Changelog ==

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
