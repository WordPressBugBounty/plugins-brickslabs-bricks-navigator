<?php
namespace BricksLabs\BricksNavigator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles plugin settings registration, page rendering, and option retrieval.
 */
final class Settings {

	/** @var array<string,mixed>|null Cached options, null until first load. */
	private ?array $options = null;

	/** @var array<string,mixed> Option defaults keyed by option name. */
	private const DEFAULTS = [
		'brickslabs_bricks_navigator_show_in_editor'          => false,
		'brickslabs_bricks_navigator_show_community_menu'     => false,
		'brickslabs_bricks_navigator_show_bricks_internal'    => false,
		'brickslabs_bricks_navigator_show_bricks_external'    => false,
		'brickslabs_bricks_navigator_show_thirdparty_plugins' => true,
		'brickslabs_bricks_navigator_auto_select_class'       => false,
		'brickslabs_bricks_navigator_keyboard_shortcuts'      => false,
		'brickslabs_bricks_navigator_css_editor'              => false,
		'brickslabs_bricks_navigator_css_editor_auto_apply'   => false,
		'brickslabs_bricks_navigator_bem_classes'             => false,
		'brickslabs_bricks_navigator_css_var_context_menu'   => false,
		'brickslabs_bricks_navigator_class_tooltip'          => false,
	];

	public function register(): void {
		add_action( 'admin_menu', [ $this, 'add_settings_page' ], 99 );
		add_action( 'admin_init', [ $this, 'register_settings' ] );
	}

	/**
	 * Retrieve a single option by its short key (without the plugin prefix).
	 * All options are loaded from the DB once and cached for the request.
	 *
	 * @param string $key Short key, e.g. 'show_in_editor'.
	 */
	public function get( string $key ): mixed {
		$this->load();
		$full_key = 'brickslabs_bricks_navigator_' . $key;
		return $this->options[ $full_key ] ?? false;
	}

	/** Return all options as an associative array (full option-name keys). */
	public function all(): array {
		$this->load();
		return $this->options;
	}

	/** Load all options once. */
	private function load(): void {
		if ( null !== $this->options ) {
			return;
		}

		$this->options = [];
		foreach ( self::DEFAULTS as $key => $default ) {
			$raw = get_option( $key, $default );
			// rest_sanitize_boolean handles '1', '', true, false consistently.
			$this->options[ $key ] = rest_sanitize_boolean( $raw );
		}
	}

	// -------------------------------------------------------------------------
	// Admin menu & page
	// -------------------------------------------------------------------------

	public function add_settings_page(): void {
		$hook = add_submenu_page(
			'bricks',
			__( 'Bricks Navigator Settings', 'brickslabs-bricks-navigator' ),
			__( 'Bricks Navigator', 'brickslabs-bricks-navigator' ),
			'manage_options',
			'brickslabs-bricks-navigator',
			[ $this, 'render_page' ]
		);

		// Enqueue settings-page stylesheet only on our own page.
		add_action( "admin_print_styles-{$hook}", [ $this, 'enqueue_settings_styles' ] );
	}

	public function enqueue_settings_styles(): void {
		wp_enqueue_style(
			'brickslabs-bricks-navigator-settings',
			BRICKSLABS_BRICKS_NAVIGATOR_URL . 'assets/css/admin-settings.css',
			[],
			BRICKSLABS_BRICKS_NAVIGATOR_VERSION
		);
	}

	public function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		if ( isset( $_GET['settings-updated'] ) ) {
			add_settings_error(
				'brickslabs_bricks_navigator_messages',
				'brickslabs_bricks_navigator_message',
				__( 'Settings Saved', 'brickslabs-bricks-navigator' ),
				'updated'
			);
		}
		?>
		<div class="wrap bricks-navigator-settings">
			<div class="settings-header">
				<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
				<p class="description">
					<?php esc_html_e( 'Configure how the Bricks Navigator menu appears in your admin bar in addition to the core menu items - Settings, Templates and Pages', 'brickslabs-bricks-navigator' ); ?>
				</p>
			</div>

			<?php settings_errors( 'brickslabs_bricks_navigator_messages' ); ?>

