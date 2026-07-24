use std::{
    error::Error,
    ffi::{OsStr, OsString},
    fmt,
    fs::{self, File, OpenOptions, remove_file},
    io::{self, Read},
    path::{Path, PathBuf},
};

mod planning;

use planning::build_plan;

#[derive(Debug, PartialEq, Eq)]
struct MediaInventory {
    videos: Vec<VideoFile>,
    subtitles: Vec<SubtitleFile>,
}

#[derive(Debug, PartialEq, Eq)]
struct VideoFile {
    path: PathBuf,
    stem: String,
    extension: OsString,
}

#[derive(Debug, PartialEq, Eq)]
struct SubtitleFile {
    path: PathBuf,
    stem: OsString,
    extension: OsString,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SkipReason {
    UnsupportedName,
    MultiIdentifier,
    NoMatch,
    Ambiguous,
    AlreadyCorrect,
    ExistingDestination,
    DuplicateTarget,
}

impl SkipReason {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::UnsupportedName => "unsupported-name",
            Self::MultiIdentifier => "multi-identifier",
            Self::NoMatch => "no-match",
            Self::Ambiguous => "ambiguous",
            Self::AlreadyCorrect => "already-correct",
            Self::ExistingDestination => "existing-destination",
            Self::DuplicateTarget => "duplicate-target",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlannedCopy {
    source: PathBuf,
    target: PathBuf,
}

impl PlannedCopy {
    pub fn source(&self) -> &Path {
        &self.source
    }

    pub fn target(&self) -> &Path {
        &self.target
    }
}

#[derive(Debug, PartialEq, Eq)]
pub struct SkippedSubtitle {
    source: PathBuf,
    reason: SkipReason,
}

impl SkippedSubtitle {
    pub fn source(&self) -> &Path {
        &self.source
    }

    pub const fn reason(&self) -> SkipReason {
        self.reason
    }
}

#[derive(Debug, PartialEq, Eq)]
pub struct CopyPlan {
    renames: Vec<PlannedCopy>,
    skipped: Vec<SkippedSubtitle>,
}

impl CopyPlan {
    pub fn copies(&self) -> &[PlannedCopy] {
        &self.renames
    }

    pub fn skipped(&self) -> &[SkippedSubtitle] {
        &self.skipped
    }
}

#[derive(Debug)]
pub struct ExecutionFailure {
    source: PathBuf,
    target: PathBuf,
    error: io::Error,
}

impl ExecutionFailure {
    pub fn source(&self) -> &Path {
        &self.source
    }

    pub fn target(&self) -> &Path {
        &self.target
    }

    pub fn error(&self) -> &io::Error {
        &self.error
    }
}

#[derive(Debug)]
pub struct ExecutionReport {
    completed: Vec<PlannedCopy>,
    failed: Option<ExecutionFailure>,
    pending: Vec<PlannedCopy>,
}

impl ExecutionReport {
    pub fn completed(&self) -> &[PlannedCopy] {
        &self.completed
    }

    pub fn failure(&self) -> Option<&ExecutionFailure> {
        self.failed.as_ref()
    }

    pub fn pending(&self) -> &[PlannedCopy] {
        &self.pending
    }
}

#[derive(Debug)]
pub struct DiscoverError {
    operation: &'static str,
    path: PathBuf,
    source: io::Error,
}

impl DiscoverError {
    fn new(operation: &'static str, path: PathBuf, source: io::Error) -> Self {
        Self {
            operation,
            path,
            source,
        }
    }
}

impl fmt::Display for DiscoverError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "{} failed for {}: {}",
            self.operation,
            self.path.display(),
            self.source
        )
    }
}

impl Error for DiscoverError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(&self.source)
    }
}

pub fn plan_directory(directory: &Path) -> Result<CopyPlan, DiscoverError> {
    let inventory = discover_media(directory)?;
    Ok(build_plan(&inventory))
}

