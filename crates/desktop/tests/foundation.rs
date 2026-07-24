use std::path::{Path, PathBuf};

use tauri::utils::config::{BundleType, FrontendDist, WebviewInstallMode};

const CONFIG: &str = include_str!("../tauri.conf.json");
const CAPABILITY: &str = include_str!("../capabilities/default.json");
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
fn static_frontend_contract_has_no_server_commands() {
    // Given: the desktop package configuration.
    let configuration = CONFIG;

    // When: the static frontend contract is inspected.
    // Then: it points to the checked-in UI without development tooling.
    assert!(configuration.contains("\"frontendDist\": \"../../ui\""));
    assert!(configuration.contains("\"mainBinaryName\": \"subtitle-renamer-desktop\""));
    for forbidden_key in ["devUrl", "beforeDevCommand", "beforeBuildCommand"] {
        assert!(!configuration.contains(forbidden_key), "{forbidden_key}");
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
    let icon_paths = [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico",
    ];

    // When: the package checks its configured asset paths.
    // Then: every platform icon is present beside the manifest.
    for icon_path in icon_paths {
        assert!(manifest_directory.join(icon_path).is_file(), "{icon_path}");
    }
}
