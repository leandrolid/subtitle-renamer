use std::{
    fs,
    io::{self, Read, Write},
    path::{Path, PathBuf},
    process::{Command, Output, Stdio},
    sync::{
        atomic::{AtomicUsize, Ordering},
        mpsc,
    },
    thread,
    time::Duration,
};

fn run(args: &[&str]) -> Output {
    Command::new(binary()).args(args).output().unwrap()
}

fn run_directory(directory: &Path, input: Option<&[u8]>) -> Output {
    let mut child = Command::new(binary())
        .arg(directory)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut stdin = child.stdin.take().unwrap();
    if let Some(input) = input {
        stdin.write_all(input).unwrap();
    }
    drop(stdin);
    child.wait_with_output().unwrap()
}

fn binary() -> PathBuf {
    std::env::var_os("CARGO_BIN_EXE_subtitle-renamer")
        .map(PathBuf::from)
        .unwrap()
}

fn stdout(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).into_owned()
}

fn stderr(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).into_owned()
}

#[test]
fn help_shows_public_contract_when_requested() {
    // Given: the compiled real binary
    // When: the user asks for help
    let output = run(&["--help"]);

    // Then: clap exits successfully and documents the public contract
    assert!(output.status.success(), "stderr: {}", stderr(&output));
    let text = stdout(&output);
    assert!(text.contains("Usage: subtitle-renamer [DIR]"), "{text}");
    assert!(text.contains("--help"), "{text}");
    assert!(text.contains("--version"), "{text}");
    assert!(text.contains("mkv, mp4, avi, mov, m4v, webm"), "{text}");
    assert!(text.contains("ass, ssa, srt, vtt"), "{text}");
    assert!(
        text.contains("episode N, ep N, S<season>E<episode>, <season>x<episode>"),
        "{text}"
    );
    assert!(
        text.contains("final bare N at stem end or before trailing [metadata]"),
        "{text}"
    );
    assert!(text.contains("Scans DIR only; does not recurse"), "{text}");
    assert!(
        text.contains(
            "Subtitle files are copied to video-matching names while originals remain untouched"
        ),
        "{text}"
    );
    assert!(text.contains("Previews planned copies"), "{text}");
    assert!(text.contains("Never overwrites existing files"), "{text}");
}

#[test]
fn version_prints_exact_line_when_long_flag_is_used() {
    // Given: the compiled real binary
    // When: the user asks for the long version flag
    let output = run(&["--version"]);

    // Then: stdout is the exact public version line
    assert!(output.status.success(), "stderr: {}", stderr(&output));
    assert_eq!(
        stdout(&output),
        format!("subtitle-renamer {}\n", env!("CARGO_PKG_VERSION"))
    );
    assert!(stderr(&output).is_empty());
}

#[test]
fn version_prints_exact_line_when_short_flag_is_used() {
    // Given: the compiled real binary
    // When: the user asks for the short version flag
    let output = run(&["-V"]);

    // Then: stdout is the exact public version line
    assert!(output.status.success(), "stderr: {}", stderr(&output));
    assert_eq!(
        stdout(&output),
        format!("subtitle-renamer {}\n", env!("CARGO_PKG_VERSION"))
    );
    assert!(stderr(&output).is_empty());
}

#[test]
fn invalid_argument_exits_two_with_usage_on_stderr() {
    // Given: the compiled real binary
    // When: the user passes an unsupported flag
    let output = run(&["--unknown"]);

    // Then: clap reports usage on stderr and exits with usage error code 2
    assert_eq!(output.status.code(), Some(2));
    assert!(stdout(&output).is_empty());
    let text = stderr(&output);
    assert!(text.contains("Usage: subtitle-renamer [DIR]"), "{text}");
    assert!(text.contains("--unknown"), "{text}");
}