fn discover_media(directory: &Path) -> Result<MediaInventory, DiscoverError> {
    let entries = fs::read_dir(directory)
        .map_err(|source| DiscoverError::new("read_dir", directory.to_path_buf(), source))?;
    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|source| {
            DiscoverError::new("read_dir entry", directory.to_path_buf(), source)
        })?;
        let file_type = entry
            .file_type()
            .map_err(|source| DiscoverError::new("file_type", entry.path(), source))?;
        if file_type.is_file() {
            files.push(entry.path());
        }
    }

    files.sort_by_key(|path| sort_key(path));

    let mut videos = Vec::new();
    let mut subtitles = Vec::new();
    for path in files {
        let Some(extension) = path.extension().map(OsStr::to_os_string) else {
            continue;
        };
        if is_supported_video(&extension)
            && let Some(stem) = path.file_stem().and_then(OsStr::to_str)
        {
            let stem = stem.to_owned();
            videos.push(VideoFile {
                path,
                stem,
                extension,
            });
        } else if is_supported_subtitle(&extension)
            && let Some(stem) = path.file_stem()
        {
            let stem = stem.to_os_string();
            subtitles.push(SubtitleFile {
                path,
                stem,
                extension,
            });
        }
    }

    Ok(MediaInventory { videos, subtitles })
}

fn sort_key(path: &Path) -> (String, OsString) {
    let name = path
        .file_name()
        .map_or_else(OsString::new, OsStr::to_os_string);
    (name.to_string_lossy().to_ascii_lowercase(), name)
}

pub fn execute_plan(plan: CopyPlan) -> ExecutionReport {
    execute(&plan.renames)
}

fn execute(plans: &[PlannedCopy]) -> ExecutionReport {
    execute_with(plans, copy_exclusive)
}

fn execute_with<Copy>(plans: &[PlannedCopy], copy_fn: Copy) -> ExecutionReport
where
    Copy: Fn(&Path, &Path) -> io::Result<()>,
{
    let mut completed = Vec::new();

    for (index, plan) in plans.iter().enumerate() {
        let failure = match copy_fn(&plan.source, &plan.target) {
            Ok(()) => {
                completed.push(plan.clone());
                continue;
            }
            Err(error) => ExecutionFailure {
                source: plan.source.clone(),
                target: plan.target.clone(),
                error,
            },
        };
        return ExecutionReport {
            completed,
            failed: Some(failure),
            pending: plans[index + 1..].to_vec(),
        };
    }

    ExecutionReport {
        completed,
        failed: None,
        pending: Vec::new(),
    }
}

fn copy_exclusive(source: &Path, target: &Path) -> io::Result<()> {
    let mut reader = File::open(source)?;
    copy_reader_exclusive_with(&mut reader, target, |target| remove_file(target))
}

fn copy_reader_exclusive_with<R, Remove>(
    reader: &mut R,
    target: &Path,
    remove_fn: Remove,
) -> io::Result<()>
where
    R: Read,
    Remove: Fn(&Path) -> io::Result<()>,
{
    let mut writer = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(target)?;
    match io::copy(reader, &mut writer) {
        Ok(_) => Ok(()),
        Err(copy_error) => {
            drop(writer);
            match remove_fn(target) {
                Ok(()) => Err(copy_error),
                Err(cleanup_error) => Err(io::Error::new(
                    copy_error.kind(),
                    format!(
                        "copy failed: {copy_error}; cleanup failed for {}: {cleanup_error}; partial target may remain",
                        target.display()
                    ),
                )),
            }
        }
    }
}

fn is_supported_video(extension: &OsStr) -> bool {
    matches_extension(extension, &["mkv", "mp4", "avi", "mov", "m4v", "webm"])
}

fn is_supported_subtitle(extension: &OsStr) -> bool {
    matches_extension(extension, &["ass", "ssa", "srt", "vtt"])
}

fn matches_extension(extension: &OsStr, supported: &[&str]) -> bool {
    extension.to_str().is_some_and(|text| {
        supported
            .iter()
            .any(|candidate| text.eq_ignore_ascii_case(candidate))
    })
}

#[cfg(test)]
mod tests {
    use super::{
        PlannedCopy, SkipReason, SkippedSubtitle, build_plan, copy_reader_exclusive_with,
        discover_media, execute,
    };

