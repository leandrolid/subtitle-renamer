const PACKAGE_YML: &str = include_str!("../../../.github/workflows/package.yml");
const CI_YML: &str = include_str!("../../../.github/workflows/ci.yml");
const RELEASE_METADATA_SH: &str = include_str!("../../../.github/scripts/release-metadata.sh");
const PREPARE_RELEASE_SH: &str = include_str!("../../../.github/scripts/prepare-release.sh");
const RUST_TOOLCHAIN: &str = include_str!("../../../rust-toolchain.toml");
const NODE_VERSION: &str = include_str!("../../../.node-version");
const CARGO_TOML: &str = include_str!("../../../Cargo.toml");
const TAURI_CONF: &str = include_str!("../../../crates/desktop/tauri.conf.json");
const PACKAGE_JSON: &str = include_str!("../../../package.json");
const PACKAGE_LOCK: &str = include_str!("../../../package-lock.json");

fn count(h: &str, n: &str) -> usize {
    let mut c = 0;
    let mut s = 0;
    while let Some(p) = h[s..].find(n) {
        c += 1;
        s += p + n.len();
    }
    c
}

fn has_active_line(text: &str, needle: &str) -> bool {
    text.lines()
        .any(|l| !l.trim().starts_with('#') && l.trim().contains(needle))
}

fn sha_pinned_uses(yml: &str) -> Result<(), String> {
    for line in yml.lines() {
        let t = line.trim();
        let val = if let Some(v) = t.strip_prefix("uses:") {
            v.trim()
        } else if let Some(v) = t.strip_prefix("- uses:") {
            v.trim()
        } else {
            continue;
        };
        let after = val
            .split('@')
            .nth(1)
            .ok_or_else(|| format!("uses: no @ pin: {t}"))?;
        let sha = after.split_whitespace().next().unwrap_or("");
        if sha.len() != 40
            || !sha
                .chars()
                .all(|c| c.is_ascii_hexdigit() && !c.is_uppercase())
        {
            return Err(format!("uses: not SHA-pinned: {t}"));
        }
    }
    Ok(())
}

fn check_policy(p: &str, meta: &str, prep: &str) -> Result<(), String> {
    if !RUST_TOOLCHAIN.contains("1.97.1") {
        return Err("rust-toolchain.toml missing 1.97.1".into());
    }
    if NODE_VERSION.trim() != "24" {
        return Err(".node-version trimmed != 24".into());
    }
    if count(CI_YML, "toolchain: 1.97.1") < 2 {
        return Err("ci.yml toolchain: 1.97.1 < 2".into());
    }
    if count(p, "toolchain: 1.97.1") < 2 {
        return Err("package.yml toolchain: 1.97.1 < 2".into());
    }
    if !has_active_line(p, "workflow_dispatch:") {
        return Err("package.yml missing workflow_dispatch:".into());
    }
    if !has_active_line(p, "push:") {
        return Err("package.yml missing push:".into());
    }
    if !has_active_line(p, "tags:") {
        return Err("package.yml missing tags:".into());
    }
    if !p.contains("\"v*\"") {
        return Err("package.yml missing \"v*\"".into());
    }
    if p.contains("branches:") {
        return Err("package.yml must not have branches:".into());
    }
    if p.contains("pull_request:") {
        return Err("package.yml must not have pull_request:".into());
    }
    for var in &[
        "${{ github.ref_name }}",
        "${{ github.ref_type }}",
        "${{ github.event_name }}",
        "${{ github.sha }}",
    ] {
        for line in p.lines() {
            let t = line.trim();
            if t.contains(var) && !t.contains(": ${{") {
                return Err(format!("{var} outside env: binding"));
            }
        }
        if count(p, var) == 0 {
            return Err(format!("package.yml missing env binding for {var}"));
        }
    }
    if !p.contains("EVENT_NAME:") || !p.contains("EVENT_REF_TYPE:") {
        return Err("package.yml missing EVENT_NAME/REF_TYPE binding".into());
    }
    if !p.contains("EVENT_REF_NAME:") || !p.contains("EVENT_SHA:") {
        return Err("package.yml missing EVENT_REF_NAME/SHA binding".into());
    }
    sha_pinned_uses(p)?;
    if !p.contains("contents: read") {
        return Err("package.yml missing contents: read".into());
    }
    if count(p, "contents: write") != 1 {
        return Err("package.yml contents: write must appear exactly once".into());
    }
    if !p.contains("smoke-windows-nsis:") || !p.contains("needs: [prepare, package-windows-nsis]") {
        return Err("package.yml smoke-windows-nsis needs missing".into());
    }
    if !p.contains("smoke-linux-deb:") || !p.contains("needs: [prepare, package-linux]") {
        return Err("package.yml smoke-linux-deb needs missing".into());
    }
    if !p.contains("smoke-linux-cli:") || !p.contains("smoke-windows-cli:") {
        return Err("package.yml smoke cli jobs missing".into());
    }
    if !p.contains("needs: [prepare, smoke-windows-nsis, smoke-windows-cli, smoke-linux-deb, smoke-linux-appimage, smoke-linux-cli]") {
        return Err("package.yml release job missing all 5 smoke needs".into());
    }
    if !p.contains("needs.prepare.outputs.publish == 'true'") {
        return Err("package.yml release job missing publish condition".into());
    }
    if !p.contains("--verify-tag") {
        return Err("package.yml missing --verify-tag".into());
    }
    if !p.contains("--draft=false") {
        return Err("package.yml missing --draft=false".into());
    }
    if p.contains("--clobber") {
        return Err("package.yml must not have --clobber".into());
    }
    if count(p, "node-version-file: .node-version") < 2 {
        return Err("package.yml node-version-file < 2".into());
    }
    if count(p, "npm ci --ignore-scripts") < 2 {
        return Err("package.yml npm ci --ignore-scripts < 2".into());
    }
    if p.contains("npm install") {
        return Err("package.yml must not have npm install".into());
    }
    if !p.contains("--paginate") {
        return Err("package.yml missing --paginate".into());
    }
    if !p.contains("--slurp") {
        return Err("package.yml missing --slurp".into());
    }
    if p.contains("/releases/tags/") {
        return Err("package.yml must not use /releases/tags/".into());
    }
    if p.contains("classify-status") {
        return Err("package.yml must not have classify-status".into());
    }
    if !meta.contains("--self-test") {
        return Err("release-metadata.sh missing --self-test".into());
    }
    if !prep.contains("verify-remote-tag") {
        return Err("prepare-release.sh missing verify-remote-tag".into());
    }
    if !prep.contains("git ls-remote --tags") {
        return Err("prepare-release.sh missing git ls-remote --tags".into());
    }
    if count(p, "verify-remote-tag") < 2 {
        return Err("package.yml verify-remote-tag < 2".into());
    }
    if !prep.contains("git log --format=") {
        return Err("prepare-release.sh missing git log --format=".into());
    }
    Ok(())
}

