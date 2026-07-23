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
