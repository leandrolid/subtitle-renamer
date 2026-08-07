# Contributing To Subtitle Renamer

Thanks for helping improve Subtitle Renamer. Bug reports, documentation fixes, and focused code changes are welcome.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities through the private process in [SECURITY.md](SECURITY.md), not through a public issue.

## Before You Start

- Search existing issues before opening a new one.
- Use the bug or feature issue form so maintainers receive the context they need.
- Discuss substantial features or behavior changes in an issue before implementing them.
- Keep pull requests focused on one problem.

## Development Setup

The repository pins Rust in `rust-toolchain.toml`. Clone it and run the CLI from the workspace root:

```bash
git clone https://github.com/leandrolid/subtitle-renamer.git
cd subtitle-renamer
cargo run -- /path/to/test-directory
```

Use disposable test data. Although the application preserves sources and prevents overwrites, development builds should not be tested first against irreplaceable files.

### Desktop Development

Install Node.js 24 and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform, then run:

```bash
npm ci --ignore-scripts
npm run tauri dev
```

The frontend uses React, TypeScript, and Vite. The Tauri backend lives in `crates/desktop`.

## Workspace Layout

| Path | Responsibility |
| --- | --- |
| `crates/core` | Filename parsing, matching, copy planning, and execution |
| `crates/cli` | CLI parsing, preview, confirmation, and terminal reports |
| `crates/desktop` | Tauri commands, desktop lifecycle, and response DTOs |
| `src` | React desktop interface |

Preserve these behavior contracts:

- Scans are non-recursive and consider direct files only.
- Operations copy subtitles; they never move, rename, or delete sources.
- Existing targets are protected both while planning and while executing.
- Ambiguous matches and duplicate targets are skipped rather than guessed.
- The first copy failure stops the batch and reports partial progress.

## Quality Gates

Run formatting and the complete test suite before opening a pull request:

```bash
cargo fmt --all --check
cargo test --workspace --locked
```

Run the Rust lint gates for the areas you changed:

```bash
cargo clippy -p subtitle-renamer -p subtitle-renamer-cli --all-targets --all-features -- -D warnings
cargo clippy -p subtitle-renamer-desktop --all-targets --all-features -- -D warnings
```

The desktop lint gate requires the Tauri system dependencies. For frontend changes, also run:

```bash
npm run build
```

Add or update tests for behavior changes. Core integration contracts live in `crates/core/tests/engine.rs`, CLI binary contracts in `crates/cli/tests/cli.rs`, and desktop contracts in `crates/desktop/tests`.

## Pull Requests

- Explain the problem and the chosen solution.
- Link the issue with `Fixes #123` or `Refs #123` when one exists.
- Include the commands you ran and their results.
- Update user documentation when behavior, installation, or workflows change.
- Do not include generated build output or files under `.omo`.
- Confirm that source subtitles remain protected by the change.

Maintainers may ask for changes to keep behavior deterministic, safe, and consistent across the CLI and desktop interfaces.

## Releases

Releases are maintainer-driven. The project publishes strict SemVer tags (`vX.Y.Z`) after all version-bearing files are aligned and quality gates pass. A pushed release tag builds, smoke-tests, checksums, and publishes the Linux and Windows assets through `.github/workflows/package.yml`.
