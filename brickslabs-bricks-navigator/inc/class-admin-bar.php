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
		$this->add_templates_nodes( $settings );
		$this->add_pages_nodes( $settings );

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

	private function add_templates_nodes( array $settings ): void {
		$query_args = [
			'fields'         => 'ids',
			'no_found_rows'  => true,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'post_status'    => 'publish',
			'post_type'      => 'bricks_template',
			'posts_per_page' => -1,
		];

		/**
		 * Filter the templates listed in the menu.
		 *
		 * Lets an add-on swap in its own result set — cached, limited, ordered
		 * differently — instead of the unbounded query above.
		 *
		 * @param mixed $results    Default result set produced by $query_args.
		 * @param array $query_args Query args used to build that default set.
		 */
		$results = apply_filters(
			'brickslabs_bricks_navigator_templates_results',
			get_posts( $query_args ),
			$query_args
		);

		$template_ids = $this->normalize_post_ids( $results );

		$groups = $settings['brickslabs_bricks_navigator_group_templates']
			? $this->group_templates_by_type( $template_ids )
			: [];

		// One group is just an extra click, so fall back to a flat list.
		$grouped = count( $groups ) > 1;

		// The list is only scrollable when it holds templates directly: group
		// items open flyout sub-menus, which an overflow container would clip.
		$classes = $grouped ? 'bn-has-top-border bn-has-groups' : 'bn-has-top-border';

		$this->bar->add_node( [
			'id'     => 'bn-bricks-templates',
			'title'  => __( 'Templates', 'brickslabs-bricks-navigator' ),
			'parent' => 'bn-bricks',
			'href'   => admin_url( 'edit.php?post_type=bricks_template' ),
			'meta'   => [ 'class' => $classes ],
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

		if ( ! $grouped ) {
			foreach ( $template_ids as $post_id ) {
				$this->add_template_item( $post_id, 'bn-bricks-templates' );
			}
		} else {
			foreach ( $groups as $type => $group ) {
				$group_id = 'bn-bricks-templates-type-' . $type;

				// Bricks filters its template list on ?template_type=; the
				// leftovers bucket is not a real type, so it links to the
				// unfiltered list.
				$group_url = 'bn-other' === $type
					? admin_url( 'edit.php?post_type=bricks_template' )
					: admin_url( 'edit.php?post_type=bricks_template&template_type=' . rawurlencode( $type ) );

				$this->bar->add_node( [
					'id'     => $group_id,
					'title'  => esc_html( $group['label'] ),
					'parent' => 'bn-bricks-templates',
					'href'   => esc_url( $group_url ),
					'meta'   => [
						'class' => 'bn-template-group',
						/* translators: %s: template type name */
						'title' => sprintf( __( 'List all %s templates', 'brickslabs-bricks-navigator' ), $group['label'] ),
					],
				] );

				foreach ( $group['ids'] as $post_id ) {
					$this->add_template_item( $post_id, $group_id );
				}
			}
		}

		/**
		 * Fires after the Templates menu has been built.
		 *
		 * @param \WP_Admin_Bar $bar          The admin bar being built.
		 * @param int[]         $template_ids IDs that were added to the menu.
		 */
		do_action( 'brickslabs_bricks_navigator_after_templates_menu', $this->bar, $template_ids );
	}

	/**
	 * Coerce a filtered result set into a list of post IDs.
	 *
	 * The results filters are public API, so accept the shapes an add-on is
	 * likely to return: plain IDs, WP_Post objects, or the trimmed row objects
	 * a hand-written SQL query produces.
	 *
	 * @param mixed $results Whatever the filter handed back.
	 *
	 * @return int[]
	 */
	private function normalize_post_ids( mixed $results ): array {
		if ( ! is_array( $results ) ) {
			return [];
		}

		$ids = [];

		foreach ( $results as $result ) {
			if ( is_numeric( $result ) ) {
				$ids[] = (int) $result;
			} elseif ( is_object( $result ) && isset( $result->ID ) ) {
				$ids[] = (int) $result->ID;
			}
		}

		return array_values( array_filter( $ids ) );
	}

	/**
	 * Bucket template IDs by their Bricks template type.
	 *
	 * Groups follow the order Bricks itself lists the types in, with anything
	 * whose type is missing or unrecognised collected at the end.
	 *
	 * @param int[] $template_ids Template post IDs, already ordered by title.
	 *
	 * @return array<string,array{label:string,ids:int[]}> Keyed by type slug; empty types omitted.
	 */
	private function group_templates_by_type( array $template_ids ): array {
		if ( ! $template_ids ) {
			return [];
		}

		// One query for every template's meta, so the get_post_meta() calls below
		// are cache hits rather than a query per template.
		update_meta_cache( 'post', $template_ids );

		$labels = [];

		if ( class_exists( '\Bricks\Setup' ) && ! empty( \Bricks\Setup::$control_options['templateTypes'] ) ) {
			$labels = \Bricks\Setup::$control_options['templateTypes'];
		}

		$type_key = defined( 'BRICKS_DB_TEMPLATE_TYPE' ) ? BRICKS_DB_TEMPLATE_TYPE : '_bricks_template_type';
		$groups   = [];

		foreach ( $template_ids as $post_id ) {
			$type = (string) get_post_meta( $post_id, $type_key, true );

			if ( '' === $type || ! isset( $labels[ $type ] ) ) {
				$type = 'bn-other';
			}

			$groups[ $type ][] = $post_id;
		}

		// Reorder to match Bricks' own type order, then append the leftovers.
		$ordered = [];

		foreach ( $labels as $type => $label ) {
			if ( ! empty( $groups[ $type ] ) ) {
				$ordered[ $type ] = [
					'label' => $label,
					'ids'   => $groups[ $type ],
				];
			}
		}

		if ( ! empty( $groups['bn-other'] ) ) {
			$ordered['bn-other'] = [
				'label' => __( 'Other', 'brickslabs-bricks-navigator' ),
				'ids'   => $groups['bn-other'],
			];
		}

		return $ordered;
	}

	/**
	 * Add a single template node plus its "open in new tab" mini-child.
	 */
	private function add_template_item( int $post_id, string $parent ): void {
		$edit_url = \Bricks\Helpers::get_builder_edit_link( $post_id );
		$title    = get_the_title( $post_id );

		$this->bar->add_node( [
			'id'     => 'bricks-template' . $post_id,
			'title'  => esc_html( $title ),
			'parent' => $parent,
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

	// -------------------------------------------------------------------------
	// Pages (always shown)
	// -------------------------------------------------------------------------

	private function add_pages_nodes( array $settings ): void {
		$this->bar->add_node( [
			'id'     => 'bn-bricks-pages',
			'title'  => __( 'Pages', 'brickslabs-bricks-navigator' ),
			'parent' => 'bn-bricks',
			'href'   => admin_url( 'edit.php?post_type=page' ),
			'meta'   => [ 'class' => 'bn-has-top-border' ],
		] );

		$page_args = [
			'fields'         => 'ids',
			'no_found_rows'  => true,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'post_status'    => 'publish',
			'post_type'      => 'page',
			'posts_per_page' => -1,
		];

		// Pages that were never opened in Bricks have no builder content, so the
		// edit links below would just open an empty canvas.
		if ( $settings['brickslabs_bricks_navigator_bricks_pages_only'] ) {
			$content_key = defined( 'BRICKS_DB_PAGE_CONTENT' ) ? BRICKS_DB_PAGE_CONTENT : '_bricks_page_content_2';

			$page_args['meta_query'] = [
				[
					'key'     => $content_key,
					'compare' => 'EXISTS',
				],
			];
		}

		/**
		 * Filter the pages listed in the menu.
		 *
		 * @param mixed $results   Default result set produced by $page_args.
		 * @param array $page_args Query args used to build that default set.
		 */
		$results = apply_filters(
			'brickslabs_bricks_navigator_pages_results',
			get_posts( $page_args ),
			$page_args
		);

		$page_ids = $this->normalize_post_ids( $results );

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

		/**
		 * Fires after the Pages menu has been built.
		 *
		 * @param \WP_Admin_Bar $bar      The admin bar being built.
		 * @param int[]         $page_ids IDs that were added to the menu.
		 */
		do_action( 'brickslabs_bricks_navigator_after_pages_menu', $this->bar, $page_ids );
	}

	// -------------------------------------------------------------------------
	// Internal Bricks links (opt-in)
	// -------------------------------------------------------------------------

	private function add_internal_nodes(): void {
		$this->bar->add_node( [
			'id'     => 'bn-bricks-internal',
			'title'  => __( 'Internal Bricks', 'brickslabs-bricks-navigator' ),
			'parent' => 'bn-bricks',
			'meta'   => [ 'class' => 'bn-has-top-border' ],
		] );

		$this->add_item_with_new_tab(
			'bn-bricks-dashboard',
			'bn-bricks-internal',
			__( 'Getting Started', 'brickslabs-bricks-navigator' ),
			admin_url( 'themes.php?page=bricks' ),
			__( 'Getting Started in a new tab', 'brickslabs-bricks-navigator' )
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
				'bn-bricks-internal',
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
		$this->bar->add_node( [
			'id'     => 'bn-bricks-external',
			'title'  => __( 'External Bricks', 'brickslabs-bricks-navigator' ),
			'parent' => 'bn-bricks',
			'meta'   => [ 'class' => 'bn-has-top-border' ],
		] );

		$externals = [
			'idea-board'    => [ 'label' => __( 'Idea Board', 'brickslabs-bricks-navigator' ),     'href' => 'https://bricksbuilder.io/ideas/' ],
			'roadmap'       => [ 'label' => __( 'Roadmap', 'brickslabs-bricks-navigator' ),        'href' => 'https://bricksbuilder.io/roadmap/' ],
			'changelog'     => [ 'label' => __( 'Changelog', 'brickslabs-bricks-navigator' ),      'href' => 'https://bricksbuilder.io/changelog/' ],
			'academy'       => [ 'label' => __( 'Academy', 'brickslabs-bricks-navigator' ),        'href' => 'https://academy.bricksbuilder.io/' ],
			'forum'         => [ 'label' => __( 'Forum', 'brickslabs-bricks-navigator' ),          'href' => 'https://forum.bricksbuilder.io/' ],
			'facebook-group'=> [ 'label' => __( 'Facebook Group', 'brickslabs-bricks-navigator' ), 'href' => 'https://www.facebook.com/groups/brickscommunity' ],
			'youtube'       => [ 'label' => __( 'YouTube Channel', 'brickslabs-bricks-navigator' ),'href' => 'https://www.youtube.com/c/bricksbuilder/videos' ],
			'experts'       => [ 'label' => __( 'Bricks Experts', 'brickslabs-bricks-navigator' ), 'href' => 'https://bricksbuilder.io/experts/' ],
		];

		foreach ( $externals as $id => $item ) {
			$this->bar->add_node( [
				'id'     => "bn-bricks-{$id}",
				'title'  => $item['label'],
				'parent' => 'bn-bricks-external',
				'href'   => $item['href'],
				'meta'   => [
					'target' => '_blank',
					'rel'    => 'noopener noreferrer',
				],
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
