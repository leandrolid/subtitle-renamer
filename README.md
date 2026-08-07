# subtitle-renamer

Copy subtitle contents to filenames that match nearby video files, while keeping the original subtitle files in place.

```bash
cargo run -- [DIR]
```

`DIR` is optional and defaults to the current directory.
The scan only checks direct files in that directory. It doesn't recurse into subdirectories.

## supported files

Videos: `mkv`, `mp4`, `avi`, `mov`, `m4v`, `webm`
Subtitles: `ass`, `ssa`, `srt`, `vtt`
Files with unsupported extensions are ignored.

## matching

The matcher looks for episode identifiers in video and subtitle stems:
- `episode N`
- `ep N`
- `S<season>E<episode>`
- `<season>x<episode>`
- a final bare number, only at the stem end or before trailing `[metadata]`

The target path is:
```text
<video stem>.<subtitle extension>
```
Existing targets are never overwritten.

## confirmation and copies

The CLI prints a preview with `COPY` and `SKIP` lines. A non-empty copy plan gets one batch confirmation; otherwise it prints `No files to copy.` without reading input.
Only `y` or `yes`, case-insensitive, proceeds. Anything else declines.
The operation copies subtitle contents. It doesn't rename, move, or delete source subtitle files.
The first copy failure stops the batch and reports completed, failed, and pending work.

## common skips

- no matching video
- ambiguous seasonless match across seasons
- multiple distinct identifiers in one filename
- subtitle already has the target name
- more than one subtitle would create the same target
- destination file already exists
- supported subtitle with a non-UTF stem (`unsupported-name`); non-UTF video stems are excluded from matching

## tests
```bash
cargo test --workspace --locked
cargo test -p subtitle-renamer-cli --test cli --locked
```

## build and run locally

### CLI

Debug build:
```bash
cargo build
./target/debug/subtitle-renamer [DIR]
```

Release build:
```bash
cargo build --release
./target/release/subtitle-renamer [DIR]
```

`DIR` works the same as `cargo run -- [DIR]`: it points at the directory to scan, defaults to the current directory, and only direct files are checked. Matching subtitle contents are copied to video-matched subtitle filenames. Source subtitle files stay in place.

### Desktop app

The desktop app uses the [create-tauri-app](https://tauri.app) pattern: a React + TypeScript + Vite frontend at the workspace root alongside the Tauri backend in `crates/desktop`.

**Prerequisites** — Node.js 24 and either `cargo tauri` or `@tauri-apps/cli` (installed via npm). If `cargo tauri` is missing, install the pinned CLI:
```bash
cargo install tauri-cli --version 2.11.4 --locked
```

Install frontend dependencies (first time only, installs locked dependencies reproducibly):
```bash
npm ci --ignore-scripts
```

#### Development

Launch the app with hot-reload from the workspace root:
```bash
npm run tauri dev
# or equivalently:
cd crates/desktop && cargo tauri dev
```

This starts the Vite dev server on `http://localhost:1420` and opens the Tauri window pointing at it.

#### Quality gates

Run the desktop quality gates from the workspace root:
```bash
cargo fmt --all --check
cargo clippy -p subtitle-renamer-desktop --all-targets --all-features -- -D warnings
cargo test -p subtitle-renamer-desktop --locked
```

Build and type-check the frontend only:
```bash
npm run build
```

#### Production builds

Build the debug app without bundles from `crates/desktop`:
```bash
cd crates/desktop
cargo tauri build --debug --no-bundle --ci --no-sign
```

The debug executable is written to `target/debug/subtitle-renamer-desktop`. Run it directly from the workspace root after the build:
```bash
./target/debug/subtitle-renamer-desktop
```

Build Linux packages from `crates/desktop`:
```bash
cd crates/desktop
cargo tauri build --ci --no-sign --bundles deb,appimage
```

The normal local package outputs are:
- `target/release/bundle/deb/*.deb`
- `target/release/bundle/appimage/*.AppImage`

Install and run the deb:
```bash
sudo apt install ./target/release/bundle/deb/*.deb
subtitle-renamer-desktop
```

Run the AppImage:
```bash
chmod +x ./target/release/bundle/appimage/*.AppImage
./target/release/bundle/appimage/*.AppImage
```

Prior local Docker package proof cached deb and AppImage files under `.omo/docker-output/release/bundle/...`. That is ignored session output, not the durable default output path.

## releases

### current version

v0.1.0 is already aligned across all four version-bearing files: `Cargo.toml` (`[workspace.package] version`), `crates/desktop/tauri.conf.json` (`"version"`), `package.json`, and both version fields in `package-lock.json`. The maintainer creates and pushes the tag to trigger the workflow.

### bumping to a later version (e.g., v1.2.3)

1. Edit `Cargo.toml` `[workspace.package] version` and `crates/desktop/tauri.conf.json` `"version"` to `1.2.3`.
2. Run `npm version 1.2.3 --no-git-tag-version` — updates `package.json` and both `package-lock.json` version fields without creating a commit or tag.
3. Run `cargo check --workspace --locked` to verify (omit `--locked` only if the workspace-version change requires refreshing `Cargo.lock`, then inspect the exact lock diff).
4. Run all quality gates from `AGENTS.md`.
5. Commit the source bump.
6. Merge that commit to `main`.
7. From the merged `main`, create an annotated strict SemVer tag and push it:
   ```bash
   git tag -a v1.2.3 -m "v1.2.3"
   git push origin v1.2.3
   ```
8. The `package.yml` workflow runs: prepare, build, smoke tests, then the release job publishes.

### manual dispatch

Running the workflow via manual dispatch (`workflow_dispatch`) runs prepare, builds, and smoke tests but never starts the release job. It's not a publishing trigger.

### release assets

Each release publishes five versioned assets plus a checksum file:

- `subtitle-renamer-desktop-vX.Y.Z-windows-x86_64-nsis.exe`
- `subtitle-renamer-desktop-vX.Y.Z-linux-x86_64.deb`
- `subtitle-renamer-desktop-vX.Y.Z-linux-x86_64.AppImage`
- `subtitle-renamer-cli-vX.Y.Z-windows-x86_64.exe`
- `subtitle-renamer-cli-vX.Y.Z-linux-x86_64`
- `checksums.txt`

Verify checksums after downloading:
```bash
sha256sum -c checksums.txt
```

Linux assets need an executable bit before running:
```bash
chmod +x subtitle-renamer-cli-vX.Y.Z-linux-x86_64
chmod +x subtitle-renamer-desktop-vX.Y.Z-linux-x86_64.AppImage
```

### release notes

The first release links all prior commits as history. Later releases include a comparison range link to the previous tag.

### fail-closed behavior

Any existing or draft release for the tag, and any unexpected GitHub API response, fails the release job. Partial drafts are not overwritten or auto-deleted.
