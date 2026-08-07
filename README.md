# Subtitle Renamer

Copy subtitle files to video-matching filenames without renaming, moving, or deleting the originals.

[![CI](https://github.com/leandrolid/subtitle-renamer/actions/workflows/ci.yml/badge.svg)](https://github.com/leandrolid/subtitle-renamer/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/leandrolid/subtitle-renamer)](https://github.com/leandrolid/subtitle-renamer/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Português (Brasil)](README.pt-BR.md)

## Why Subtitle Renamer?

Media players usually discover subtitles when the subtitle and video filenames match. Subtitle Renamer finds episode identifiers, previews the safe copies it can make, and creates matching subtitle filenames while preserving every source file.

```text
Show.S01E02.1080p.mkv
Subtitle.S01E02.en.srt

becomes

Show.S01E02.1080p.mkv
Show.S01E02.1080p.srt    <- new copy
Subtitle.S01E02.en.srt   <- original preserved
```

## Features

- CLI and desktop interfaces
- Preview and confirmation before copying
- No overwrite, move, rename, or delete operations
- Deterministic handling of ambiguous and duplicate matches
- Episode matching for `episode N`, `ep N`, `S01E02`, `1x02`, and strict trailing episode numbers
- Native release packages for Linux and Windows

## Install

Download the latest package for your platform from [GitHub Releases](https://github.com/leandrolid/subtitle-renamer/releases/latest).

| Platform | Desktop | CLI |
| --- | --- | --- |
| Windows x86_64 | NSIS installer (`*-windows-x86_64-nsis.exe`) | Executable (`*-windows-x86_64.exe`) |
| Linux x86_64 | Debian package (`*.deb`) or AppImage (`*.AppImage`) | Executable (`*-linux-x86_64`) |

Release assets are unsigned. Check the downloaded files against `checksums.txt` before running them:

```bash
sha256sum -c checksums.txt
```

On Linux, make the CLI or AppImage executable first:

```bash
chmod +x subtitle-renamer-*-linux-x86_64*
```

### Build From Source

[Install Rust](https://www.rust-lang.org/tools/install), clone the repository, and install the CLI:

```bash
git clone https://github.com/leandrolid/subtitle-renamer.git
cd subtitle-renamer
cargo install --path crates/cli --locked
```

Desktop source builds additionally require Node.js 24 and the [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/) for your platform. See [Contributing](CONTRIBUTING.md#desktop-development) for the development commands.

## Use The CLI

Run it with a directory, or omit the directory to scan the current one:

```bash
subtitle-renamer /path/to/episodes
subtitle-renamer
```

The scan is non-recursive and considers direct files only. The CLI prints every planned copy and skip, then asks once for confirmation. Only `y` or `yes`, case-insensitive, proceeds.

```text
COPY: "Subtitle.S01E02.en.srt" -> "Show.S01E02.1080p.srt"

Copy 1 file(s)? [y/N]
```

Run `subtitle-renamer --help` for the complete matching summary.

## Supported Files

| Type | Extensions |
| --- | --- |
| Video | `mkv`, `mp4`, `avi`, `mov`, `m4v`, `webm` |
| Subtitle | `ass`, `ssa`, `srt`, `vtt` |

Unsupported extensions are ignored. A target uses the video stem and the source subtitle extension:

```text
<video stem>.<subtitle extension>
```

## Safety Guarantees

- Source subtitles always remain in place.
- Existing target files are never overwritten.
- Ambiguous matches and duplicate targets are skipped instead of guessed.
- A non-empty plan is shown before any copy begins.
- The first copy failure stops the batch and reports completed, failed, and pending work.

Common skips include no matching video, ambiguous seasonless matches, multiple identifiers in one filename, an existing destination, and multiple subtitles competing for one target.

## Contributing

Bug reports and focused pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, architecture boundaries, and quality gates. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Report security vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## License

Licensed under the [MIT License](LICENSE).