#[test]
fn copies_the_example_after_confirmation() {
    // Given: one matching video and subtitle with distinct contents.
    let directory = TestDir::create();
    let video = directory.write("[anything - any] episode 01 - my tv show.mkv", b"video");
    let source = directory.write("subtitle episode 1.ass", b"subtitle bytes");
    let target = directory
        .path()
        .join("[anything - any] episode 01 - my tv show.ass");

    // When: the user confirms the rendered plan.
    let output = run_directory(directory.path(), Some(b"yes\n"));

    // Then: the subtitle remains and its target receives independent copied bytes.
    assert_eq!(output.status.code(), Some(0), "stderr: {}", stderr(&output));
    let text = stdout(&output);
    assert!(
        text.contains(
            r#"COPY: "subtitle episode 1.ass" -> "[anything - any] episode 01 - my tv show.ass""#
        ),
        "{text}"
    );
    assert!(text.ends_with("Copied 1 file(s).\n"), "{text}");
    assert!(!text.contains("COMPLETED:"), "{text}");
    assert!(stderr(&output).is_empty());
    assert_eq!(fs::read(&source).unwrap(), b"subtitle bytes");
    assert_eq!(fs::read(&target).unwrap(), b"subtitle bytes");
    assert_eq!(fs::read(&video).unwrap(), b"video");
    fs::write(&source, b"changed subtitle bytes").unwrap();
    assert_eq!(fs::read(&target).unwrap(), b"subtitle bytes");
}

#[test]
fn copies_one_pace_batch_after_one_confirmation() {
    // Given: the six One Pace fixture names with distinct bytes.
    let directory = TestDir::create();
    let first_video = directory.write(
        "[One Pace][375-376] Enies Lobby 01 [1080p][785FB818].mkv",
        b"video one",
    );
    let second_video = directory.write(
        "[One Pace][376-378] Enies Lobby 02 [1080p][495CDC31].mkv",
        b"video two",
    );
    let third_video = directory.write(
        "[One Pace][379-380] Enies Lobby 03 [1080p][861EE2FF].mkv",
        b"video three",
    );
    let first_source = directory.write("Enies Lobby 01.ass", b"subtitle one");
    let second_source = directory.write("Enies Lobby 02.ass", b"subtitle two");
    let third_source = directory.write("Enies Lobby 03.ass", b"subtitle three");
    let first_target = directory
        .path()
        .join("[One Pace][375-376] Enies Lobby 01 [1080p][785FB818].ass");
    let second_target = directory
        .path()
        .join("[One Pace][376-378] Enies Lobby 02 [1080p][495CDC31].ass");
    let third_target = directory
        .path()
        .join("[One Pace][379-380] Enies Lobby 03 [1080p][861EE2FF].ass");

    // When: the user confirms the complete batch once.
    let output = run_directory(directory.path(), Some(b"yes\n"));

    // Then: the exact ordered copy preview succeeds and sources remain independent.
    assert_eq!(output.status.code(), Some(0), "stderr: {}", stderr(&output));
    assert_eq!(
        stdout(&output),
        concat!(
            "COPY: \"Enies Lobby 01.ass\" -> \"[One Pace][375-376] Enies Lobby 01 [1080p][785FB818].ass\"\n",
            "COPY: \"Enies Lobby 02.ass\" -> \"[One Pace][376-378] Enies Lobby 02 [1080p][495CDC31].ass\"\n",
            "COPY: \"Enies Lobby 03.ass\" -> \"[One Pace][379-380] Enies Lobby 03 [1080p][861EE2FF].ass\"\n",
            "Copy 3 file(s)? [y/N] Copied 3 file(s).\n",
        )
    );
    assert!(stderr(&output).is_empty());
    assert_eq!(fs::read(&first_source).unwrap(), b"subtitle one");
    assert_eq!(fs::read(&second_source).unwrap(), b"subtitle two");
    assert_eq!(fs::read(&third_source).unwrap(), b"subtitle three");
    assert_eq!(fs::read(&first_target).unwrap(), b"subtitle one");
    assert_eq!(fs::read(&second_target).unwrap(), b"subtitle two");
    assert_eq!(fs::read(&third_target).unwrap(), b"subtitle three");
    assert_eq!(fs::read(first_video).unwrap(), b"video one");
    assert_eq!(fs::read(second_video).unwrap(), b"video two");
    assert_eq!(fs::read(third_video).unwrap(), b"video three");
    fs::write(&first_source, b"changed subtitle one").unwrap();
    fs::write(&second_source, b"changed subtitle two").unwrap();
    fs::write(&third_source, b"changed subtitle three").unwrap();
    assert_eq!(fs::read(&first_target).unwrap(), b"subtitle one");
    assert_eq!(fs::read(&second_target).unwrap(), b"subtitle two");
    assert_eq!(fs::read(&third_target).unwrap(), b"subtitle three");
}

