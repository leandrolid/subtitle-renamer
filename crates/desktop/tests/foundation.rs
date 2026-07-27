use std::path::{Path, PathBuf};

use tauri::utils::config::{BundleType, FrontendDist, WebviewInstallMode};

const CONFIG: &str = include_str!("../tauri.conf.json");
const CAPABILITY: &str = include_str!("../capabilities/default.json");
const INDEX_HTML: &str = include_str!("../../../ui/index.html");
const APP_JS: &str = include_str!("../../../ui/app.js");
const STYLES_CSS: &str = include_str!("../../../ui/styles.css");
const DESIGN: &str = include_str!("../../../DESIGN.md");
const CSP: &str = "default-src 'self'; connect-src ipc: http://ipc.localhost; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'";

fn has_exact_keys<'a>(keys: impl Iterator<Item = &'a String>, expected: &[&str]) -> bool {
    let mut actual = keys.map(String::as_str).collect::<Vec<_>>();
    let mut expected = expected.to_vec();
    actual.sort_unstable();
    expected.sort_unstable();
    actual == expected
}

fn validate_config(raw: &str) -> Result<(), String> {
    let path = Path::new("tauri.conf.json");
    let config =
        tauri::utils::config::parse::parse_json(raw, path).map_err(|error| error.to_string())?;
    let value = tauri::utils::config::parse::parse_json_value(raw, path)
        .map_err(|error| error.to_string())?;

    if config.product_name.as_deref() != Some("Subtitle Renamer")
        || config.main_binary_name.as_deref() != Some("subtitle-renamer-desktop")
        || config.version.as_deref() != Some("0.1.0")
        || config.identifier != "de.lidco.subtitlerenamer"
    {
        return Err("desktop identity changed".into());
    }
    if config.build.frontend_dist != Some(FrontendDist::Directory(PathBuf::from("../../ui")))
        || config.build.dev_url.is_some()
        || config.build.before_dev_command.is_some()
        || config.build.before_build_command.is_some()
        || config.build.before_bundle_command.is_some()
    {
        return Err("static frontend contract changed".into());
    }

    let [window] = config.app.windows.as_slice() else {
        return Err("exactly one window is required".into());
    };
    if !config.app.with_global_tauri
        || window.label != "main"
        || window.title != "Subtitle Renamer"
        || window.width != 900.0
        || window.height != 720.0
        || window.min_width != Some(720.0)
        || window.min_height != Some(520.0)
        || !window.resizable
    {
        return Err("main window contract changed".into());
    }
    if config
        .app
        .security
        .csp
        .as_ref()
        .map(ToString::to_string)
        .as_deref()
        != Some(CSP)
    {
        return Err("security policy changed".into());
    }

    if !config.bundle.active
        || config.bundle.targets.to_vec()
            != [BundleType::Nsis, BundleType::Deb, BundleType::AppImage]
        || config.bundle.icon
            != [
                "icons/32x32.png",
                "icons/128x128.png",
                "icons/128x128@2x.png",
                "icons/icon.icns",
                "icons/icon.ico",
            ]
        || !matches!(
            config.bundle.windows.webview_install_mode,
            WebviewInstallMode::DownloadBootstrapper { .. }
        )
    {
        return Err("bundle policy changed".into());
    }

    let root = value.as_object().ok_or("config root must be an object")?;
    let build = value["build"]
        .as_object()
        .ok_or("build must be an object")?;
    let app = value["app"].as_object().ok_or("app must be an object")?;
    let security = value["app"]["security"]
        .as_object()
        .ok_or("security must be an object")?;
    let window = value["app"]["windows"][0]
        .as_object()
        .ok_or("main window must be an object")?;
    let bundle = value["bundle"]
        .as_object()
        .ok_or("bundle must be an object")?;
    let windows = value["bundle"]["windows"]
        .as_object()
        .ok_or("bundle windows must be an object")?;
    let webview = value["bundle"]["windows"]["webviewInstallMode"]
        .as_object()
        .ok_or("webview install mode must be an object")?;
    if value["$schema"] != "https://schema.tauri.app/config/2"
        || !has_exact_keys(
            root.keys(),
            &[
                "$schema",
                "productName",
                "mainBinaryName",
                "version",
                "identifier",
                "build",
                "app",
                "bundle",
            ],
        )
        || !has_exact_keys(build.keys(), &["frontendDist"])
        || !has_exact_keys(app.keys(), &["withGlobalTauri", "windows", "security"])
        || !has_exact_keys(security.keys(), &["csp"])
        || !has_exact_keys(
            window.keys(),
            &[
                "label",
                "title",
                "width",
                "height",
                "minWidth",
                "minHeight",
                "resizable",
            ],
        )
        || !has_exact_keys(bundle.keys(), &["active", "targets", "icon", "windows"])
        || !has_exact_keys(windows.keys(), &["webviewInstallMode"])
        || !has_exact_keys(webview.keys(), &["type"])
    {
        return Err("unexpected config key".into());
    }
    Ok(())
}

