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
		'brickslabs_bricks_navigator_bricks_menu'             => true,
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
		add_action( 'admin_footer', [ $this, 'render_bricks_menu_toggle_script' ] );
	}

	public function render_bricks_menu_toggle_script(): void {
		?>
		<script>
		document.addEventListener( 'DOMContentLoaded', function () {
			const form = document.querySelector( '.bricks-navigator-settings .settings-form' );
			if ( ! form ) return;

			// Find a section's H2 by walking up from the first field in that section.
			// Using field IDs is language-agnostic — text-content matching would break
			// the UI entirely when the page is displayed in a non-English language.
			function sectionHeading( fieldId ) {
				const el = form.querySelector( '#' + fieldId );
				if ( ! el ) return null;
				const table = el.closest( 'table' );
				if ( ! table ) return null;
				// Walk back past any description <p> added by the section callback.
				let prev = table.previousElementSibling;
				while ( prev && prev.tagName !== 'H2' ) {
					prev = prev.previousElementSibling;
				}
				return ( prev && prev.tagName === 'H2' ) ? prev : null;
			}

			const adminBarMenuH2 = sectionHeading( 'brickslabs_bricks_navigator_bricks_menu' );
			const generalH2      = sectionHeading( 'brickslabs_bricks_navigator_show_in_editor' );
			const menuItemsH2    = sectionHeading( 'brickslabs_bricks_navigator_show_community_menu' );
			const enhancementsH2 = sectionHeading( 'brickslabs_bricks_navigator_auto_select_class' );

			// sectionKey is a stable, translation-safe identifier stored in
			// localStorage to persist the accordion's open/collapsed state.
			function wrapSection( startEl, stopFn, sectionKey ) {
				const wrapper = document.createElement( 'div' );
				wrapper.className = 'bn-section-box';
				if ( sectionKey ) wrapper.dataset.bnSection = sectionKey;
				startEl.parentNode.insertBefore( wrapper, startEl );
				wrapper.appendChild( startEl );
				let sibling = wrapper.nextElementSibling;
				while ( sibling && ! stopFn( sibling ) ) {
					const next = sibling.nextElementSibling;
					wrapper.appendChild( sibling );
					sibling = next;
				}
				return wrapper;
			}

			function makeAccordion( wrapper ) {
				const heading = wrapper.querySelector( 'h2' );
				if ( ! heading ) return;

				heading.classList.add( 'bn-section-heading' );

				const body = document.createElement( 'div' );
				body.className = 'bn-section-body';
				let sibling = heading.nextElementSibling;
				while ( sibling ) {
					const next = sibling.nextElementSibling;
					body.appendChild( sibling );
					sibling = next;
				}
				wrapper.appendChild( body );

				// Restore persisted state before the first paint.
				const key = wrapper.dataset.bnSection
					? 'bn_accordion_' + wrapper.dataset.bnSection
					: null;
				if ( key && localStorage.getItem( key ) === 'collapsed' ) {
					wrapper.classList.add( 'bn-collapsed' );
				}

				heading.addEventListener( 'click', function () {
					wrapper.classList.toggle( 'bn-collapsed' );
					if ( key ) {
						localStorage.setItem(
							key,
							wrapper.classList.contains( 'bn-collapsed' ) ? 'collapsed' : 'open'
						);
					}
				} );
			}

			// "Admin Bar Menu" box spans from its heading up to (but not including)
			// the "Enhancements" heading, so "General Settings" and "Menu Items"
			// sub-sections are enclosed within it. The stop condition uses the
			// cached enhancementsH2 reference — no text matching needed.
			if ( adminBarMenuH2 ) {
				makeAccordion( wrapSection( adminBarMenuH2, function ( el ) {
					return el === enhancementsH2;
				}, 'admin-bar-menu' ) );
			}

			// "Enhancements" box spans to the submit button.
			if ( enhancementsH2 ) {
				makeAccordion( wrapSection( enhancementsH2, function ( el ) {
					return el.classList.contains( 'submit' );
				}, 'enhancements' ) );
			}

			// Demote "General Settings" and "Menu Items" H2s to H3s so they read
			// as sub-headings inside the "Admin Bar Menu" accordion. Uses cached
			// DOM references — no text matching needed.
			[ generalH2, menuItemsH2 ].filter( Boolean ).forEach( function ( h2 ) {
				const h3 = document.createElement( 'h3' );
				h3.textContent = h2.textContent;
				h2.parentNode.replaceChild( h3, h2 );
			} );

			// Hide "General Settings" and "Menu Items" sub-sections when the
			// "Bricks Menu" toggle is off. Everything inside the Admin Bar Menu
			// section body after the first settings table is considered gated.
			// No text matching — purely structural.
			const bricksMenuCb = form.querySelector( '#brickslabs_bricks_navigator_bricks_menu' );
			if ( bricksMenuCb ) {
				const sectionBody = bricksMenuCb.closest( 'table' ) &&
					bricksMenuCb.closest( 'table' ).closest( '.bn-section-body' );
				if ( sectionBody ) {
					const firstTable = sectionBody.querySelector( 'table' );
					function getGatedEls() {
						if ( ! firstTable ) return [];
						const result = [];
						let el = firstTable.nextElementSibling;
						while ( el ) {
							result.push( el );
							el = el.nextElementSibling;
						}
						return result;
					}
					function applyGating( show ) {
						getGatedEls().forEach( function ( el ) {
							el.style.display = show ? '' : 'none';
						} );
					}
					applyGating( bricksMenuCb.checked );
					bricksMenuCb.addEventListener( 'change', function () {
						applyGating( this.checked );
					} );
				}
			}
		} );
		</script>
		<?php
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
		// Admin Bar Menu section — gates the General Settings and Menu Items sections below.
		add_settings_section(
			'brickslabs_bricks_navigator_bricks_menu_section',
			__( 'Admin Bar Menu', 'brickslabs-bricks-navigator' ),
			null,
			'brickslabs-bricks-navigator'
		);

		$this->add_toggle(
			'brickslabs_bricks_navigator_bricks_menu',
			__( 'Bricks Menu', 'brickslabs-bricks-navigator' ),
			'brickslabs_bricks_navigator_bricks_menu_section',
			true,
			__( 'Show the Bricks menu in the WordPress admin bar.', 'brickslabs-bricks-navigator' )
		);

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