#[test]
fn workflow_policy_accepts_repository_files() {
    assert_eq!(
        check_policy(PACKAGE_YML, RELEASE_METADATA_SH, PREPARE_RELEASE_SH),
        Ok(())
    );
    assert!(CARGO_TOML.contains("0.1.0"), "Cargo.toml version");
    assert!(TAURI_CONF.contains("0.1.0"), "tauri.conf.json version");
    assert!(PACKAGE_JSON.contains("0.1.0"), "package.json version");
    assert!(PACKAGE_LOCK.contains("0.1.0"), "package-lock.json version");
}

#[test]
fn workflow_policy_rejects_mutations() {
    let p = PACKAGE_YML;
    let meta = RELEASE_METADATA_SH;
    let prep = PREPARE_RELEASE_SH;

    let cases: &[(&str, String, String, String)] = &[
        (
            "remove toolchain pin",
            p.replacen("toolchain: 1.97.1", "toolchain: stable", 1),
            meta.into(),
            prep.into(),
        ),
        (
            "comment workflow_dispatch",
            p.replace("workflow_dispatch:", "# workflow_dispatch:"),
            meta.into(),
            prep.into(),
        ),
        (
            "remove EVENT_NAME binding",
            p.replace("EVENT_NAME: ${{ github.event_name }}", ""),
            meta.into(),
            prep.into(),
        ),
        (
            "inject github.sha in run",
            p.replace(
                "run: bash .github/scripts/release-metadata.sh",
                "run: echo ${{ github.sha }} && bash .github/scripts/release-metadata.sh",
            ),
            meta.into(),
            prep.into(),
        ),
        (
            "unseal SHA pin",
            p.replace(
                "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683",
                "actions/checkout@v4",
            ),
            meta.into(),
            prep.into(),
        ),
        (
            "add branches trigger",
            p.replace(
                "tags:\n      - \"v*\"",
                "tags:\n      - \"v*\"\n    branches: [main]",
            ),
            meta.into(),
            prep.into(),
        ),
        (
            "npm install instead of ci",
            p.replacen("npm ci --ignore-scripts", "npm install", 1),
            meta.into(),
            prep.into(),
        ),
        (
            "remove --paginate",
            p.replace("--paginate", ""),
            meta.into(),
            prep.into(),
        ),
        (
            "drop first verify-remote-tag",
            p.replacen("verify-remote-tag", "verify-tag", 1),
            meta.into(),
            prep.into(),
        ),
        (
            "--draft=false → --draft false",
            p.replace("--draft=false", "--draft false"),
            meta.into(),
            prep.into(),
        ),
        (
            "remove contents: write",
            p.replace("contents: write", ""),
            meta.into(),
            prep.into(),
        ),
        (
            "duplicate contents: write",
            p.replace("contents: read", "contents: read\n  contents: write"),
            meta.into(),
            prep.into(),
        ),
        (
            "--slurp → --no-slurp",
            p.replace("--slurp", "--no-slurp"),
            meta.into(),
            prep.into(),
        ),
        (
            "inject /releases/tags/",
            p.replace("--paginate", "--paginate\n          # /releases/tags/"),
            meta.into(),
            prep.into(),
        ),
        (
            "remove --tags from ls-remote",
            p.into(),
            meta.into(),
            prep.replace("git ls-remote --tags", "git ls-remote"),
        ),
        (
            "remove --self-test",
            p.into(),
            meta.replace("--self-test", "--smoke-test"),
            prep.into(),
        ),
    ];

    for (desc, mp, mmeta, mprep) in cases {
        assert_ne!(
            (mp.as_str(), mmeta.as_str(), mprep.as_str()),
            (p, meta, prep),
            "mutation '{desc}' produced no change"
        );
        assert!(
            check_policy(mp, mmeta, mprep).is_err(),
            "mutation '{desc}' should fail policy"
        );
    }
}