fn validate_capability(raw: &str) -> Result<(), String> {
    let value =
        tauri::utils::config::parse::parse_json_value(raw, Path::new("capabilities/default.json"))
            .map_err(|error| error.to_string())?;
    let root = value
        .as_object()
        .ok_or("capability root must be an object")?;
    if !has_exact_keys(
        root.keys(),
        &[
            "$schema",
            "identifier",
            "description",
            "windows",
            "permissions",
        ],
    ) || value["$schema"] != "../gen/schemas/desktop-schema.json"
        || value["identifier"] != "default"
        || value["description"] != "Base capability for the main window."
        || value["windows"].as_array().map(Vec::len) != Some(1)
        || value["windows"][0] != "main"
        || value["permissions"].as_array().map(Vec::len) != Some(1)
        || value["permissions"][0] != "core:default"
    {
        return Err("capability policy changed".into());
    }
    Ok(())
}

#[test]
fn static_shell_declares_three_step_localized_contract() {
    // Given: the checked-in static desktop shell.
    let html = INDEX_HTML;

    // When: the shell semantics are inspected without running scripts.
    // Then: the static shell keeps the three-step, local, plaintext, APG menu contract.
    assert_eq!(html.matches("<h1").count(), 1);
    assert_eq!(html.matches("data-workflow-region=").count(), 3);
    for expected in "data-workflow-region=\"choose-folder\"|data-workflow-region=\"review-plan\"|data-workflow-region=\"confirm-copy\"|aria-live=\"polite\"|href=\"./app-icon.svg\"|href=\"./styles.css\"|src=\"./app.js\" defer|<bdi|data-folder-label|data-hostile-output|Hostile filename probe|aria-haspopup=\"menu\"|role=\"menu\"|role=\"menuitem\"|role=\"menuitemradio\"|aria-checked=\"true\"|data-l10n-key=\"settings\"|data-l10n-key=\"themeSystem\"|data-l10n-key=\"themeLight\"|data-l10n-key=\"themeDark\"|data-l10n-key=\"languageEnglish\"|data-l10n-key=\"languagePortugueseBrazil\"".split('|') {
        assert!(html.contains(expected), "{expected}");
    }
    for forbidden in "<a |onclick=|https://|http://|<style|<script>".split('|') {
        assert!(!html.contains(forbidden), "{forbidden}");
    }
}

