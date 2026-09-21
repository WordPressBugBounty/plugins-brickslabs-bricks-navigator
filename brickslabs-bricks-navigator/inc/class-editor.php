<?php
namespace BricksLabs\BricksNavigator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Shows the WP admin bar inside the Bricks editor and adjusts panel heights.
 *
 * Delegates the permission check to Plugin::can_use_navigator() so there is
 * no duplication of that logic.
 */
final class Editor {

	public function register( bool $show_admin_bar_in_editor ): void {
		if ( $show_admin_bar_in_editor ) {
			add_action( 'init', [ $this, 'enable_admin_bar' ] );
			add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_editor_styles' ] );
		}

		// Enhancement scripts are independent of the admin-bar-in-editor toggle.
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_enhancement_scripts' ] );
	}

	public function enable_admin_bar(): void {
		if ( ! $this->is_authorized_editor_frame() ) {
			return;
		}

		add_filter( 'show_admin_bar', '__return_true' );
	}

	public function enqueue_editor_styles(): void {
		if ( ! $this->is_authorized_editor_frame() ) {
			return;
		}

		// Ensure the main plugin stylesheet is enqueued (it may not be yet because
		// enqueue_assets() runs later on the same hook — wp_add_inline_style()
		// silently fails if the handle is not already registered).
		if ( ! wp_style_is( 'brickslabs-bricks-navigator', 'registered' ) ) {
			wp_enqueue_style(
				'brickslabs-bricks-navigator',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/css/style.css',
				[],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION
			);
		}

		wp_add_inline_style( 'brickslabs-bricks-navigator', $this->admin_bar_offset_css() );
	}

