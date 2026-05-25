<?php
namespace BricksLabs\BricksNavigator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Builds all Bricks Navigator nodes in the WP admin bar.
 *
 * Receives the bar object via constructor so there is no reliance on implicit
 * variable scope (replaces the old require_once include-file pattern).
 */
final class Admin_Bar {

	public function __construct( private \WP_Admin_Bar $bar ) {}

	/**
	 * Build every section of the navigator menu.
	 *
	 * @param array<string,bool> $settings Plugin settings from Settings::all().
	 */
	public function build( array $settings ): void {
		$this->add_root_node();
		$this->add_settings_nodes();
		$this->add_templates_nodes();
		$this->add_pages_nodes();

		if ( $settings['brickslabs_bricks_navigator_show_bricks_internal'] ) {
			$this->add_internal_nodes();
		}

		if ( $settings['brickslabs_bricks_navigator_show_bricks_external'] ) {
			$this->add_external_nodes();
		}

		if ( $settings['brickslabs_bricks_navigator_show_community_menu'] ) {
			$this->add_community_nodes();
		}

		if ( $settings['brickslabs_bricks_navigator_show_thirdparty_plugins'] ) {
			$this->add_plugin_nodes();
		}
	}

	// -------------------------------------------------------------------------
	// Root node
	// -------------------------------------------------------------------------

