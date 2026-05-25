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

		$css = '
			body.admin-bar #bricks-panel,
			body.admin-bar #bricks-preview,
			body.admin-bar #bricks-structure {
				top: var(--wp-admin--admin-bar--height, 32px);
				height: calc(100vh - var(--wp-admin--admin-bar--height, 32px) - var(--builder-toolbar-height, 48px));
			}
			@media screen and (max-width: 782px) {
				body.admin-bar #bricks-panel,
				body.admin-bar #bricks-preview,
				body.admin-bar #bricks-structure {
					top: var(--wp-admin--admin-bar--height, 46px);
					height: calc(100vh - var(--wp-admin--admin-bar--height, 46px) - var(--builder-toolbar-height, 48px));
				}
			}
		';

		wp_add_inline_style( 'brickslabs-bricks-navigator', $css );
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

		if ( $settings->get( 'auto_select_class' ) ) {
			wp_enqueue_script(
				'brickslabs-bricks-navigator-auto-select-class',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/js/auto-select-class.js',
				[],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION,
				true
			);
		}

		if ( $settings->get( 'keyboard_shortcuts' ) ) {
			wp_enqueue_script(
				'brickslabs-bricks-navigator-keyboard-shortcuts',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/js/keyboard-shortcuts.js',
				[ 'bricks-builder' ],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION,
				true
			);
		}

		if ( $settings->get( 'css_editor' ) ) {
			wp_enqueue_script(
				'brickslabs-bricks-navigator-css-editor',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/js/css-editor.js',
				[ 'bricks-builder', 'wp-i18n' ],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION,
				true
			);
			wp_set_script_translations( 'brickslabs-bricks-navigator-css-editor', 'brickslabs-bricks-navigator', BRICKSLABS_BRICKS_NAVIGATOR_PATH . 'languages' );
			wp_localize_script(
				'brickslabs-bricks-navigator-css-editor',
				'blCssEditorConfig',
				[
					'autoApply' => (bool) $settings->get( 'css_editor_auto_apply' ),
				]
			);
			wp_enqueue_style(
				'brickslabs-bricks-navigator-css-editor',
				BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/css/css-editor.css',
				[],
				BRICKSLABS_BRICKS_NAVIGATOR_VERSION
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