#[test]
fn renderer_contract_covers_final_review_accessibility_and_safety_copy() {
    // Given: the checked-in renderer and design system text.
    let html = INDEX_HTML;
    let app = APP_JS;
    let css = STYLES_CSS;

    // When: the final-review invariants are inspected statically.
    // Then: identity, localized ARIA, APG menus, mapping status, and safety copy stay locked.
    for expected in [
        "metaTitle: \"Subtitle Renamer\"",
        "appTitle: \"Subtitle Renamer\"",
        "supportedExtensions",
        "mkv, mp4, avi, mov, m4v, webm",
        "ass, ssa, srt, vtt",
        "existing targets are not overwritten",
        "destinos existentes não são sobrescritos",
        "progressLabel",
        "statusRegionLabel",
        "copyReviewLabel",
        "confirmCopyLabel",
        "outcomesLabel",
        "actionsLabel",
        "hostileProbeLabel",
    ] {
        assert!(app.contains(expected), "{expected}");
    }
    for forbidden in [
        "metaTitle: \"Renomeador de Legendas\"",
        "appTitle: \"Renomeador de Legendas\"",
    ] {
        assert!(!app.contains(forbidden), "{forbidden}");
    }
    for expected in [
        "data-l10n-aria-label=\"theme\"",
        "data-l10n-aria-label=\"language\"",
        "data-l10n-aria-label=\"progressLabel\"",
        "data-l10n-aria-label=\"statusRegionLabel\"",
        "data-l10n-aria-label=\"copyReviewLabel\"",
        "data-l10n-aria-label=\"confirmCopyLabel\"",
        "data-l10n-aria-label=\"outcomesLabel\"",
        "data-l10n-aria-label=\"actionsLabel\"",
        "data-l10n-aria-label=\"hostileProbeLabel\"",
        "<table class=\"mapping-table\"",
        "data-planned-list",
        "data-skipped-list",
    ] {
        assert!(html.contains(expected), "{expected}");
    }
    for expected in [
        "--focus-ring: 0 0 0 3px color-mix(in srgb, var(--color-action) 28%, transparent);",
        ".settings-menu [role=\"menu\"]",
        ".mapping-table",
        ".status-pill",
    ] {
        assert!(css.contains(expected), "{expected}");
    }
}

#[test]
fn shell_plan_state_exposes_data_has_plan_from_current_plan() {
    // Given: the checked-in shell controller.
    let app = APP_JS;

    // When: the plan state wiring is inspected statically.
    // Then: currentPlan drives a shell data-has-plan marker.
    assert!(app.contains("state.currentPlan"));
    assert!(app.contains("dataset.hasPlan"));
}

#[test]
fn shell_preserves_review_and_restart_actions_when_a_plan_exists() {
    // Given: the checked-in shell HTML and stylesheet.
    let html = INDEX_HTML;
    let css = STYLES_CSS;

    // When: the choose-step preserved-plan surface is inspected statically.
    // Then: review-plan and start-over stay visible when a plan exists.
    assert!(html.contains("data-action=\"review-plan\""));
    assert!(html.contains("data-action=\"start-over\""));
    assert!(css.contains(
        ".shell[data-visible-step=\"choose-folder\"][data-has-plan=\"true\"] .action-bar"
    ));
    assert!(css.contains(".shell[data-visible-step=\"choose-folder\"][data-has-plan=\"true\"] [data-action=\"review-plan\"]"));
    assert!(css.contains(".shell[data-visible-step=\"choose-folder\"][data-has-plan=\"true\"] [data-action=\"start-over\"]"));
}

#[test]
fn shell_restores_status_visibility_only_for_the_default_app_viewport() {
    // Given: the checked-in shell stylesheet.
    let css = STYLES_CSS;

    // When: the status visibility contract is inspected statically.
    // Then: the wide reference view may stay hidden, while the default app viewport regains visibility.
    assert!(css.contains(".status-line {"));
    assert!(css.contains("position: absolute;"));
    assert!(css.contains("clip-path: inset(50%);"));
    assert!(css.contains("white-space: nowrap;"));
    assert!(css.contains("@media (max-width: 900px)") || css.contains("@media (width <= 900px)"));
    assert!(css.contains("position: static;"));
    assert!(css.contains("clip-path: none;"));
}

#[test]
fn shell_aria_labels_move_supported_files_plan_counts_and_maps_to_into_l10n_bindings() {
    // Given: the checked-in shell HTML and renderer script.
    let html = INDEX_HTML;
    let app = APP_JS;

    // When: the accessible names are inspected statically.
    // Then: supported files, plan counts, and maps to use localized aria-label bindings.
    for expected in [
        "Supported files",
        "Plan counts",
        "Maps to",
        "supportedFilesLabel",
        "planCountsLabel",
        "mapsToLabel",
    ] {
        assert!(app.contains(expected), "{expected}");
    }
    for expected in [
        "data-l10n-aria-label=\"supportedFilesLabel\"",
        "data-l10n-aria-label=\"planCountsLabel\"",
        "data-l10n-aria-label=\"mapsToLabel\"",
    ] {
        assert!(html.contains(expected), "{expected}");
    }
}

