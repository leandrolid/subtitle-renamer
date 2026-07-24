use std::io::{self, BufRead, Write};
use std::path::Path;

pub(crate) struct RenameLine<'a>(pub(crate) &'a Path, pub(crate) &'a Path);
pub(crate) struct SkippedSubtitle<'a>(pub(crate) &'a str, pub(crate) &'a Path);

pub(crate) struct FailedRename<'a>(
    pub(crate) &'a Path,
    pub(crate) &'a Path,
    pub(crate) &'a io::Error,
);

pub(crate) fn render_preview<W: Write>(
    writer: &mut W,
    renames: &[RenameLine<'_>],
    skips: &[SkippedSubtitle<'_>],
) -> io::Result<()> {
    for RenameLine(source, target) in renames {
        write!(writer, "COPY: ")?;
        write_mapping(writer, source, target)?;
        writeln!(writer)?;
    }
    for SkippedSubtitle(reason, source) in skips {
        write!(writer, "SKIP [{reason}]: ")?;
        write_filename(writer, source)?;
        writeln!(writer)?;
    }
    Ok(())
}

pub(crate) fn render_partial_report<W: Write>(
    writer: &mut W,
    completed: &[RenameLine<'_>],
    failed: &FailedRename<'_>,
    pending: &[RenameLine<'_>],
) -> io::Result<()> {
    for RenameLine(source, target) in completed {
        write!(writer, "COMPLETED: ")?;
        write_mapping(writer, source, target)?;
        writeln!(writer)?;
    }
    write!(writer, "FAILED [copy]: ")?;
    write_mapping(writer, failed.0, failed.1)?;
    writeln!(writer, ": {}", failed.2)?;
    for RenameLine(source, target) in pending {
        write!(writer, "PENDING: ")?;
        write_mapping(writer, source, target)?;
        writeln!(writer)?;
    }
    Ok(())
}

pub(crate) fn render_success<W: Write>(writer: &mut W, count: usize) -> io::Result<()> {
    writeln!(writer, "Copied {count} file(s).")
}

pub(crate) fn confirm_rename<R: BufRead, W: Write>(
    reader: &mut R,
    writer: &mut W,
    count: usize,
) -> io::Result<bool> {
    if count == 0 {
        writeln!(writer, "No files to copy.")?;
        return Ok(false);
    }
    write!(writer, "Copy {count} file(s)? [y/N] ")?;
    writer.flush()?;
    let mut line = String::new();
    if reader.read_line(&mut line)? == 0 {
        return Err(io::ErrorKind::UnexpectedEof.into());
    }
    let answer = line.trim();
    Ok(answer.eq_ignore_ascii_case("y") || answer.eq_ignore_ascii_case("yes"))
}

fn write_mapping<W: Write>(writer: &mut W, source: &Path, target: &Path) -> io::Result<()> {
    write_filename(writer, source)?;
    write!(writer, " -> ")?;
    write_filename(writer, target)
}

fn write_filename<W: Write>(writer: &mut W, path: &Path) -> io::Result<()> {
    let name = path.file_name().unwrap_or(path.as_os_str());
    write!(writer, "\"{}\"", name.to_string_lossy().escape_default())
}

#[cfg(test)]
mod tests {
    use std::io::{self, BufRead, Cursor, Read, Write};
    use std::path::Path;

    use super::*;

    #[test]
    fn renders_preview_mappings_and_all_skip_reasons_with_escaped_filenames() {
        let renames = [RenameLine(
            Path::new("bad\"name\\\n.srt"),
            Path::new("target\tname.srt"),
        )];
        let skips = [
            "no-match",
            "ambiguous",
            "multi-identifier",
            "already-correct",
            "duplicate-target",
            "existing-destination",
            "unsupported-name",
        ]
        .map(|reason| SkippedSubtitle(reason, Path::new(reason)));
        let mut output = Vec::new();
        render_preview(&mut output, &renames, &skips).expect("preview renders");
        assert_eq!(
            text(output),
            concat!(
                r#"COPY: "bad\"name\\\n.srt" -> "target\tname.srt""#,
                "\nSKIP [no-match]: \"no-match\"",
                "\nSKIP [ambiguous]: \"ambiguous\"",
                "\nSKIP [multi-identifier]: \"multi-identifier\"",
                "\nSKIP [already-correct]: \"already-correct\"",
                "\nSKIP [duplicate-target]: \"duplicate-target\"",
                "\nSKIP [existing-destination]: \"existing-destination\"",
                "\nSKIP [unsupported-name]: \"unsupported-name\"\n",
            ),
        );
    }

    #[cfg(unix)]
    #[test]
    fn renders_non_utf_unix_filename_as_one_escaped_line() {
        use std::ffi::OsString;
        use std::os::unix::ffi::OsStringExt;
        use std::path::PathBuf;

        let source = PathBuf::from(OsString::from_vec(b"bad\xff\nname.srt".to_vec()));
        let target = PathBuf::from(OsString::from_vec(b"good\xff.srt".to_vec()));
        let mut output = Vec::new();
        render_preview(&mut output, &[RenameLine(&source, &target)], &[]).expect("preview renders");
        assert_eq!(
            text(output),
            r#"COPY: "bad\u{fffd}\nname.srt" -> "good\u{fffd}.srt"
"#,
        );
    }

    #[test]
    fn renders_copy_success_completed_failed_and_pending_reports() {
        let completed = [line("done.srt", "done.mkv.srt")];
        let pending = [line("next.srt", "next.mkv.srt")];
        let copy_error = io::Error::other("copy denied");
        let mut output = Vec::new();
        render_success(&mut output, 3).expect("success renders");
        render_partial_report(
            &mut output,
            &completed,
            &failed("bad.srt", "bad.mkv.srt", &copy_error),
            &pending,
        )
        .expect("first report renders");
        render_partial_report(
            &mut output,
            &[],
            &failed("stuck.srt", "stuck.mkv.srt", &copy_error),
            &[],
        )
        .expect("second report renders");
        assert_eq!(
            text(output),
            concat!(
                "Copied 3 file(s).\n",
                r#"COMPLETED: "done.srt" -> "done.mkv.srt""#,
                "\n",
                r#"FAILED [copy]: "bad.srt" -> "bad.mkv.srt": copy denied"#,
                "\n",
                r#"PENDING: "next.srt" -> "next.mkv.srt""#,
                "\n",
                r#"FAILED [copy]: "stuck.srt" -> "stuck.mkv.srt": copy denied"#,
                "\n",
            ),
        );
    }

    #[test]
    fn accepts_y_and_yes_case_insensitively() {
        for input in ["y\n", "Y\n", "yes\n", "YES\n", "YeS\n"] {
            let (confirmed, output) = confirm_with(input, 2).expect("input is present");
            assert!(confirmed);
            assert_eq!(output, b"Copy 2 file(s)? [y/N] ");
        }
        let mut writer = FlushWriter(Vec::new(), false);
        assert!(confirm_rename(&mut Cursor::new(b"y\n"), &mut writer, 1).unwrap());
        assert!(writer.1);
        assert_eq!(writer.0, b"Copy 1 file(s)? [y/N] ");
        for input in ["\n", "n\n", "anything else\n"] {
            let (confirmed, output) = confirm_with(input, 1).expect("input is present");
            assert!(!confirmed);
            assert_eq!(output, b"Copy 1 file(s)? [y/N] ");
        }
    }

    #[test]
    fn eof_is_an_error_and_does_not_confirm() {
        let mut reader = Cursor::new(Vec::<u8>::new());
        let mut output = Vec::new();
        let error = confirm_rename(&mut reader, &mut output, 1).expect_err("EOF is distinct");
        assert_eq!(error.kind(), io::ErrorKind::UnexpectedEof);
        assert_eq!(output, b"Copy 1 file(s)? [y/N] ");
        let mut output = Vec::new();
        assert!(!confirm_rename(&mut ReadPanic, &mut output, 0).expect("zero count does not read"));
        assert_eq!(output, b"No files to copy.\n");
    }

    fn confirm_with(input: &str, count: usize) -> io::Result<(bool, Vec<u8>)> {
        let mut reader = Cursor::new(input.as_bytes());
        let mut output = Vec::new();
        let confirmed = confirm_rename(&mut reader, &mut output, count)?;
        Ok((confirmed, output))
    }

    fn line(source: &'static str, target: &'static str) -> RenameLine<'static> {
        RenameLine(Path::new(source), Path::new(target))
    }

    fn failed<'a>(source: &'a str, target: &'a str, error: &'a io::Error) -> FailedRename<'a> {
        FailedRename(Path::new(source), Path::new(target), error)
    }

    fn text(bytes: Vec<u8>) -> String {
        String::from_utf8(bytes).expect("rendered output is utf-8")
    }

    struct FlushWriter(Vec<u8>, bool);

    impl Write for FlushWriter {
        fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
            self.0.extend_from_slice(buf);
            Ok(buf.len())
        }

        fn flush(&mut self) -> io::Result<()> {
            self.1 = true;
            Ok(())
        }
    }

    struct ReadPanic;

    impl Read for ReadPanic {
        fn read(&mut self, _buf: &mut [u8]) -> io::Result<usize> {
            panic!("zero-count confirmation must not read")
        }
    }

    impl BufRead for ReadPanic {
        fn fill_buf(&mut self) -> io::Result<&[u8]> {
            panic!("zero-count confirmation must not read")
        }

        fn consume(&mut self, _amount: usize) {}
    }
}