#[test]
fn leaves_duplicate_bare_episode_videos_ambiguous() {
    // Given: one bare-key subtitle and two metadata-rich videos with the same key.
    let directory = TestDir::create();
    let first_video = directory.write(
        "[One Pace][375-376] Enies Lobby 01 [1080p][FIRST].mkv",
        b"first video",
    );
    let second_video = directory.write(
        "[One Pace][900] Other Arc 01 [720p][SECOND].mp4",
        b"second video",
    );
    let subtitle = directory.write("Enies Lobby 01.ass", b"subtitle");

    // When: the binary runs with stdin closed.
    let output = run_directory(directory.path(), None);

    // Then: ambiguity is reported without a prompt or any mutation.
    assert_eq!(output.status.code(), Some(0), "stderr: {}", stderr(&output));
    assert_eq!(
        stdout(&output),
        "SKIP [ambiguous]: \"Enies Lobby 01.ass\"\nNo files to copy.\n"
    );
    assert!(stderr(&output).is_empty());
    assert_eq!(fs::read(first_video).unwrap(), b"first video");
    assert_eq!(fs::read(second_video).unwrap(), b"second video");
    assert_eq!(fs::read(subtitle).unwrap(), b"subtitle");
}

#[test]
fn declines_without_mutating_files() {
    // Given: one executable copy plan.
    let directory = TestDir::create();
    let video = directory.write("show S01E01.mkv", b"video");
    let source = directory.write("subtitle episode 1.srt", b"subtitle");
    let target = directory.path().join("show S01E01.srt");

    // When: the user submits the default blank response.
    let output = run_directory(directory.path(), Some(b"\n"));

    // Then: the process succeeds after one prompt without changing either path.
    assert_eq!(output.status.code(), Some(0), "stderr: {}", stderr(&output));
    assert!(stdout(&output).ends_with("Copy 1 file(s)? [y/N] "));
    assert!(stderr(&output).is_empty());
    assert_eq!(fs::read(&video).unwrap(), b"video");
    assert_eq!(fs::read(&source).unwrap(), b"subtitle");
    assert!(!target.exists());
}

#[test]
fn reports_ambiguous_work_without_reading_stdin() {
    // Given: a seasonless subtitle with two matching videos.
    let directory = TestDir::create();
    let first_video = directory.write("show S01E01.mkv", b"first video");
    let second_video = directory.write("show S02E01.mkv", b"second video");
    let subtitle = directory.write("subtitle episode 1.srt", b"subtitle");

    // When: stdin is immediately closed.
    let output = run_directory(directory.path(), None);

    // Then: no-work succeeds without a prompt and preserves every file.
    assert_eq!(output.status.code(), Some(0), "stderr: {}", stderr(&output));
    assert_eq!(
        stdout(&output),
        "SKIP [ambiguous]: \"subtitle episode 1.srt\"\nNo files to copy.\n"
    );
    assert!(stderr(&output).is_empty());
    assert_eq!(fs::read(&first_video).unwrap(), b"first video");
    assert_eq!(fs::read(&second_video).unwrap(), b"second video");
    assert_eq!(fs::read(&subtitle).unwrap(), b"subtitle");
}

#[test]
fn eof_after_preview_exits_one_without_mutation() {
    // Given: one executable copy plan and a closed stdin pipe.
    let directory = TestDir::create();
    let source = directory.write("subtitle episode 1.srt", b"subtitle");
    directory.write("show S01E01.mkv", b"video");

    // When: the confirmation reader reaches EOF.
    let output = run_directory(directory.path(), None);

    // Then: the prompt is rendered, the app exits one, and the source remains.
    assert_eq!(output.status.code(), Some(1));
    assert!(stdout(&output).ends_with("Copy 1 file(s)? [y/N] "));
    assert_eq!(stderr(&output), "unexpected end of file\n");
    assert_eq!(fs::read(&source).unwrap(), b"subtitle");
    assert!(!directory.path().join("show S01E01.srt").exists());
}