	private function add_root_node(): void {
		$icon = sprintf(
			'<img src="%s" style="width:16px;height:16px;padding-right:6px;" alt="" />',
			esc_url( BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/images/bricks-logo.png' )
		);

		$this->bar->add_node( [
			'id'    => 'bn-bricks',
			'title' => $icon . esc_html__( 'Bricks', 'brickslabs-bricks-navigator' ),
			'href'  => esc_url( admin_url( 'themes.php?page=bricks' ) ),
		] );
	}

	// -------------------------------------------------------------------------
	// Bricks Settings (always shown)
	// -------------------------------------------------------------------------

	private function add_settings_nodes(): void {
		$this->bar->add_node( [
			'id'     => 'bn-bricks-settings',
			'title'  => __( 'Settings', 'brickslabs-bricks-navigator' ),
			'parent' => 'bn-bricks',
			'href'   => admin_url( 'admin.php?page=bricks-settings' ),
		] );

		$tabs = [
			'general'          => [ 'label' => __( 'General', 'brickslabs-bricks-navigator' ),          'hash' => '' ],
			'builder-access'   => [ 'label' => __( 'Builder Access', 'brickslabs-bricks-navigator' ),   'hash' => '#tab-builder-access' ],
			'templates'        => [ 'label' => __( 'Templates', 'brickslabs-bricks-navigator' ),        'hash' => '#tab-templates' ],
			'builder'          => [ 'label' => __( 'Builder', 'brickslabs-bricks-navigator' ),          'hash' => '#tab-builder' ],
			'performance'      => [ 'label' => __( 'Performance', 'brickslabs-bricks-navigator' ),      'hash' => '#tab-performance' ],
			'maintenance-mode' => [ 'label' => __( 'Maintenance Mode', 'brickslabs-bricks-navigator' ), 'hash' => '#tab-maintenance' ],
			'api-keys'         => [ 'label' => __( 'API Keys', 'brickslabs-bricks-navigator' ),         'hash' => '#tab-api-keys' ],
			'custom-code'      => [ 'label' => __( 'Custom Code', 'brickslabs-bricks-navigator' ),      'hash' => '#tab-custom-code' ],
		];

		foreach ( $tabs as $id => $tab ) {
			$url = admin_url( 'admin.php?page=bricks-settings' . $tab['hash'] );
			$this->add_item_with_new_tab(
				"bn-bricks-settings-{$id}",
				'bn-bricks-settings',
				$tab['label'],
				$url,
				/* translators: %s: settings tab name */
				sprintf( __( 'Bricks Settings → %s in a new tab', 'brickslabs-bricks-navigator' ), $tab['label'] )
			);
		}

		// WooCommerce tab — conditional.
		if ( class_exists( 'WooCommerce' ) ) {
			$url = admin_url( 'admin.php?page=bricks-settings#tab-woocommerce' );
			$this->add_item_with_new_tab(
				'bn-bricks-settings-woocommerce',
				'bn-bricks-settings',
				__( 'WooCommerce', 'brickslabs-bricks-navigator' ),
				$url,
				__( 'Bricks Settings → WooCommerce in a new tab', 'brickslabs-bricks-navigator' )
			);
		}
	}

	// -------------------------------------------------------------------------
	// Templates (always shown)
	// -------------------------------------------------------------------------

	private function add_templates_nodes(): void {
		$this->bar->add_node( [
			'id'     => 'bn-bricks-templates',
			'title'  => __( 'Templates', 'brickslabs-bricks-navigator' ),
			'parent' => 'bn-bricks',
			'href'   => admin_url( 'edit.php?post_type=bricks_template' ),
			'meta'   => [ 'class' => 'bn-has-top-border' ],
		] );

		// "Add New" link.
		$new_url = admin_url( 'post-new.php?post_type=bricks_template' );
		$this->add_item_with_new_tab(
			'bn-bricks-add-new-template',
			'bn-bricks-templates',
			__( 'Add New', 'brickslabs-bricks-navigator' ),
			$new_url,
			__( 'Add New template in a new tab', 'brickslabs-bricks-navigator' ),
			'bn-parent-of-mini-child bn-has-bottom-border'
		);

		$template_ids = get_posts( [
			'fields'         => 'ids',
			'no_found_rows'  => true,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'post_status'    => 'publish',
			'post_type'      => 'bricks_template',
			'posts_per_page' => -1,
		] );

		foreach ( $template_ids as $post_id ) {
			$edit_url = \Bricks\Helpers::get_builder_edit_link( $post_id );
			$title    = get_the_title( $post_id );

			$this->bar->add_node( [
				'id'     => 'bricks-template' . $post_id,
				'title'  => esc_html( $title ),
				'parent' => 'bn-bricks-templates',
				'href'   => esc_url( $edit_url ),
				'meta'   => [
					'title' => __( 'Edit this Template with Bricks', 'brickslabs-bricks-navigator' ),
					'class' => 'bn-parent-of-mini-child',
				],
			] );

			$this->bar->add_node( [
				'id'     => 'bricks-template-new-tab' . $post_id,
				'title'  => esc_html( $title ),
				'parent' => 'bricks-template' . $post_id,
				'href'   => esc_url( $edit_url ),
				'meta'   => [
					'target' => '_blank',
					'rel'    => 'noopener noreferrer',
					'title'  => __( 'Edit this Template with Bricks in a new tab', 'brickslabs-bricks-navigator' ),
					'class'  => 'bn-mini-child bn-mini-child-new-tab',
				],
			] );
		}
	}

	// -------------------------------------------------------------------------
	// Pages (always shown)
	// -------------------------------------------------------------------------

	private function add_pages_nodes(): void {
		$this->bar->add_node( [
			'id'     => 'bn-bricks-pages',
			'title'  => __( 'Pages', 'brickslabs-bricks-navigator' ),
			'parent' => 'bn-bricks',
			'href'   => admin_url( 'edit.php?post_type=page' ),
			'meta'   => [ 'class' => 'bn-has-top-border' ],
		] );

		$page_ids = get_posts( [
			'fields'         => 'ids',
			'no_found_rows'  => true,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'post_status'    => 'publish',
			'post_type'      => 'page',
			'posts_per_page' => -1,
		] );

		foreach ( $page_ids as $post_id ) {
			$edit_url = \Bricks\Helpers::get_builder_edit_link( $post_id );
			$title    = get_the_title( $post_id );

			$this->bar->add_node( [
				'id'     => 'bricks-page' . $post_id,
				'title'  => esc_html( $title ),
				'parent' => 'bn-bricks-pages',
				'href'   => esc_url( $edit_url ),
				'meta'   => [
					'title' => __( 'Edit this Page with Bricks', 'brickslabs-bricks-navigator' ),
					'class' => 'bn-parent-of-mini-child',
				],
			] );

			$this->bar->add_node( [
				'id'     => 'bricks-page-new-tab' . $post_id,
				'title'  => esc_html( $title ),
				'parent' => 'bricks-page' . $post_id,
				'href'   => esc_url( $edit_url ),
				'meta'   => [
					'target' => '_blank',
					'rel'    => 'noopener noreferrer',
					'title'  => __( 'Edit this Page with Bricks in a new tab', 'brickslabs-bricks-navigator' ),
					'class'  => 'bn-mini-child bn-mini-child-new-tab',
				],
			] );
		}
	}

	// -------------------------------------------------------------------------
	// Internal Bricks links (opt-in)
	// -------------------------------------------------------------------------

	private function add_internal_nodes(): void {
		$this->add_item_with_new_tab(
			'bn-bricks-dashboard',
			'bn-bricks',
			__( 'Getting Started', 'brickslabs-bricks-navigator' ),
			admin_url( 'themes.php?page=bricks' ),
			__( 'Getting Started in a new tab', 'brickslabs-bricks-navigator' ),
			'bn-parent-of-mini-child bn-has-top-border'
		);

		$internals = [
			'custom-fonts'      => [ 'label' => __( 'Custom Fonts', 'brickslabs-bricks-navigator' ),      'href' => admin_url( 'edit.php?post_type=bricks_fonts' ) ],
			'form-submissions'  => [ 'label' => __( 'Form Submissions', 'brickslabs-bricks-navigator' ),  'href' => admin_url( 'admin.php?page=bricks-form-submissions' ) ],
			'sidebars'          => [ 'label' => __( 'Sidebars', 'brickslabs-bricks-navigator' ),          'href' => admin_url( 'admin.php?page=bricks-sidebars' ) ],
			'system-info'       => [ 'label' => __( 'System Information', 'brickslabs-bricks-navigator' ), 'href' => admin_url( 'admin.php?page=bricks-system-information' ) ],
			'license'           => [ 'label' => __( 'License', 'brickslabs-bricks-navigator' ),           'href' => admin_url( 'admin.php?page=bricks-license' ) ],
		];

		foreach ( $internals as $id => $item ) {
			$this->add_item_with_new_tab(
				"bn-bricks-settings-{$id}",
				'bn-bricks',
				$item['label'],
				$item['href'],
				/* translators: %s: page name */
				sprintf( __( '%s in a new tab', 'brickslabs-bricks-navigator' ), $item['label'] )
			);
		}
	}

	// -------------------------------------------------------------------------
	// External Bricks links (opt-in)
	// -------------------------------------------------------------------------

	private function add_external_nodes(): void {
		$externals = [
			'idea-board'    => [ 'label' => __( 'Idea Board', 'brickslabs-bricks-navigator' ),     'href' => 'https://bricksbuilder.io/ideas/',                          'first' => true ],
			'roadmap'       => [ 'label' => __( 'Roadmap', 'brickslabs-bricks-navigator' ),        'href' => 'https://bricksbuilder.io/roadmap/' ],
			'changelog'     => [ 'label' => __( 'Changelog', 'brickslabs-bricks-navigator' ),      'href' => 'https://bricksbuilder.io/changelog/' ],
			'academy'       => [ 'label' => __( 'Academy', 'brickslabs-bricks-navigator' ),        'href' => 'https://academy.bricksbuilder.io/' ],
			'forum'         => [ 'label' => __( 'Forum', 'brickslabs-bricks-navigator' ),          'href' => 'https://forum.bricksbuilder.io/' ],
			'facebook-group'=> [ 'label' => __( 'Facebook Group', 'brickslabs-bricks-navigator' ), 'href' => 'https://www.facebook.com/groups/brickscommunity' ],
			'youtube'       => [ 'label' => __( 'YouTube Channel', 'brickslabs-bricks-navigator' ),'href' => 'https://www.youtube.com/c/bricksbuilder/videos' ],
			'experts'       => [ 'label' => __( 'Bricks Experts', 'brickslabs-bricks-navigator' ), 'href' => 'https://bricksbuilder.io/experts/' ],
		];

		foreach ( $externals as $id => $item ) {
			$class = ! empty( $item['first'] ) ? 'bn-has-top-border' : '';
			$this->bar->add_node( [
				'id'     => "bn-bricks-{$id}",
				'title'  => $item['label'],
				'parent' => 'bn-bricks',
				'href'   => $item['href'],
				'meta'   => array_filter( [
					'target' => '_blank',
					'rel'    => 'noopener noreferrer',
					'class'  => $class,
				] ),
			] );
		}
	}

	// -------------------------------------------------------------------------
	// Community links (opt-in)
	// -------------------------------------------------------------------------

	private function add_community_nodes(): void {
		$this->bar->add_node( [
			'id'     => 'bn-bricks-community',
			'title'  => __( 'Community', 'brickslabs-bricks-navigator' ),
			'parent' => 'bn-bricks',
			'meta'   => [ 'class' => 'bn-has-top-border' ],
		] );

		$community = [
			'advanced-themer' => [
				'label'    => __( 'Advanced Themer', 'brickslabs-bricks-navigator' ),
				'href'     => 'https://advancedthemer.com/',
				'children' => [
					'advanced-themer-fb-grp' => [ 'label' => __( 'AT Facebook Group', 'brickslabs-bricks-navigator' ), 'href' => 'https://www.facebook.com/groups/advancedthemercommunity/' ],
				],
			],
			'bricksextras' => [
				'label'    => __( 'BricksExtras', 'brickslabs-bricks-navigator' ),
				'href'     => 'https://bricksextras.com/',
				'children' => [
					'bricksextras-fb-grp' => [ 'label' => __( 'BE Facebook Group', 'brickslabs-bricks-navigator' ), 'href' => 'https://www.facebook.com/groups/bricksextras/' ],
				],
			],
			'bricksforge' => [
				'label' => __( 'Bricksforge', 'brickslabs-bricks-navigator' ),
				'href'  => 'https://bricksforge.io/',
				'children' => [
					'bricksforge-fb-grp' => [ 'label' => __( 'BF Facebook Group', 'brickslabs-bricks-navigator' ), 'href' => 'https://www.facebook.com/groups/bricksforge/' ],
				],
			],
			'brickslabs' => [
				'label'    => __( 'BricksLabs', 'brickslabs-bricks-navigator' ),
				'href'     => 'https://brickslabs.com/',
				'children' => [
					'brickslabs-fb-grp' => [ 'label' => __( 'BL Facebook Group', 'brickslabs-bricks-navigator' ), 'href' => 'https://www.facebook.com/groups/brickslabs/' ],
				],
			],
			'brickslinks' => [
				'label'    => __( 'Bricks Links', 'brickslabs-bricks-navigator' ),
				'href'     => 'https://start.me/p/MbxMGe/bricks-links',
			],
			'core-framework' => [
				'label' => __( 'Core Framework', 'brickslabs-bricks-navigator' ),
				'href'  => 'https://coreframework.com/',
				'children' => [
					'core-framework-fb-grp' => [ 'label' => __( 'CF Facebook Group', 'brickslabs-bricks-navigator' ), 'href' => 'https://www.facebook.com/groups/coreframework/' ],
				],
			],
			'discord' => [
				'label' => __( 'Discord Chat', 'brickslabs-bricks-navigator' ),
				'href'  => 'https://discord.gg/bricks',
			],
		];

		foreach ( $community as $id => $item ) {
			$this->bar->add_node( [
				'id'     => "bn-bricks-{$id}",
				'title'  => $item['label'],
				'parent' => 'bn-bricks-community',
				'href'   => $item['href'],
				'meta'   => [ 'target' => '_blank', 'rel' => 'noopener noreferrer' ],
			] );

			foreach ( $item['children'] ?? [] as $child_id => $child ) {
				$this->bar->add_node( [
					'id'     => "bn-bricks-{$child_id}",
					'title'  => $child['label'],
					'parent' => "bn-bricks-{$id}",
					'href'   => $child['href'],
					'meta'   => [ 'target' => '_blank', 'rel' => 'noopener noreferrer' ],
				] );
			}
		}
	}

	// -------------------------------------------------------------------------
	// Third-party plugin settings (opt-in)
	// -------------------------------------------------------------------------

	private function add_plugin_nodes(): void {
		$this->bar->add_node( [
			'id'     => 'bn-bricks-plugin-settings',
			'title'  => __( 'Plugin Settings', 'brickslabs-bricks-navigator' ),
			'parent' => 'bn-bricks',
			'meta'   => [ 'class' => 'bn-has-top-border' ],
		] );

		$plugins = [
			[
				'class'  => '\Advanced_Themer_Bricks\AT__Init',
				'id'     => 'bn-bricks-at-settings',
				'label'  => __( 'AT (Theme Settings)', 'brickslabs-bricks-navigator' ),
				'href'   => admin_url( 'admin.php?page=bricks-advanced-themer' ),
				'new_tab_label' => __( 'Advanced Themer settings in a new tab', 'brickslabs-bricks-navigator' ),
			],
			[
				'class'  => '\BricksExtras\BricksExtrasMain',
				'id'     => 'bn-bricks-bricksextras',
				'label'  => __( 'BricksExtras', 'brickslabs-bricks-navigator' ),
				'href'   => admin_url( 'admin.php?page=bricksextras_menu' ),
				'new_tab_label' => __( 'BricksExtras settings in a new tab', 'brickslabs-bricks-navigator' ),
			],
			[
				'class'  => 'Bricksforge',
				'id'     => 'bn-bricks-bricksforge-settings',
				'label'  => __( 'Bricksforge', 'brickslabs-bricks-navigator' ),
				'href'   => admin_url( 'admin.php?page=bricksforge' ),
				'new_tab_label' => __( 'Bricksforge settings in a new tab', 'brickslabs-bricks-navigator' ),
			],
			[
				'class'  => '\CoreFramework\Config\Plugin',
				'id'     => 'bn-bricks-cf-settings',
				'label'  => __( 'Core Framework', 'brickslabs-bricks-navigator' ),
				'href'   => admin_url( 'admin.php?page=core-framework' ),
				'new_tab_label' => __( 'Core Framework settings in a new tab', 'brickslabs-bricks-navigator' ),
			],
		];

		foreach ( $plugins as $plugin ) {
			if ( ! class_exists( $plugin['class'] ) ) {
				continue;
			}
			$this->add_item_with_new_tab(
				$plugin['id'],
				'bn-bricks-plugin-settings',
				$plugin['label'],
				$plugin['href'],
				$plugin['new_tab_label']
			);
		}

		// Bricks Navigator settings always shown inside Plugin Settings.
		$this->add_item_with_new_tab(
			'bn-bricks-navigator-settings',
			'bn-bricks-plugin-settings',
			__( 'Bricks Navigator', 'brickslabs-bricks-navigator' ),
			admin_url( 'admin.php?page=brickslabs-bricks-navigator' ),
			__( 'Bricks Navigator settings in a new tab', 'brickslabs-bricks-navigator' )
		);
	}

	// -------------------------------------------------------------------------
	// Shared helper
	// -------------------------------------------------------------------------

	/**
	 * Add a menu item that has a "new tab" mini-child node.
	 *
	 * @param string $id          Node ID for the parent item.
	 * @param string $parent      Parent node ID.
	 * @param string $label       Visible label for the parent item.
	 * @param string $href        URL (already escaped by admin_url() or validated externally).
	 * @param string $new_tab_title Title attribute for the new-tab child.
	 * @param string $parent_class Optional extra CSS class(es) for the parent node.
	 */
	private function add_item_with_new_tab(
		string $id,
		string $parent,
		string $label,
		string $href,
		string $new_tab_title,
		string $parent_class = 'bn-parent-of-mini-child'
	): void {
		$this->bar->add_node( [
			'id'     => $id,
			'title'  => $label,
			'parent' => $parent,
			'href'   => $href,
			'meta'   => [ 'class' => $parent_class ],
		] );

		$this->bar->add_node( [
			'id'     => $id . '-new-tab',
			'parent' => $id,
			'href'   => $href,
			'meta'   => [
				'target' => '_blank',
				'rel'    => 'noopener noreferrer',
				'title'  => $new_tab_title,
				'class'  => 'bn-mini-child bn-mini-child-new-tab',
			],
		] );
	}
}
