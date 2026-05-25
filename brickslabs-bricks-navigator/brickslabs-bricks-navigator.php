<?php
/*
 * Plugin Name:       BricksLabs Bricks Navigator
 * Plugin URI:        https://brickslabs.com/bricks-navigator/
 * Description:       Adds quick links in the WordPress admin bar for users of the Bricks theme.
 * Version:           1.1.9
 * Author:            Sridhar Katakam
 * Author URI:        https://brickslabs.com/
 * Text Domain:       brickslabs-bricks-navigator
 * Domain Path:       /languages
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 */

namespace BricksLabs\BricksNavigator;

if (!defined("ABSPATH")) {
    exit();
}

final class Plugin
{
    const VERSION = "1.1.9";

    private static ?self $instance = null;

    /** @var Settings */
    private Settings $settings;

    public static function instance(): self
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        $this->define_constants();
        add_action("plugins_loaded", [$this, "init"]);
        // Load translations on 'init' so the effective locale — including any
        // user-specific language set in their profile — has been finalised.
        // Hooking on 'plugins_loaded' would pick up the site locale only and
        // miss users whose profile language differs from the site language.
        add_action("init", [$this, "load_textdomain"], 1);
    }

    private function define_constants(): void
    {
        if (!defined("BRICKSLABS_BRICKS_NAVIGATOR_VERSION")) {
            define("BRICKSLABS_BRICKS_NAVIGATOR_VERSION", self::VERSION);
        }
        if (!defined("BRICKSLABS_BRICKS_NAVIGATOR_BASE")) {
            define(
                "BRICKSLABS_BRICKS_NAVIGATOR_BASE",
                plugin_basename(__FILE__),
            );
        }
        if (!defined("BRICKSLABS_BRICKS_NAVIGATOR_PATH")) {
            define(
                "BRICKSLABS_BRICKS_NAVIGATOR_PATH",
                plugin_dir_path(__FILE__),
            );
        }
        if (!defined("BRICKSLABS_BRICKS_NAVIGATOR_URL")) {
            define("BRICKSLABS_BRICKS_NAVIGATOR_URL", plugin_dir_url(__FILE__));
        }
    }

    public function init(): void
    {
        $this->load_classes();

        $this->settings = new Settings();
        $this->settings->register();

        if (is_admin()) {
            add_filter(
                "plugin_action_links_" . BRICKSLABS_BRICKS_NAVIGATOR_BASE,
                [$this, "add_settings_link"],
            );
        }

        // Always instantiate Editor — it gates individual features internally.
        $editor = new Editor();
        $editor->register((bool) $this->settings->get("show_in_editor"));

        add_action("admin_init", [$this, "check_environment"]);
        add_action("init", [$this, "init_hooks"], 0);
    }

    private function load_classes(): void
    {
        require_once BRICKSLABS_BRICKS_NAVIGATOR_PATH .
            "inc/class-settings.php";
        require_once BRICKSLABS_BRICKS_NAVIGATOR_PATH .
            "inc/class-admin-bar.php";
        require_once BRICKSLABS_BRICKS_NAVIGATOR_PATH . "inc/class-editor.php";
    }

    public function init_hooks(): void
    {
        add_action("wp_loaded", function () {
            if ($this->can_use_navigator()) {
                if ($this->settings->get("bricks_menu")) {
                    add_action(
                        "admin_bar_menu",
                        [$this, "add_admin_bar_menu"],
                        999,
                    );
                }
                add_action("admin_enqueue_scripts", [$this, "enqueue_assets"]);
                add_action("wp_enqueue_scripts", [$this, "enqueue_assets"]);
            }
        });
    }

    public function check_environment(): bool
    {
        $errors = [];

        if (version_compare(PHP_VERSION, "8.0", "<")) {
            $errors[] = sprintf(
                /* translators: 1: required version, 2: current version */
                __(
                    'BricksLabs Bricks Navigator requires PHP version %1$s or higher. You are running version %2$s.',
                    "brickslabs-bricks-navigator",
                ),
                "8.0",
                PHP_VERSION,
            );
        }

        if (version_compare($GLOBALS["wp_version"], "6.0", "<")) {
            $errors[] = sprintf(
                /* translators: 1: required version, 2: current version */
                __(
                    'BricksLabs Bricks Navigator requires WordPress version %1$s or higher. You are running version %2$s.',
                    "brickslabs-bricks-navigator",
                ),
                "6.0",
                $GLOBALS["wp_version"],
            );
        }

        if ("Bricks" !== $this->get_theme_name()) {
            $errors[] = __(
                "BricksLabs Bricks Navigator requires Bricks theme to be active.",
                "brickslabs-bricks-navigator",
            );
        }

        if (!empty($errors)) {
            add_action("admin_notices", function () use ($errors) {
                echo '<div class="notice notice-error"><p>';
                echo implode("</p><p>", array_map("esc_html", $errors));
                echo "</p></div>";
            });

            require_once ABSPATH . "wp-admin/includes/plugin.php";
            deactivate_plugins(BRICKSLABS_BRICKS_NAVIGATOR_BASE);

            if (isset($_GET["activate"])) {
                unset($_GET["activate"]);
            }

            return false;
        }

        return true;
    }

    public function load_textdomain(): void
    {
        load_plugin_textdomain(
            "brickslabs-bricks-navigator",
            false,
            dirname(plugin_basename(__FILE__)) . "/languages",
        );
    }

    /**
     * Whether the current user can see the Navigator menu.
     *
     * Result is cached for the lifetime of the request — the check is pure
     * (same inputs produce the same output) so there is no reason to repeat it.
     */
    public function can_use_navigator(): bool
    {
        static $result = null;

        if (null !== $result) {
            return $result;
        }

        if (
            !function_exists("is_admin_bar_showing") ||
            !is_admin_bar_showing()
        ) {
            return $result = false;
        }

        if ("Bricks" !== $this->get_theme_name()) {
            return $result = false;
        }

        if (!function_exists("bricks_is_builder")) {
            return $result = false;
        }

        if (class_exists("\Bricks\Builder_Permissions")) {
            return $result = \Bricks\Builder_Permissions::user_has_permission(
                "access_builder_page",
            );
        }

        return $result =
            class_exists("\Bricks\Capabilities") &&
            \Bricks\Capabilities::current_user_can_use_builder();
    }

    /** Expose the settings object to other classes (e.g. Editor). */
    public function settings(): Settings
    {
        return $this->settings;
    }

    public function add_admin_bar_menu(\WP_Admin_Bar $wp_admin_bar): void
    {
        try {
            $admin_bar = new Admin_Bar($wp_admin_bar);
            $admin_bar->build($this->settings->all());
        } catch (\Exception $e) {
            error_log("Bricks Navigator Error: " . $e->getMessage());
        }
    }

    public function enqueue_assets(): void
    {
        if (!is_admin_bar_showing()) {
            return;
        }

        wp_enqueue_style(
            "brickslabs-bricks-navigator",
            BRICKSLABS_BRICKS_NAVIGATOR_URL . "assets/css/style.css",
            [],
            BRICKSLABS_BRICKS_NAVIGATOR_VERSION,
        );
    }

    public function add_settings_link(array $links): array
    {
        $settings_link = sprintf(
            '<a href="%s">%s</a>',
            esc_url(admin_url("admin.php?page=brickslabs-bricks-navigator")),
            esc_html__("Settings", "brickslabs-bricks-navigator"),
        );
        array_unshift($links, $settings_link);
        return $links;
    }

    /** Returns the active theme name, cached for the request. */
    private function get_theme_name(): string
    {
        static $name = null;

        if (null === $name) {
            $name = wp_get_theme(get_template())->get("Name");
        }

        return $name;
    }
}

Plugin::instance();
