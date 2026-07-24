mod controller {
    pub use subtitle_renamer_desktop::PlanId;
}
#[allow(dead_code)]
#[path = "../src/dto.rs"]
mod dto;

use std::{
    error::Error,
    fs, io,
    path::{Path, PathBuf},
    process,
    sync::atomic::{AtomicUsize, Ordering},
};

use dto::{
    ErrorDto, ExecutionResultDto, PlanId, PlanSnapshotDto, copy_failure_details, skip_reason_code,
};
use subtitle_renamer::{SkipReason, execute_plan, plan_directory};

static NEXT_DIRECTORY: AtomicUsize = AtomicUsize::new(0);

#[test]
fn stale_plan_id_round_trips_as_an_opaque_token() -> Result<(), Box<dyn Error>> {
    let stale_id: PlanId = serde_json::from_str("9007199254740991")?;
    let json = serde_json::to_string(&stale_id)?;
    let round_trip: PlanId = serde_json::from_str(&json)?;

    assert_eq!(round_trip, stale_id);
    assert_eq!(json, "9007199254740991");
    assert!(!json.contains("path"));
    Ok(())
}

#[test]
fn snapshot_round_trips_without_authoritative_path_leakage() -> Result<(), Box<dyn Error>> {
    // Given: an absolute directory with a private parent marker.
    let directory = TestDirectory::create("dto-private-absolute-marker")?;
    directory.write("subtitle episode 1.srt", b"subtitle bytes")?;
    directory.write("show episode 01.mkv", b"video bytes")?;
    let plan = plan_directory(directory.path())?;

    // When: the plan becomes a desktop snapshot and JSON response.
    let snapshot = PlanSnapshotDto::from_plan(serde_json::from_str("41")?, directory.path(), &plan);
    let json = serde_json::to_string(&snapshot)?;
    let round_trip: PlanSnapshotDto = serde_json::from_str(&json)?;

    // Then: only opaque IDs and safe labels cross the boundary.
    assert_eq!(round_trip, snapshot);
    assert!(json.contains(r#""planId":41"#));
    assert!(json.contains(r#""rowId":1"#));
    assert!(json.contains(r#""directoryLabel":"selected-folder""#));
    assert!(json.contains(r#""sourceLabel":"subtitle episode 1.srt""#));
    assert!(json.contains(r#""targetLabel":"show episode 01.srt""#));
    assert!(!json.contains("dto-private-absolute-marker"));
    assert!(!json.contains(r#""source":"#));
    assert!(!json.contains(r#""target":"#));
    assert!(!json.contains("PathBuf"));
    Ok(())
}

#[test]
fn skip_reason_codes_cover_every_engine_variant() {
    // Given: every skip classification the engine can emit.
    let cases = [
        (SkipReason::UnsupportedName, "unsupported-name"),
        (SkipReason::MultiIdentifier, "multi-identifier"),
        (SkipReason::NoMatch, "no-match"),
        (SkipReason::Ambiguous, "ambiguous"),
        (SkipReason::AlreadyCorrect, "already-correct"),
        (SkipReason::ExistingDestination, "existing-destination"),
        (SkipReason::DuplicateTarget, "duplicate-target"),
    ];

    // When: each engine reason is projected to a DTO code.
    // Then: the frozen frontend tokens are preserved exactly.
    for (reason, expected) in cases {
        assert_eq!(skip_reason_code(reason), expected);
    }
}

#[test]
fn failure_mapping_is_stable_and_never_serializes_raw_io_text() -> Result<(), Box<dyn Error>> {
    // Given: raw I/O failures, including a hostile display string.
    let cases = [
        (
            io::ErrorKind::AlreadyExists,
            "already-exists",
            "The target already exists.",
            false,
        ),
        (
            io::ErrorKind::NotFound,
            "not-found",
            "A source file was not found.",
            false,
        ),
        (
            io::ErrorKind::Other,
            "copy-failed",
            "The copy did not complete.",
            true,
        ),
    ];

    // When: the failures become safe desktop details.
    // Then: each mapping is stable and the raw display text is absent.
    for (kind, code, safe_message, partial_target_may_remain) in cases {
        let value = serde_json::to_value(copy_failure_details(&io::Error::new(
            kind,
            "dto-private-raw-io-marker",
        )))?;
        assert_eq!(value["code"], code);
        assert_eq!(value["safeMessage"], safe_message);
        assert_eq!(value["partialTargetMayRemain"], partial_target_may_remain);
        assert!(!value.to_string().contains("dto-private-raw-io-marker"));
    }
    Ok(())
}

#[test]
fn planning_error_round_trips_as_safe_data() -> Result<(), Box<dyn Error>> {
    let error = ErrorDto::planning_failed();
    let json = serde_json::to_string(&error)?;
    let round_trip: ErrorDto = serde_json::from_str(&json)?;

    assert_eq!(round_trip, error);
    assert_eq!(serde_json::to_value(error)?["code"], "planning-failed");
    assert!(!json.contains("source"));
    assert!(!json.contains("target"));
    Ok(())
}

#[test]
fn execution_result_redacts_failed_copy_paths() -> Result<(), Box<dyn Error>> {
    // Given: a stale plan whose destination appears before execution.
    let directory = TestDirectory::create("dto-private-failure-marker")?;
    directory.write("subtitle episode 1.srt", b"subtitle bytes")?;
    let video = directory.write("show episode 01.mkv", b"video bytes")?;
    let plan = plan_directory(directory.path())?;
    fs::write(video.with_extension("srt"), b"sentinel")?;

    // When: execution stops at the exclusive-create failure.
    let result = ExecutionResultDto::from_report(&execute_plan(plan));
    let json = serde_json::to_string(&result)?;
    let round_trip: ExecutionResultDto = serde_json::from_str(&json)?;

    // Then: the response has only labels and the safe failure mapping.
    assert_eq!(round_trip, result);
    assert!(json.contains(r#""code":"already-exists""#));
    assert!(json.contains(r#""partialTargetMayRemain":false"#));
    assert!(!json.contains("dto-private-failure-marker"));
    assert!(!json.contains(r#""source":"#));
    assert!(!json.contains(r#""target":"#));
    Ok(())
}

#[cfg(unix)]
#[test]
fn snapshot_escapes_non_utf_file_labels() -> Result<(), Box<dyn Error>> {
    use std::{ffi::OsString, os::unix::ffi::OsStringExt};

    // Given: a supported subtitle filename with invalid UTF-8 in its stem.
    let directory = TestDirectory::create("dto-private-non-utf-marker")?;
    directory.write_os(
        &OsString::from_vec(b"subtitle-\xff.srt".to_vec()),
        b"subtitle bytes",
    )?;
    let plan = plan_directory(directory.path())?;

    // When: the skipped subtitle is projected into the desktop snapshot.
    let snapshot = PlanSnapshotDto::from_plan(serde_json::from_str("42")?, directory.path(), &plan);
    let value = serde_json::to_value(snapshot)?;

    // Then: the label is ASCII-safe and no parent path is exposed.
    assert_eq!(value["skips"][0]["sourceLabel"], "subtitle-\\u{fffd}.srt");
    assert_eq!(value["skips"][0]["reasonCode"], "unsupported-name");
    assert!(!value.to_string().contains("dto-private-non-utf-marker"));
    Ok(())
}

struct TestDirectory {
    base: PathBuf,
    directory: PathBuf,
}

impl TestDirectory {
    fn create(marker: &str) -> io::Result<Self> {
        let suffix = NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed);
        let base = std::env::temp_dir().join(format!(
            "subtitle-renamer-{marker}-{}-{suffix}",
            process::id()
        ));
        let directory = base.join("selected-folder");
        fs::create_dir_all(&directory)?;
        Ok(Self { base, directory })
    }

    fn path(&self) -> &Path {
        &self.directory
    }

    fn write(&self, name: &str, bytes: &[u8]) -> io::Result<PathBuf> {
        let path = self.directory.join(name);
        fs::write(&path, bytes)?;
        Ok(path)
    }

    #[cfg(unix)]
    fn write_os(&self, name: &std::ffi::OsStr, bytes: &[u8]) -> io::Result<PathBuf> {
        let path = self.directory.join(Path::new(name));
        fs::write(&path, bytes)?;
        Ok(path)
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.base);
    }
}