#[test]
fn preserves_an_existing_destination_without_prompting() {
    // Given: a target path containing sentinel bytes before planning.
    let directory = TestDir::create();
    let source = directory.write("subtitle episode 1.srt", b"subtitle");
    directory.write("show S01E01.mkv", b"video");
    let target = directory.write("show S01E01.srt", b"sentinel");

    // When: the command plans the directory with closed stdin.
    let output = run_directory(directory.path(), None);

    // Then: the destination becomes a skip and is never modified.
    assert_eq!(output.status.code(), Some(0), "stderr: {}", stderr(&output));
    assert!(stdout(&output).contains("SKIP [existing-destination]: \"subtitle episode 1.srt\""));
    assert!(stdout(&output).ends_with("No files to copy.\n"));
    assert!(stderr(&output).is_empty());
    assert_eq!(fs::read(&source).unwrap(), b"subtitle");
    assert_eq!(fs::read(&target).unwrap(), b"sentinel");
}

#[test]
fn invalid_directory_exits_one() {
    // Given: a path that does not exist.
    let directory = TestDir::create();
    let missing = directory.path().join("missing");

    // When: the command scans it.
    let output = run_directory(&missing, None);

    // Then: application failure uses exit code one and stderr only.
    assert_eq!(output.status.code(), Some(1));
    assert!(stdout(&output).is_empty());
    assert!(stderr(&output).starts_with("read_dir failed for "));
}

#[cfg(unix)]
#[test]
fn reports_a_non_utf_subtitle_as_an_escaped_unsupported_name() {
    use std::{ffi::OsString, os::unix::ffi::OsStringExt};

    // Given: a recognized subtitle extension with a non-UTF-8 stem.
    let directory = TestDir::create();
    let subtitle = directory
        .path()
        .join(OsString::from_vec(b"subtitle episode 1\xff.srt".to_vec()));
    fs::write(&subtitle, b"subtitle").unwrap();

    // When: the command plans the directory without stdin.
    let output = run_directory(directory.path(), None);

    // Then: one escaped skip is rendered and the file remains intact.
    assert_eq!(output.status.code(), Some(0), "stderr: {}", stderr(&output));
    assert_eq!(
        stdout(&output),
        "SKIP [unsupported-name]: \"subtitle episode 1\\u{fffd}.srt\"\nNo files to copy.\n"
    );
    assert!(stderr(&output).is_empty());
    assert_eq!(fs::read(&subtitle).unwrap(), b"subtitle");
}

#[cfg(unix)]
#[test]
fn excludes_a_non_utf_video_stem_from_candidate_selection() {
    use std::{ffi::OsString, os::unix::ffi::OsStringExt};

    // Given: a recognized video extension with a non-UTF-8 keyed stem and a normal keyed subtitle.
    let directory = TestDir::create();
    let video = directory
        .path()
        .join(OsString::from_vec(b"show S01E01\xff.mkv".to_vec()));
    fs::write(&video, b"video").unwrap();
    let subtitle = directory.write("subtitle episode 1.srt", b"subtitle");
    let target = directory
        .path()
        .join(OsString::from_vec(b"show S01E01\xff.srt".to_vec()));

    // When: the compiled binary scans with closed stdin.
    let output = run_directory(directory.path(), None);

    // Then: the keyed subtitle cannot match, stdin is untouched, and neither path mutates.
    assert_eq!(output.status.code(), Some(0), "stderr: {}", stderr(&output));
    assert_eq!(
        stdout(&output),
        "SKIP [no-match]: \"subtitle episode 1.srt\"\nNo files to copy.\n"
    );
    assert!(stderr(&output).is_empty());
    assert_eq!(fs::read(&video).unwrap(), b"video");
    assert_eq!(fs::read(&subtitle).unwrap(), b"subtitle");
    assert!(!target.exists());
}

#[test]
fn rejects_confirmation_bypass_flags() {
    // Given: unsupported flags that could bypass the required confirmation.
    for flag in ["--yes", "--dry-run"] {
        // When: the user passes the unsupported flag.
        let output = run(&[flag]);

        // Then: clap rejects it as usage with exit code two.
        assert_eq!(output.status.code(), Some(2), "{flag}: {}", stderr(&output));
        assert!(stdout(&output).is_empty());
        assert!(
            stderr(&output).contains(flag),
            "{flag}: {}",
            stderr(&output)
        );
    }
}