			<form action="options.php" method="post" class="settings-form">
				<?php
				settings_fields( 'brickslabs-bricks-navigator' );
				do_settings_sections( 'brickslabs-bricks-navigator' );
				submit_button( __( 'Save Settings', 'brickslabs-bricks-navigator' ) );
				?>
			</form>
		</div>
		<?php
	}

	// -------------------------------------------------------------------------
	// Settings API registration
	// -------------------------------------------------------------------------

	public function register_settings(): void {
		// General Settings section.
		add_settings_section(
			'brickslabs_bricks_navigator_general',
			__( 'General Settings', 'brickslabs-bricks-navigator' ),
			null,
			'brickslabs-bricks-navigator'
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_show_in_editor',
			__( 'Admin bar in Bricks Editor', 'brickslabs-bricks-navigator' ),
			'brickslabs_bricks_navigator_general',
			false,
			__( 'Show the admin bar in the Bricks editor interface', 'brickslabs-bricks-navigator' )
		);

		// Menu Items section.
		add_settings_section(
			'brickslabs_bricks_navigator_menu',
			__( 'Menu Items', 'brickslabs-bricks-navigator' ),
			null,
			'brickslabs-bricks-navigator'
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_show_community_menu',
			__( 'Community Menu', 'brickslabs-bricks-navigator' ),
			'brickslabs_bricks_navigator_menu',
			false,
			__( 'Show the Community menu items', 'brickslabs-bricks-navigator' )
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_show_bricks_internal',
			__( 'Internal Bricks Links', 'brickslabs-bricks-navigator' ),
			'brickslabs_bricks_navigator_menu',
			false,
			__( 'Show internal Bricks links (Getting Started, Custom Fonts, Form Submissions, Sidebars, System Information, License)', 'brickslabs-bricks-navigator' )
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_show_bricks_external',
			__( 'External Bricks Links', 'brickslabs-bricks-navigator' ),
			'brickslabs_bricks_navigator_menu',
			false,
			__( 'Show external Bricks links (Idea Board, Roadmap, Changelog, Academy, Forum, Facebook Group, YouTube Channel, Bricks Experts)', 'brickslabs-bricks-navigator' )
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_show_thirdparty_plugins',
			__( 'Plugin Settings', 'brickslabs-bricks-navigator' ),
			'brickslabs_bricks_navigator_menu',
			true,
			__( 'Show third-party plugin settings in the menu', 'brickslabs-bricks-navigator' )
		);

		// Enhancements section.
		add_settings_section(
			'brickslabs_bricks_navigator_enhancements',
			__( 'Enhancements', 'brickslabs-bricks-navigator' ),
			[ $this, 'render_enhancements_section_description' ],
			'brickslabs-bricks-navigator'
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_auto_select_class',
			__( 'Auto-select Class', 'brickslabs-bricks-navigator' ),
			'brickslabs_bricks_navigator_enhancements',
			false,
			__( 'When an element with a CSS class is selected in the editor, automatically activate the first unlocked class in the classes panel.', 'brickslabs-bricks-navigator' )
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_keyboard_shortcuts',
			__( 'Keyboard Shortcuts', 'brickslabs-bricks-navigator' ),
			'brickslabs_bricks_navigator_enhancements',
			false,
			__( 'Add keyboard shortcuts in the Bricks editor: Alt+H (toggle :hover), S (Section), C (Container), B (Block), D (Div), T (Text Basic), H (Heading), I (Image), R (Rich Text), L (Text Link), W (Wrap with Block).', 'brickslabs-bricks-navigator' )
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_css_editor',
			__( 'CSS Editor', 'brickslabs-bricks-navigator' ) . '<br><span style="font-weight:normal;">' . __( '(Beta)', 'brickslabs-bricks-navigator' ) . '</span>',
			'brickslabs_bricks_navigator_enhancements',
			false,
			__( 'Show an inline CSS editor panel in the Bricks element panel with two-way binding between CSS and controls. Editable CSS maps back to layout controls; unmappable properties (color, background, border, etc.) are stored in the element\'s Custom CSS field.', 'brickslabs-bricks-navigator' )
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_css_editor_auto_apply',
			__( 'CSS Editor - Auto Apply', 'brickslabs-bricks-navigator' ) . '<br><span style="font-weight:normal;">' . __( '(Beta)', 'brickslabs-bricks-navigator' ) . '</span>',
			'brickslabs_bricks_navigator_enhancements',
			false,
			__( 'Automatically apply CSS Editor changes as you type (debounced). Requires CSS Editor to be enabled.', 'brickslabs-bricks-navigator' )
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_bem_classes',
			__( 'BEM Classes', 'brickslabs-bricks-navigator' ) . '<br><span style="font-weight:normal;">' . __( '(Beta)', 'brickslabs-bricks-navigator' ) . '</span>',
			'brickslabs_bricks_navigator_enhancements',
			false,
			__( 'Add a BEM class action to each Bricks structure panel layer. Choose a block class, review descendants, exclude specific elements, and assign global classes in BEM format.', 'brickslabs-bricks-navigator' )
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_css_var_context_menu',
			__( 'CSS Variable Context Menu', 'brickslabs-bricks-navigator' ) . '<br><span style="font-weight:normal;">' . __( '(Beta)', 'brickslabs-bricks-navigator' ) . '</span>',
			'brickslabs_bricks_navigator_enhancements',
			false,
			__( 'Right-click any compatible Bricks panel control (number, color, text CSS fields) to open a popover listing CSS custom properties defined on :root. Variables are filtered by relevance to the control type (color, spacing, typography, etc.). Click a variable to insert var(--name) into the field.', 'brickslabs-bricks-navigator' )
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_class_tooltip',
			__( 'Class Tooltip', 'brickslabs-bricks-navigator' ) . '<br><span style="font-weight:normal;">' . __( '(Beta)', 'brickslabs-bricks-navigator' ) . '</span>',
			'brickslabs_bricks_navigator_enhancements',
			false,
			__( 'Hold Shift or Cmd/Ctrl while hovering over any element in the Bricks structure panel to see a tooltip listing all active CSS global classes applied to that element.', 'brickslabs-bricks-navigator' )
		);
	}

	/**
	 * Render the introductory text for the Enhancements settings section.
	 */
	public function render_enhancements_section_description(): void {
		echo '<p class="description">' . esc_html__( 'These features load inside the Bricks editor regardless of the "Admin bar in Bricks Editor" setting above.', 'brickslabs-bricks-navigator' ) . '</p>';
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	/**
	 * Register a boolean setting and add its form field in one call.
	 *
	 * @param string $option_name Full wp_options key.
	 * @param string $label       Field label shown in the table.
	 * @param string $section     Settings section ID.
	 * @param bool   $default     Default value.
	 * @param string $description Helper text shown below the toggle.
	 */
	private function add_toggle(
		string $option_name,
		string $label,
		string $section,
		bool $default,
		string $description
	): void {
		register_setting( 'brickslabs-bricks-navigator', $option_name, [
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
			'default'           => $default,
		] );

		add_settings_field(
			$option_name,
			$label,
			[ $this, 'render_toggle' ],
			'brickslabs-bricks-navigator',
			$section,
			[
				'label_for'   => $option_name,
				'description' => $description,
			]
		);
	}

	/**
	 * Render a toggle-switch checkbox.
	 *
	 * @param array{label_for: string, description?: string} $args Field args passed by Settings API.
	 */
	public function render_toggle( array $args ): void {
		if ( empty( $args['label_for'] ) ) {
			return;
		}

		$option = get_option( $args['label_for'] );
		?>
		<input
			type="checkbox"
			id="<?php echo esc_attr( $args['label_for'] ); ?>"
			name="<?php echo esc_attr( $args['label_for'] ); ?>"
			value="1"
			<?php checked( $option, true ); ?>
		>
		<label for="<?php echo esc_attr( $args['label_for'] ); ?>"></label>
		<?php if ( ! empty( $args['description'] ) ) : ?>
			<p class="description"><?php echo esc_html( $args['description'] ); ?></p>
		<?php endif;
	}
}
