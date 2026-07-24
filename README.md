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
cargo test
cargo test --test cli
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

The desktop app is the separate Tauri package in `src-tauri`. If `cargo tauri` is missing, install the pinned CLI used by the package workflow:
```bash
cargo install tauri-cli --version 2.11.4 --locked
```

Run the desktop quality gates from the repository root:
```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

Launch the local app from source:
```bash
cargo run --manifest-path src-tauri/Cargo.toml
```

Build the debug app without bundles from `src-tauri`:
```bash
cd src-tauri
cargo tauri build --debug --no-bundle --ci --no-sign
```

The normal debug executable is written to `src-tauri/target/debug/subtitle-renamer`. Run it directly from the repository root after the build:
```bash
./src-tauri/target/debug/subtitle-renamer
```

Build Linux packages from `src-tauri`:
```bash
cd src-tauri
cargo tauri build --ci --no-sign --bundles deb,appimage
```

The normal local package outputs are:
- `src-tauri/target/release/bundle/deb/*.deb`
- `src-tauri/target/release/bundle/appimage/*.AppImage`

Install and run the deb:
```bash
sudo apt install ./src-tauri/target/release/bundle/deb/*.deb
subtitle-renamer
```

Run the AppImage:
```bash
chmod +x ./src-tauri/target/release/bundle/appimage/*.AppImage
./src-tauri/target/release/bundle/appimage/*.AppImage
```

Prior local Docker package proof cached deb and AppImage files under `.omo/docker-output/release/bundle/...`. That is ignored session output, not the durable default output path.

GitHub workflow artifacts are separate from local builds. The package workflow uploads CI artifacts from `src-tauri/target/release/bundle/...` when it runs on tags or manual dispatch. Local commands here do not start a GitHub workflow, publish a release, push commits, or upload artifacts.
