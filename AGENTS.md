# Repository Instructions

Rust 2024 workspace with three crates: `subtitle-renamer` in `crates/core`, `subtitle-renamer-cli` in `crates/cli`, and `subtitle-renamer-desktop` in `crates/desktop`. The root default member is the CLI, so root `cargo run -- [DIR]` still runs `subtitle-renamer`.

## Commands

- Run the CLI against a directory: `cargo run -- [DIR]`
- Focused CLI contract tests: `cargo test -p subtitle-renamer-cli --test cli --locked`
- Focused core engine tests: `cargo test -p subtitle-renamer --test engine --locked`
- Focused desktop tests: `cargo test -p subtitle-renamer-desktop --locked`
- Full workspace test suite: `cargo test --workspace --locked`
- Format check: `cargo fmt --all --check`
- Core and CLI lint gate: `cargo clippy -p subtitle-renamer -p subtitle-renamer-cli --all-targets --all-features -- -D warnings`
- Desktop lint gate, when Tauri prerequisites are installed: `cargo clippy -p subtitle-renamer-desktop --all-targets --all-features -- -D warnings`

## Architecture Boundaries

- `crates/cli/src/main.rs`: CLI entry and orchestration only.
- `crates/cli/src/interaction.rs`: preview output and confirmation handling.
- `crates/cli/tests/cli.rs`: compiled-binary behavior contract, not just library behavior.
- `crates/core/src/matcher.rs`: filename parsing, compatibility checks, matching keys, and ambiguity rules.
- `crates/core/src/renamer.rs`: direct file discovery and execution flow.
- `crates/core/src/renamer/planning.rs`: deterministic copy plan plus skip precedence.
- `crates/core/tests/engine.rs`: public engine planning and execution contract.
- `crates/desktop/src/commands.rs`: Tauri command orchestration.
- `crates/desktop/src/controller.rs`: desktop plan lifecycle controller.
- `crates/desktop/src/dto.rs`: desktop response DTO mapping.
- `crates/desktop/tauri.conf.json`: desktop application configuration.
- `crates/desktop/tests/commands.rs`, `crates/desktop/tests/controller.rs`, `crates/desktop/tests/dto.rs`, and `crates/desktop/tests/foundation.rs`: desktop command, controller, DTO, and configuration contracts.

## Behavior Invariants

- Directory scanning is non-recursive and only considers direct files.
- The operation copies subtitle files. It must not rename, move, or delete sources.
- Source subtitle files remain after a successful operation.
- Each non-empty copy plan gets one preview and one confirmation prompt; zero-copy plans print `No files to copy.` without reading stdin.
- Only `y` or `yes` confirms. Everything else declines.
- `create_new` must still prevent overwrites at execution time.
- The first copy failure stops the batch and reports completed, failed, and pending work.

## Matching Traps

- Supported video extensions: `mkv`, `mp4`, `avi`, `mov`, `m4v`, `webm`.
- Supported subtitle extensions: `ass`, `ssa`, `srt`, `vtt`.
- A seasonless key can match the same episode across seasons and become ambiguous.
- Distinct parsed identifiers for one candidate cause a multi-identifier skip.
- Strict bare episode numbers match only at the filename end or before trailing bracket metadata.
- Duplicate target candidates are all skipped, not picked by order.

## Tests

- Unit coverage lives inline with the Rust modules in each crate.
- Core engine integration coverage lives in `crates/core/tests/engine.rs`.
- CLI integration coverage lives in `crates/cli/tests/cli.rs` and runs the compiled binary.
- `crates/cli/tests/cli.rs` includes Unix-only non-UTF filename coverage.
- Desktop integration coverage lives in `crates/desktop/tests/`.