#[test]
fn shell_layout_marks_visible_step_and_dual_select_folder_actions() {
    // Given: the checked-in shell HTML and app controller.
    let html = INDEX_HTML;
    let app = APP_JS;

    // When: the three-step shell wiring is inspected statically.
    // Then: the shell exposes the visible-step marker and two select-folder actions.
    assert!(html.contains("data-visible-step"));
    assert!(app.contains("dataset.visibleStep"));
    assert_eq!(html.matches("data-action=\"select-folder\"").count(), 2);
    assert!(app.contains("[data-action='select-folder']"));
}

#[test]
fn shell_layout_locks_geometry_copy_safety_and_real_content_contracts() {
    // Given: the checked-in shell HTML, controller, and CSS.
    let html = INDEX_HTML;
    let app = APP_JS;
    let css = STYLES_CSS;

    // When: the screenshot-faithful layout contract is inspected statically.
    // Then: the geometry, extension lists, and copy safety stay locked.
    for expected in ["50px", "68px", "61px"] {
        assert!(css.contains(expected), "{expected}");
    }
    for expected in ["672px", "896px"] {
        assert!(css.contains(expected), "{expected}");
    }
    for expected in [
        "mkv, mp4, avi, mov, m4v, webm",
        "ass, ssa, srt, vtt",
        "copy subtitle contents",
        "existing targets are not overwritten",
        "doesn't rename, move, or delete source subtitle files",
    ] {
        assert!(
            html.contains(expected) || app.contains(expected),
            "{expected}"
        );
    }
}

#[test]
fn shell_layout_excludes_reference_only_metadata_and_fake_review_states() {
    // Given: the checked-in shell HTML, controller, and CSS.
    let html = INDEX_HTML;
    let app = APP_JS;
    let css = STYLES_CSS;

    // When: the reference-only screenshot details are inspected statically.
    // Then: the shell does not leak SubMatch branding, fake metadata, or unsupported review states.
    for forbidden in [
        "SubMatch",
        "drag/drop",
        "drag and drop",
        "last-used",
        "last used",
        "confidence",
        "% match",
        "file size",
        "sample path",
        "fake sample",
        "unsupported review",
        "unsupported-review",
    ] {
        assert!(!html.contains(forbidden), "{forbidden}");
        assert!(!app.contains(forbidden), "{forbidden}");
        assert!(!css.contains(forbidden), "{forbidden}");
    }
}

#[test]
fn design_keeps_layout_screenshots_as_read_only_reference_guidance() {
    // Given: the design system carries renderer constraints.
    // When: reference image guidance is inspected.
    // Then: layout screenshots remain reference-only evidence, not generated output.
    assert!(DESIGN.contains("layout/"));
    assert!(DESIGN.contains("read-only reference"));
}

#[test]
fn static_frontend_contract_has_no_server_commands() {
    // Given: the desktop package configuration.

    // When: the static frontend contract is inspected.
    // Then: it points to the checked-in UI without development tooling.
    assert!(CONFIG.contains("\"frontendDist\": \"../../ui\""));
    assert!(CONFIG.contains("\"mainBinaryName\": \"subtitle-renamer-desktop\""));
    for forbidden_key in ["devUrl", "beforeDevCommand", "beforeBuildCommand"] {
        assert!(!CONFIG.contains(forbidden_key), "{forbidden_key}");
    }
}

#[test]
fn desktop_configuration_matches_the_locked_policy() {
    // Given: the source desktop configuration.
    // When: the complete package and security policy is parsed.
    let result = validate_config(CONFIG);

    // Then: only the approved static, unsigned desktop policy is accepted.
    assert_eq!(result, Ok(()));
}