    use std::{
        ffi::OsString,
        fs,
        hash::{DefaultHasher, Hash, Hasher},
        io::{self, Read},
        path::{Path, PathBuf},
        process,
        sync::atomic::{AtomicUsize, Ordering},
    };

    static NEXT_DIR: AtomicUsize = AtomicUsize::new(0);

    struct PartialFailReader {
        has_yielded: bool,
    }

    impl Read for PartialFailReader {
        fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
            const PARTIAL_BYTES: &[u8] = b"partial bytes";

            if self.has_yielded {
                return Err(io::Error::from(io::ErrorKind::InvalidData));
            }

            self.has_yielded = true;
            buffer[..PARTIAL_BYTES.len()].copy_from_slice(PARTIAL_BYTES);
            Ok(PARTIAL_BYTES.len())
        }
    }

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn create() -> io::Result<Self> {
            let mut path = std::env::temp_dir();
            path.push(format!(
                "subtitle-renamer-discover-{}-{}",
                process::id(),
                NEXT_DIR.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir(&path)?;
            Ok(Self { path })
        }

        fn path(&self) -> &Path {
            &self.path
        }

        fn file(&self, name: &str) -> PathBuf {
            self.path.join(name)
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn snapshot_files(dir: &TestDir) -> io::Result<Vec<(OsString, Vec<u8>)>> {
        let mut snapshot = Vec::new();
        for entry in fs::read_dir(dir.path())? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                snapshot.push((entry.file_name(), fs::read(entry.path())?));
            }
        }
        snapshot.sort_by(|left, right| left.0.cmp(&right.0));
        Ok(snapshot)
    }

    fn snapshot_hash(snapshot: &[(OsString, Vec<u8>)]) -> u64 {
        let mut hasher = DefaultHasher::new();
        snapshot.hash(&mut hasher);
        hasher.finish()
    }

    fn plan(dir: &TestDir) -> Result<super::CopyPlan, Box<dyn std::error::Error>> {
        let inventory = discover_media(dir.path())?;
        Ok(build_plan(&inventory))
    }

    #[test]
    fn copies_file_without_removing_source() -> Result<(), Box<dyn std::error::Error>> {
        // Given: a planned subtitle copy with known bytes.
        let dir = TestDir::create()?;
        let source = dir.file("source.srt");
        let target = dir.file("show S01E01.srt");
        let bytes = b"subtitle bytes";
        fs::write(&source, bytes)?;
        let plan = PlannedCopy {
            source: source.clone(),
            target: target.clone(),
        };

        // When: the plan executes through the production filesystem operations.
        let report = execute(std::slice::from_ref(&plan));

        // Then: both paths begin with the same bytes and stay independent.
        assert_eq!(report.completed.len(), 1);
        assert_eq!(report.completed[0].source, source);
        assert_eq!(report.completed[0].target, target);
        assert!(report.failed.is_none());
        assert!(report.pending.is_empty());
        assert!(source.exists());
        assert_eq!(fs::read(&source)?, bytes);
        assert_eq!(fs::read(&target)?, bytes);
        fs::write(&source, b"changed source bytes")?;
        assert_eq!(fs::read(&target)?, bytes);
        Ok(())
    }

    #[test]
    fn does_not_overwrite_target_created_after_planning() -> Result<(), Box<dyn std::error::Error>>
    {
        // Given: a validated plan whose target appears before execution begins.
        let dir = TestDir::create()?;
        let source = dir.file("source.srt");
        let target = dir.file("show S01E01.srt");
        fs::write(&source, b"source bytes")?;
        let plan = PlannedCopy {
            source: source.clone(),
            target: target.clone(),
        };
        fs::write(&target, b"existing target bytes")?;

        // When: the stale plan is executed.
        let report = execute(std::slice::from_ref(&plan));

        // Then: exclusive creation preserves both original files without overwrite.
        let failure = report
            .failed
            .as_ref()
            .ok_or_else(|| io::Error::other("expected a copy failure"))?;
        assert!(report.completed.is_empty());
        assert_eq!(failure.source, source);
        assert_eq!(failure.target, target);
        assert_eq!(failure.error.kind(), io::ErrorKind::AlreadyExists);
        assert!(report.pending.is_empty());
        assert_eq!(fs::read(&source)?, b"source bytes");
        assert_eq!(fs::read(&target)?, b"existing target bytes");
        Ok(())
    }

    #[test]
    fn stops_on_first_copy_failure_and_reports_partial_state()
    -> Result<(), Box<dyn std::error::Error>> {
        // Given: a valid first plan, a blocked second target, and a valid third plan.
        let dir = TestDir::create()?;
        let first_source = dir.file("first.srt");
        let first_target = dir.file("show S01E01.srt");
        let failed_source = dir.file("second.srt");
        let failed_target = dir.file("show S01E02.srt");
        let third_source = dir.file("third.srt");
        let third_target = dir.file("show S01E03.srt");
        fs::write(&first_source, b"first bytes")?;
        fs::write(&failed_source, b"second bytes")?;
        fs::write(&failed_target, b"existing target bytes")?;
        fs::write(&third_source, b"third bytes")?;
        let plans = [
            PlannedCopy {
                source: first_source.clone(),
                target: first_target.clone(),
            },
            PlannedCopy {
                source: failed_source.clone(),
                target: failed_target.clone(),
            },
            PlannedCopy {
                source: third_source.clone(),
                target: third_target.clone(),
            },
        ];

        // When: execution encounters the second target created after planning.
        let report = execute(&plans);

        // Then: completed, failed, and pending entries retain input order and stop immediately.
        let failure = report
            .failed
            .as_ref()
            .ok_or_else(|| io::Error::other("expected a copy failure"))?;
        assert_eq!(report.completed.len(), 1);
        assert_eq!(report.completed[0].source, first_source);
        assert_eq!(report.completed[0].target, first_target);
        assert_eq!(failure.source, failed_source);
        assert_eq!(failure.target, failed_target);
        assert_eq!(failure.error.kind(), io::ErrorKind::AlreadyExists);
        assert_eq!(report.pending.len(), 1);
        assert_eq!(report.pending[0].source, third_source);
        assert_eq!(report.pending[0].target, third_target);
        assert_eq!(fs::read(&first_source)?, b"first bytes");
        assert_eq!(fs::read(&first_target)?, b"first bytes");
        assert_eq!(fs::read(&failed_source)?, b"second bytes");
        assert_eq!(fs::read(&failed_target)?, b"existing target bytes");
        assert_eq!(fs::read(&third_source)?, b"third bytes");
        assert!(!third_target.exists());
        Ok(())
    }

    #[test]
    fn removes_incomplete_target_after_stream_failure() -> Result<(), Box<dyn std::error::Error>> {
        // Given: a reader that yields bytes and then fails.
        let dir = TestDir::create()?;
        let target = dir.file("show S01E01.srt");
        let mut reader = PartialFailReader { has_yielded: false };

        // When: exclusive streaming copy encounters the reader error.
        let error =
            copy_reader_exclusive_with(&mut reader, &target, |target| fs::remove_file(target))
                .unwrap_err();

        // Then: the original stream error survives and its incomplete target is removed.
        assert_eq!(error.kind(), io::ErrorKind::InvalidData);
        assert!(!target.exists());
        Ok(())
    }

    #[test]
    fn reports_cleanup_failure_when_partial_target_may_remain()
    -> Result<(), Box<dyn std::error::Error>> {
        // Given: a reader that fails after writing bytes and a failing target remover.
        let dir = TestDir::create()?;
        let target = dir.file("show S01E01.srt");
        let mut reader = PartialFailReader { has_yielded: false };

        // When: stream cleanup also fails.
        let error = copy_reader_exclusive_with(&mut reader, &target, |_| {
            Err(io::Error::other("cleanup denied"))
        })
        .unwrap_err();

        // Then: the stream kind and cleanup context explain that a partial target remains.
        assert_eq!(error.kind(), io::ErrorKind::InvalidData);
        let text = error.to_string();
        assert!(text.contains("cleanup failed"), "{text}");
        assert!(text.contains("cleanup denied"), "{text}");
        assert!(text.contains("partial target may remain"), "{text}");
        fs::remove_file(&target)?;
        Ok(())
    }

    #[test]
    fn discovers_supported_regular_files_in_stable_order() -> Result<(), Box<dyn std::error::Error>>
    {
        // Given: mixed supported files, unsupported files, and nested media.
        let dir = TestDir::create()?;
        fs::write(dir.file("BETA.MKV"), b"")?;
        fs::write(dir.file("a.mkv"), b"")?;
        fs::write(dir.file("A.MKV"), b"")?;
        fs::write(dir.file("zeta.WebM"), b"")?;
        fs::write(dir.file("Alpha.SSA"), b"")?;
        fs::write(dir.file("alpha.sRt"), b"")?;
        fs::write(dir.file("notes.txt"), b"")?;
        fs::create_dir(dir.file("nested"))?;
        fs::write(dir.file("nested/inside.mp4"), b"")?;

        // When: the directory is discovered from a fresh filesystem read.
        let inventory = discover_media(dir.path())?;

        // Then: direct supported regular files are exact and deterministically sorted.
        assert_eq!(
            inventory
                .videos
                .iter()
                .map(|file| (&file.path, file.stem.as_str(), &file.extension))
                .collect::<Vec<_>>(),
            vec![
                (&dir.file("A.MKV"), "A", &OsString::from("MKV")),
                (&dir.file("a.mkv"), "a", &OsString::from("mkv")),
                (&dir.file("BETA.MKV"), "BETA", &OsString::from("MKV")),
                (&dir.file("zeta.WebM"), "zeta", &OsString::from("WebM")),
            ]
        );
        assert_eq!(
            inventory
                .subtitles
                .iter()
                .map(|file| (&file.path, &file.stem, &file.extension))
                .collect::<Vec<_>>(),
            vec![
                (
                    &dir.file("alpha.sRt"),
                    &OsString::from("alpha"),
                    &OsString::from("sRt")
                ),
                (
                    &dir.file("Alpha.SSA"),
                    &OsString::from("Alpha"),
                    &OsString::from("SSA")
                ),
            ]
        );
        Ok(())
    }

    #[test]
    fn rejects_non_directory_input() -> Result<(), Box<dyn std::error::Error>> {
        // Given: a regular file where a readable directory is required.
        let dir = TestDir::create()?;
        let path = dir.file("not-a-directory");
        fs::write(&path, b"")?;

        // When: discovery is attempted.
        let error = discover_media(&path).unwrap_err();

        // Then: the error names both the operation and the offending path.
        let text = error.to_string();
        assert!(text.contains("read_dir"), "{text}");
        assert!(text.contains(&path.display().to_string()), "{text}");
        Ok(())
    }

    #[test]
    fn rejects_missing_input() -> Result<(), Box<dyn std::error::Error>> {
        // Given: a path that does not exist.
        let dir = TestDir::create()?;
        let path = dir.file("missing");

        // When: discovery is attempted.
        let error = discover_media(&path).unwrap_err();

        // Then: the error names both the operation and the missing path.
        let text = error.to_string();
        assert!(text.contains("read_dir"), "{text}");
        assert!(text.contains(&path.display().to_string()), "{text}");
        Ok(())
    }

    #[cfg(unix)]
    #[test]
    fn discover_ignores_symlinks_and_excludes_only_non_utf_videos()
    -> Result<(), Box<dyn std::error::Error>> {
        use std::{os::unix::ffi::OsStringExt, os::unix::fs::symlink};

        // Given: symlinked media plus non-UTF subtitle and video stems.
        let dir = TestDir::create()?;
        fs::write(dir.file("target.mkv"), b"")?;
        symlink(dir.file("target.mkv"), dir.file("link.mkv"))?;
        let subtitle_name = OsString::from_vec(b"bad-\xFF.sRt".to_vec());
        let video_name = OsString::from_vec(b"bad-\xFE.mKv".to_vec());
        fs::write(dir.path.join(&subtitle_name), b"")?;
        fs::write(dir.path.join(&video_name), b"")?;

        // When: the directory is discovered.
        let inventory = discover_media(dir.path())?;

        // Then: symlinks are ignored, non-UTF subtitles remain, and non-UTF videos are excluded.
        assert_eq!(inventory.videos.len(), 1);
        assert_eq!(inventory.videos[0].path, dir.file("target.mkv"));
        assert_eq!(inventory.subtitles.len(), 1);
        assert_eq!(inventory.subtitles[0].path, dir.path.join(subtitle_name));
        assert_eq!(inventory.subtitles[0].extension, OsString::from("sRt"));
        Ok(())
    }

    #[test]
    fn plans_the_requested_episode_example() -> Result<(), Box<dyn std::error::Error>> {
        // Given: the requested video/subtitle pair with known fixture bytes.
        let dir = TestDir::create()?;
        let video = dir.file("[anything - any] episode 01 - my tv show.mkv");
        let subtitle = dir.file("subtitle episode 1.ass");
        fs::write(&video, b"video")?;
        fs::write(&subtitle, b"subtitle")?;
        let before = snapshot_files(&dir)?;
        let before_hash = snapshot_hash(&before);

        // When: an immutable plan is built from a fresh inventory.
        let batch = plan(&dir)?;
        let repeated = plan(&dir)?;

        // Then: the full video stem replaces the subtitle stem without fixture mutation.
        assert_eq!(repeated, batch);
        assert_eq!(
            batch.renames,
            vec![PlannedCopy {
                source: subtitle,
                target: dir.file("[anything - any] episode 01 - my tv show.ass"),
            }]
        );
        assert!(batch.skipped.is_empty());
        let after = snapshot_files(&dir)?;
        assert_eq!(snapshot_hash(&after), before_hash);
        assert_eq!(after, before);
        Ok(())
    }

    #[test]
    fn plans_one_pace_fixture_names_without_metadata_false_positives()
    -> Result<(), Box<dyn std::error::Error>> {
        // Given: copied One Pace names plus a separate duplicate-key fixture.
        let dir = TestDir::create()?;
        let fixture_names = [
            "[One Pace][375-376] Enies Lobby 01 [1080p][785FB818].mkv",
            "[One Pace][376-378] Enies Lobby 02 [1080p][495CDC31].mkv",
            "[One Pace][379-380] Enies Lobby 03 [1080p][861EE2FF].mkv",
            "Enies Lobby 01.ass",
            "Enies Lobby 02.ass",
            "Enies Lobby 03.ass",
        ];
        for (index, name) in fixture_names.iter().enumerate() {
            fs::write(dir.file(name), format!("fixture {index}"))?;
        }
        let before = snapshot_files(&dir)?;
        let duplicate_dir = TestDir::create()?;
        fs::write(duplicate_dir.file("Arc 01 [WEB].mkv"), b"first video")?;
        fs::write(
            duplicate_dir.file("Other Arc 01 [BluRay].mkv"),
            b"second video",
        )?;
        fs::write(duplicate_dir.file("Arc 01.ass"), b"subtitle")?;
        let duplicate_before = snapshot_files(&duplicate_dir)?;

        // When: both directories are planned twice from fresh inventories.
        let batch = plan(&dir)?;
        let repeated = plan(&dir)?;
        let duplicate_batch = plan(&duplicate_dir)?;
        let duplicate_repeated = plan(&duplicate_dir)?;

        // Then: exact mappings are stable, duplicate keys stay ambiguous, and planning is immutable.
        assert_eq!(repeated, batch);
        assert_eq!(
            batch.renames,
            vec![
                PlannedCopy {
                    source: dir.file("Enies Lobby 01.ass"),
                    target: dir.file("[One Pace][375-376] Enies Lobby 01 [1080p][785FB818].ass"),
                },
                PlannedCopy {
                    source: dir.file("Enies Lobby 02.ass"),
                    target: dir.file("[One Pace][376-378] Enies Lobby 02 [1080p][495CDC31].ass"),
                },
                PlannedCopy {
                    source: dir.file("Enies Lobby 03.ass"),
                    target: dir.file("[One Pace][379-380] Enies Lobby 03 [1080p][861EE2FF].ass"),
                },
            ]
        );
        assert!(batch.skipped.is_empty());
        assert_eq!(duplicate_repeated, duplicate_batch);
        assert!(duplicate_batch.renames.is_empty());
        assert_eq!(
            duplicate_batch.skipped,
            vec![SkippedSubtitle {
                source: duplicate_dir.file("Arc 01.ass"),
                reason: SkipReason::Ambiguous,
            }]
        );
        assert_eq!(snapshot_files(&dir)?, before);
        assert_eq!(snapshot_files(&duplicate_dir)?, duplicate_before);
        Ok(())
    }

    #[test]
    fn plans_seasons_and_all_parse_outcomes() -> Result<(), Box<dyn std::error::Error>> {
        // Given: compatible seasons, a unique seasonless fallback, and ineligible videos.
        let dir = TestDir::create()?;
        for name in [
            "show S01E01.mkv",
            "show S02E01.mkv",
            "only S03E02.mkv",
            "show S01E03.mkv",
            "unidentified.mkv",
            "bad S01E06 ep 7.mkv",
        ] {
            fs::write(dir.file(name), b"video")?;
        }
        for name in [
            "same S01E01.srt",
            "same S02E01.srt",
            "fallback episode 2.srt",
            "repeated S01E03 1x3.srt",
            "ambiguous episode 1.srt",
            "different S01E04 episode 5.srt",
            "for excluded episode 6.srt",
            "no match episode 9.srt",
            "unidentified subtitle.srt",
        ] {
            fs::write(dir.file(name), b"subtitle")?;
        }

        // When: planning uses only videos with exactly one parsed key.
        let batch = plan(&dir)?;

        // Then: seasons constrain candidates, one-key fallbacks work, and every parse result is classified.
        assert_eq!(
            batch.renames,
            vec![
                PlannedCopy {
                    source: dir.file("fallback episode 2.srt"),
                    target: dir.file("only S03E02.srt"),
                },
                PlannedCopy {
                    source: dir.file("repeated S01E03 1x3.srt"),
                    target: dir.file("show S01E03.srt"),
                },
                PlannedCopy {
                    source: dir.file("same S01E01.srt"),
                    target: dir.file("show S01E01.srt"),
                },
                PlannedCopy {
                    source: dir.file("same S02E01.srt"),
                    target: dir.file("show S02E01.srt"),
                },
            ]
        );
        assert_eq!(
            batch.skipped,
            vec![
                SkippedSubtitle {
                    source: dir.file("ambiguous episode 1.srt"),
                    reason: SkipReason::Ambiguous,
                },
                SkippedSubtitle {
                    source: dir.file("different S01E04 episode 5.srt"),
                    reason: SkipReason::MultiIdentifier,
                },
                SkippedSubtitle {
                    source: dir.file("for excluded episode 6.srt"),
                    reason: SkipReason::NoMatch,
                },
                SkippedSubtitle {
                    source: dir.file("no match episode 9.srt"),
                    reason: SkipReason::NoMatch,
                },
                SkippedSubtitle {
                    source: dir.file("unidentified subtitle.srt"),
                    reason: SkipReason::NoMatch,
                },
            ]
        );
        Ok(())
    }

    #[test]
    fn skips_all_ambiguous_and_duplicate_targets() -> Result<(), Box<dyn std::error::Error>> {
        // Given: one subtitle with two video candidates and two subtitles with one shared target.
        let dir = TestDir::create()?;
        for name in ["show S01E01.mkv", "show S02E01.mkv", "show S01E02.mkv"] {
            fs::write(dir.file(name), b"video")?;
        }
        for name in [
            "ambiguous episode 1.srt",
            "first S01E02.srt",
            "second S01E02.srt",
        ] {
            fs::write(dir.file(name), b"subtitle")?;
        }
        let before = snapshot_files(&dir)?;
        let before_hash = snapshot_hash(&before);

        // When: planning filters unsafe candidate and target groups.
        let batch = plan(&dir)?;

        // Then: every ambiguous and colliding source skips, without selecting a winner or mutating fixtures.
        assert!(batch.renames.is_empty());
        assert_eq!(
            batch.skipped,
            vec![
                SkippedSubtitle {
                    source: dir.file("ambiguous episode 1.srt"),
                    reason: SkipReason::Ambiguous,
                },
                SkippedSubtitle {
                    source: dir.file("first S01E02.srt"),
                    reason: SkipReason::DuplicateTarget,
                },
                SkippedSubtitle {
                    source: dir.file("second S01E02.srt"),
                    reason: SkipReason::DuplicateTarget,
                },
            ]
        );
        let after = snapshot_files(&dir)?;
        assert_eq!(snapshot_hash(&after), before_hash);
        assert_eq!(after, before);
        Ok(())
    }

    #[test]
    fn skips_existing_destinations_and_keeps_extension_bytes()
    -> Result<(), Box<dyn std::error::Error>> {
        // Given: already-correct and pre-existing targets plus language-suffixed subtitle names.
        let dir = TestDir::create()?;
        for name in ["show S01E01.mkv", "show S01E02.mkv", "show S01E04.mkv"] {
            fs::write(dir.file(name), b"video")?;
        }
        for name in [
            "show S01E01.sRt",
            "language S01E02.srt",
            "show S01E02.srt",
            "z S01E04.eng.ASS",
            "A S01E04.pt-BR.vTt",
        ] {
            fs::write(dir.file(name), b"subtitle")?;
        }

        // When: the plan checks exact source equality and all pre-existing target paths.
        let batch = plan(&dir)?;

        // Then: conflicts never become plans, language suffixes are replaced, and extension bytes remain exact.
        assert_eq!(
            batch.renames,
            vec![
                PlannedCopy {
                    source: dir.file("A S01E04.pt-BR.vTt"),
                    target: dir.file("show S01E04.vTt"),
                },
                PlannedCopy {
                    source: dir.file("z S01E04.eng.ASS"),
                    target: dir.file("show S01E04.ASS"),
                },
            ]
        );
        assert_eq!(
            batch.skipped,
            vec![
                SkippedSubtitle {
                    source: dir.file("language S01E02.srt"),
                    reason: SkipReason::ExistingDestination,
                },
                SkippedSubtitle {
                    source: dir.file("show S01E01.sRt"),
                    reason: SkipReason::AlreadyCorrect,
                },
                SkippedSubtitle {
                    source: dir.file("show S01E02.srt"),
                    reason: SkipReason::AlreadyCorrect,
                },
            ]
        );
        Ok(())
    }

    #[cfg(unix)]
    #[test]
    fn plans_non_utf_subtitles_as_unsupported_names() -> Result<(), Box<dyn std::error::Error>> {
        use std::os::unix::ffi::OsStringExt;

        // Given: one non-UTF subtitle and a non-UTF video alongside a regular candidate.
        let dir = TestDir::create()?;
        fs::write(dir.file("show S01E01.mkv"), b"video")?;
        fs::write(
            dir.path
                .join(OsString::from_vec(b"video S01E02-\xFE.mkv".to_vec())),
            b"video",
        )?;
        let subtitle_name = OsString::from_vec(b"subtitle-\xFF.sRt".to_vec());
        let subtitle = dir.path.join(&subtitle_name);
        fs::write(&subtitle, b"subtitle")?;
        fs::write(dir.file("subtitle episode 2.srt"), b"subtitle")?;

        // When: planning is built from the real Unix paths.
        let batch = plan(&dir)?;

        // Then: invalid subtitle text is reported and an invalid video stem cannot satisfy a match.
        assert!(batch.renames.is_empty());
        assert_eq!(
            batch.skipped,
            vec![
                SkippedSubtitle {
                    source: dir.file("subtitle episode 2.srt"),
                    reason: SkipReason::NoMatch,
                },
                SkippedSubtitle {
                    source: subtitle,
                    reason: SkipReason::UnsupportedName,
                },
            ]
        );
        Ok(())
    }
}