	/**
	 * CSS that keeps the Bricks editor UI clear of the WP admin bar.
	 *
	 * Bricks 2.4 replaced the old absolutely positioned builder layout with the
	 * #bricks-workspace flex container plus a position:fixed toolbar, so the two
	 * layouts need different offsets.
	 */
	private function admin_bar_offset_css(): string {
		// WordPress only defines --wp-admin--admin-bar--height for block themes,
		// so define it here: Bricks 2.4 reads it, and so do the rules below.
		$css = '
			body.admin-bar {
				--wp-admin--admin-bar--height: 32px;
			}
			@media screen and (max-width: 782px) {
				body.admin-bar {
					--wp-admin--admin-bar--height: 46px;
				}
			}
		';

		if ( $this->uses_workspace_layout() ) {
			// Bricks removes _admin_bar_bump_cb in the builder, so there is no
			// html{margin-top} and the admin bar simply overlays the top of the
			// viewport.  #bricks-workspace therefore keeps its 100vh height and
			// instead reserves the admin bar height as extra top padding, on top
			// of the padding it already reserves for a top-docked toolbar.
			//
			// The toolbar is position:fixed and needs the offset itself.  Bricks
			// ships that offset for .toolbar-top, but its own
			// "#bricks-workspace .bricks-toolbar.toolbar-top" rule resets it via
			// "inset" and wins on specificity, so the toolbar ends up underneath
			// the admin bar.
			return $css . '
				body.admin-bar #bricks-workspace {
					padding-top: var(--wp-admin--admin-bar--height, 32px);
				}
				body.admin-bar #bricks-workspace.toolbar-top {
					padding-top: calc(var(--wp-admin--admin-bar--height, 32px) + var(--builder-toolbar-height, 48px));
				}
				body.admin-bar #bricks-workspace .bricks-toolbar.toolbar-top,
				body.admin-bar #bricks-workspace .bricks-toolbar.toolbar-left,
				body.admin-bar #bricks-workspace .bricks-toolbar.toolbar-right {
					top: var(--wp-admin--admin-bar--height, 32px);
				}
			';
		}

		// Bricks < 2.4: the panels are positioned individually below the toolbar.
		return $css . '
			body.admin-bar #bricks-panel,
			body.admin-bar #bricks-preview,
			body.admin-bar #bricks-structure {
				top: var(--wp-admin--admin-bar--height, 32px);
				height: calc(100vh - var(--wp-admin--admin-bar--height, 32px) - var(--builder-toolbar-height, 48px));
			}
		';
	}

	/**
	 * True when the active Bricks version uses the #bricks-workspace layout
	 * introduced in Bricks 2.4.
	 */
	private function uses_workspace_layout(): bool {
		return defined( 'BRICKS_VERSION' ) && version_compare( BRICKS_VERSION, '2.4', '>=' );
	}

	/**
	 * Conditionally enqueue Bricks editor enhancement scripts.
	 * Runs on wp_enqueue_scripts regardless of the admin-bar-in-editor setting.
	 */
	public function enqueue_enhancement_scripts(): void {
		if ( ! $this->is_authorized_editor_frame() ) {
			return;
		}

		$settings = Plugin::instance()->settings();

		if ( $settings->get( 'keyboard_shortcuts' ) ) {
			wp_enqueue_script(
				'brickslabs-bricks-navigator-keyboard-shortcuts',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/js/keyboard-shortcuts.js',
				[ 'bricks-builder' ],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION,
				true
			);
		}

		if ( $settings->get( 'bem_classes' ) ) {
			wp_enqueue_script(
				'brickslabs-bricks-navigator-bem-classes',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/js/bem-classes.js',
				[ 'bricks-builder', 'wp-i18n' ],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION,
				true
			);
			wp_set_script_translations( 'brickslabs-bricks-navigator-bem-classes', 'brickslabs-bricks-navigator', BRICKSLABS_BRICKS_NAVIGATOR_PATH . 'languages' );
			wp_enqueue_style(
				'brickslabs-bricks-navigator-bem-classes',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/css/bem-classes.css',
				[],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION
			);
		}

		if ( $settings->get( 'css_var_context_menu' ) ) {
			wp_enqueue_script(
				'brickslabs-bricks-navigator-css-var-context-menu',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/js/css-var-context-menu.js',
				[ 'bricks-builder', 'wp-i18n' ],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION,
				true
			);
			wp_set_script_translations( 'brickslabs-bricks-navigator-css-var-context-menu', 'brickslabs-bricks-navigator', BRICKSLABS_BRICKS_NAVIGATOR_PATH . 'languages' );
			wp_enqueue_style(
				'brickslabs-bricks-navigator-css-var-context-menu',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/css/css-var-context-menu.css',
				[],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION
			);
		}

		if ( $settings->get( 'class_tooltip' ) ) {
			wp_enqueue_script(
				'brickslabs-bricks-navigator-class-tooltip',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/js/class-tooltip.js',
				[ 'bricks-builder', 'wp-i18n' ],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION,
				true
			);
			wp_set_script_translations( 'brickslabs-bricks-navigator-class-tooltip', 'brickslabs-bricks-navigator', BRICKSLABS_BRICKS_NAVIGATOR_PATH . 'languages' );
			wp_enqueue_style(
				'brickslabs-bricks-navigator-class-tooltip',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/css/class-tooltip.css',
				[],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION
			);
		}
	}

	/**
	 * True only when inside the Bricks editor outer frame for an authorized user.
	 *
	 * Deliberately does NOT call Plugin::can_use_navigator() — that method gates
	 * on is_admin_bar_showing(), which returns false before our show_admin_bar
	 * filter is registered, creating a circular dependency.  We check the Bricks
	 * permission directly instead.
	 */
	private function is_authorized_editor_frame(): bool {
		if ( ! function_exists( 'bricks_is_builder_main' ) || ! bricks_is_builder_main() ) {
			return false;
		}

		if ( ! function_exists( 'bricks_is_builder' ) ) {
			return false;
		}

		if ( class_exists( '\Bricks\Builder_Permissions' ) ) {
			return \Bricks\Builder_Permissions::user_has_permission( 'access_builder_page' );
		}

		return class_exists( '\Bricks\Capabilities' ) && \Bricks\Capabilities::current_user_can_use_builder();
	}
}