#[test]
fn reports_partial_failure_when_target_appears_after_prompt() {
    // Given: three planned copies with no destinations at planning time.
    let directory = TestDir::create();
    let first_source = directory.write("a episode 1.srt", b"first");
    let second_source = directory.write("b episode 2.srt", b"second");
    let third_source = directory.write("c episode 3.srt", b"third");
    let first_video = directory.write("show episode 01.mkv", b"video one");
    let second_video = directory.write("show episode 02.mkv", b"video two");
    let third_video = directory.write("show episode 03.mkv", b"video three");
    let first_target = directory.path().join("show episode 01.srt");
    let second_target = directory.path().join("show episode 02.srt");
    let third_target = directory.path().join("show episode 03.srt");
    let mut child = Command::new(binary())
        .arg(directory.path())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let stdout = child.stdout.take().unwrap();
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let mut stdout = stdout;
        let mut bytes = Vec::new();
        let result = loop {
            let mut byte = [0_u8; 1];
            match stdout.read(&mut byte) {
                Ok(0) => break Err(io::Error::from(io::ErrorKind::UnexpectedEof)),
                Ok(_) => {
                    bytes.push(byte[0]);
                    if bytes.ends_with(b"Copy 3 file(s)? [y/N] ") {
                        break Ok(bytes);
                    }
                }
                Err(error) => break Err(error),
            }
        };
        let _ = sender.send(result);
    });

    // When: a destination appears only after the flushed prompt suffix is observed.
    let preview = match receiver.recv_timeout(Duration::from_secs(3)) {
        Ok(Ok(preview)) => preview,
        Ok(Err(error)) => {
            let _ = child.kill();
            let _ = child.wait();
            panic!("prompt read failed: {error}");
        }
        Err(error) => {
            let _ = child.kill();
            let _ = child.wait();
            panic!("prompt timed out: {error}");
        }
    };
    fs::write(&second_target, b"sentinel").unwrap();
    let mut stdin = child.stdin.take().unwrap();
    stdin.write_all(b"yes\n").unwrap();
    drop(stdin);
    let output = child.wait_with_output().unwrap();

    // Then: the first copy completes, the new destination is not overwritten, and the rest reports.
    assert_eq!(
        preview,
        concat!(
            "COPY: \"a episode 1.srt\" -> \"show episode 01.srt\"\n",
            "COPY: \"b episode 2.srt\" -> \"show episode 02.srt\"\n",
            "COPY: \"c episode 3.srt\" -> \"show episode 03.srt\"\n",
            "Copy 3 file(s)? [y/N] "
        )
        .as_bytes()
    );
    assert_eq!(output.status.code(), Some(1));
    let report = stderr(&output);
    let lines = report.lines().collect::<Vec<_>>();
    assert_eq!(lines.len(), 3, "{report}");
    assert_eq!(
        lines[0],
        "COMPLETED: \"a episode 1.srt\" -> \"show episode 01.srt\""
    );
    assert!(
        lines[1].starts_with("FAILED [copy]: \"b episode 2.srt\" -> \"show episode 02.srt\": "),
        "{report}"
    );
    assert_eq!(
        lines[2],
        "PENDING: \"c episode 3.srt\" -> \"show episode 03.srt\""
    );
    assert_eq!(fs::read(&first_source).unwrap(), b"first");
    assert_eq!(fs::read(&first_target).unwrap(), b"first");
    assert_eq!(fs::read(&second_source).unwrap(), b"second");
    assert_eq!(fs::read(&second_target).unwrap(), b"sentinel");
    assert_eq!(fs::read(&third_source).unwrap(), b"third");
    assert!(!third_target.exists());
    assert_eq!(fs::read(first_video).unwrap(), b"video one");
    assert_eq!(fs::read(second_video).unwrap(), b"video two");
    assert_eq!(fs::read(third_video).unwrap(), b"video three");
}

static NEXT_DIR: AtomicUsize = AtomicUsize::new(0);

struct TestDir {
    path: PathBuf,
}

impl TestDir {
    fn create() -> Self {
        let path = std::env::temp_dir().join(format!(
            "subtitle-renamer-cli-{}-{}",
            std::process::id(),
            NEXT_DIR.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&path).unwrap();
        Self { path }
    }

    fn path(&self) -> &Path {
        &self.path
    }

    fn write(&self, name: &str, contents: &[u8]) -> PathBuf {
        let path = self.path.join(name);
        fs::write(&path, contents).unwrap();
        path
    }
}

impl Drop for TestDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