#[test]
fn default_capability_grants_only_core_to_main() {
    // Given: the source default capability.
    // When: its window and permission scope is parsed.
    let result = validate_capability(CAPABILITY);

    // Then: no filesystem, shell, dialog, HTTP, opener, or asset scope exists.
    assert_eq!(result, Ok(()));
}

#[test]
fn configuration_guard_rejects_forbidden_policy_changes() {
    // Given: valid JSON mutations representing common policy regressions.
    let cases = [
        CONFIG.replace(CSP, "default-src 'self'; script-src 'self' 'unsafe-inline'"),
        CONFIG.replace(CSP, "default-src 'self'; connect-src https://example.com"),
        CONFIG.replace("de.lidco.subtitlerenamer", "com.example.stale"),
        CONFIG.replace(
            "\"frontendDist\": \"../../ui\"",
            "\"frontendDist\": \"https://example.com\"",
        ),
        CONFIG.replace(
            "\"frontendDist\": \"../../ui\"",
            "\"frontendDist\": \"../../ui\", \"devUrl\": \"http://localhost:1420\"",
        ),
        CONFIG.replace(
            "\"active\": true",
            "\"active\": true, \"createUpdaterArtifacts\": true",
        ),
        CONFIG.replace("\"active\": true", "\"active\": true, \"release\": {}"),
        CONFIG.replace("\"active\": true", "\"active\": true, \"macOS\": {}"),
        CONFIG.replace("\"active\": true", "\"active\": true, \"iOS\": {}"),
        CONFIG.replace("\"active\": true", "\"active\": true, \"android\": {}"),
        CONFIG.replace(
            "\"windows\": {",
            "\"windows\": { \"signCommand\": \"signer %1\",",
        ),
        CONFIG.replace("\"nsis\", \"deb\", \"appimage\"", "\"msi\", \"rpm\""),
    ];

    // When: each mutation is parsed by the same guard as the source config.
    // Then: every forbidden source, identity, platform, updater, signing, dev, or target change fails.
    for case in cases {
        assert!(validate_config(&case).is_err(), "{case}");
    }
}

#[test]
fn capability_guard_rejects_escalation_and_scopes() {
    // Given: valid JSON capability mutations with broader frontend authority.
    let cases = [
        CAPABILITY.replace(
            "\"core:default\"",
            "\"core:default\", \"fs:allow-read-file\"",
        ),
        CAPABILITY.replace("\"core:default\"", "\"shell:allow-execute\""),
        CAPABILITY.replace("\"core:default\"", "\"dialog:allow-open\""),
        CAPABILITY.replace("\"core:default\"", "\"http:default\""),
        CAPABILITY.replace("\"core:default\"", "\"opener:default\""),
        CAPABILITY.replace("\"core:default\"", "\"core:protocol:allow-asset\""),
        CAPABILITY.replace("\"windows\": [\"main\"]", "\"windows\": [\"*\"]"),
        CAPABILITY.replace(
            "\"windows\": [\"main\"]",
            "\"windows\": [\"main\"], \"platforms\": [\"linux\"]",
        ),
        CAPABILITY.replace(
            "\"windows\": [\"main\"]",
            "\"windows\": [\"main\"], \"remote\": { \"urls\": [\"https://example.com\"] }",
        ),
    ];

    // When: each mutation is parsed by the source capability guard.
    // Then: permissions, wildcard windows, platform filters, and remote scopes all fail.
    for case in cases {
        assert!(validate_capability(&case).is_err(), "{case}");
    }
}

#[test]
fn configured_icon_files_exist() {
    // Given: the icons declared by the desktop configuration.
    let manifest_directory = Path::new(env!("CARGO_MANIFEST_DIR"));

    // When: the package checks its configured asset paths.
    // Then: every platform icon is present beside the manifest.
    for icon_path in
        "icons/32x32.png|icons/128x128.png|icons/128x128@2x.png|icons/icon.icns|icons/icon.ico"
            .split('|')
    {
        assert!(manifest_directory.join(icon_path).is_file(), "{icon_path}");
    }
}
