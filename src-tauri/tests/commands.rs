// allow: SIZE_OK - focused real-filesystem command-core contract suite.
#[allow(dead_code)]
#[path = "../src/commands.rs"]
mod commands;
#[allow(dead_code)]
#[path = "../src/controller.rs"]
mod controller;
#[allow(dead_code)]
#[path = "../src/dto.rs"]
mod dto;

use std::{
    fs,
    future::Future,
    path::{Path, PathBuf},
    process,
    sync::atomic::{AtomicUsize, Ordering},
};

use commands::{discard_plan_core, execute_plan_core, rescan_core, select_and_plan_core};
use controller::Controller;
use dto::{ErrorDto, ExecutionResultDto, PlanId, PlanSnapshotDto};
use subtitle_renamer::{CopyPlan, DiscoverError, ExecutionReport, execute_plan, plan_directory};
use tauri::async_runtime::{JoinHandle, block_on, spawn_blocking};

static NEXT_DIRECTORY: AtomicUsize = AtomicUsize::new(0);

#[test]
fn select_and_plan_preserves_current_plan_when_picker_is_cancelled() {
    // Given: an existing selected directory and executable plan.
    let directory = TestDirectory::create("command-cancel");
    directory.executable_files();
    let controller = Controller::new();
    let first_snapshot = select_plan(&controller, directory.path());
    let first_plan_id = snapshot_plan_id(&first_snapshot);

    // When: the blocking picker reports cancellation.
    let result = run(select_and_plan_core(
        &controller,
        || selection_worker(None),
        plan_worker,
    ));

    // Then: no path crosses the boundary and the existing plan remains usable.
    assert_eq!(result, Ok(None));
    assert_eq!(controller.current_plan_id(), Ok(Some(first_plan_id)));
    assert_eq!(
        controller.selected_directory(),
        Ok(Some(directory.path().to_path_buf()))
    );
}

#[test]
fn select_and_plan_returns_safe_planning_error_when_selected_directory_is_missing() {
    // Given: a directory path that is selected successfully but cannot be scanned.
    let directory = TestDirectory::create("command-missing-directory");
    let missing_directory = directory.path().join("missing-folder");
    let controller = Controller::new();

    // When: selection completes and planning runs against the missing path.
    let result = run(select_and_plan_core(
        &controller,
        {
            let missing_directory = missing_directory.clone();
            move || selection_worker(Some(missing_directory))
        },
        plan_worker,
    ));

    // Then: the error is redacted, busy state clears, and the selection can be rescanned later.
    assert_error_code(result, "planning-failed");
    assert_eq!(controller.busy_kind(), Ok(None));
    assert_eq!(
        controller.selected_directory(),
        Ok(Some(missing_directory.clone()))
    );
    fs::create_dir(&missing_directory).expect("create selected directory");
    fs::write(missing_directory.join("show episode 1.mkv"), b"video").expect("write video");
    fs::write(
        missing_directory.join("subtitle episode 1.srt"),
        b"subtitle",
    )
    .expect("write subtitle");
    assert!(run(rescan_core(&controller, plan_worker)).is_ok());
}

#[test]
fn rescan_rejects_the_prior_plan_id_when_a_replacement_plan_exists() {
    // Given: a selected directory with a first executable plan.
    let directory = TestDirectory::create("command-rescan-stale");
    directory.executable_files();
    let controller = Controller::new();
    let first_snapshot = select_plan(&controller, directory.path());
    let first_plan_id = snapshot_plan_id(&first_snapshot);

    // When: a rescan stores a replacement plan and the old ID executes.
    let second_snapshot = run(rescan_core(&controller, plan_worker)).expect("replacement plan");
    let stale = run(execute_plan_core(&controller, first_plan_id, copy_worker));

    // Then: the replacement uses a new opaque token and stale execution cannot copy a source.
    assert_ne!(snapshot_plan_id(&second_snapshot), first_plan_id);
    assert_error_code(stale, "rescanned");
    assert_eq!(directory.read("subtitle episode 1.srt"), b"subtitle");
}

#[test]
fn execute_plan_copies_once_and_rejects_a_duplicate_request() {
    // Given: an executable plan backed by real source and video files.
    let directory = TestDirectory::create("command-duplicate");
    directory.executable_files();
    let controller = Controller::new();
    let snapshot = select_plan(&controller, directory.path());
    let plan_id = snapshot_plan_id(&snapshot);

    // When: the plan executes and the same opaque ID is sent again.
    let result =
        run(execute_plan_core(&controller, plan_id, copy_worker)).expect("execution result");
    let duplicate = run(execute_plan_core(&controller, plan_id, copy_worker));

    // Then: one target is created, the source remains, and the consumed ID cannot run again.
    assert_eq!(
        result_value(&result)["completed"].as_array().map(Vec::len),
        Some(1)
    );
    assert_eq!(directory.read("show episode 1.srt"), b"subtitle");
    assert_eq!(directory.read("subtitle episode 1.srt"), b"subtitle");
    assert_error_code(duplicate, "unknown-plan");
}

#[test]
fn execute_plan_rejects_zero_work_without_consuming_its_plan() {
    // Given: a selected empty directory whose snapshot has no copies.
    let directory = TestDirectory::create("command-zero-work");
    let controller = Controller::new();
    let snapshot = select_plan(&controller, directory.path());
    let plan_id = snapshot_plan_id(&snapshot);

    // When: the zero-work ID is submitted for execution.
    let result = run(execute_plan_core(&controller, plan_id, copy_worker));

    // Then: no worker runs and the plan remains available for a later rescan or discard.
    assert_eq!(snapshot_value(&snapshot)["canExecute"], false);
    assert_error_code(result, "zero-work");
    assert_eq!(controller.current_plan_id(), Ok(Some(plan_id)));
}

#[test]
fn discard_plan_invalidates_the_id_and_keeps_the_selected_directory_rescannable() {
    // Given: a selected directory with an executable plan.
    let directory = TestDirectory::create("command-discard");
    directory.executable_files();
    let controller = Controller::new();
    let snapshot = select_plan(&controller, directory.path());
    let plan_id = snapshot_plan_id(&snapshot);

    // When: the caller discards the opaque plan ID.
    let result = discard_plan_core(&controller, plan_id);

    // Then: discard copies nothing, consumes only the plan, and leaves no-argument rescan usable.
    assert_eq!(result, Ok(()));
    assert_eq!(controller.current_plan_id(), Ok(None));
    assert_eq!(directory.read("subtitle episode 1.srt"), b"subtitle");
    assert!(run(rescan_core(&controller, plan_worker)).is_ok());
}

#[test]
fn execute_plan_reports_a_late_target_without_leaking_private_paths() {
    // Given: a plan whose target does not exist at scan time.
    let directory = TestDirectory::create("command-late-target-private-marker");
    directory.executable_files();
    let controller = Controller::new();
    let snapshot = select_plan(&controller, directory.path());

    // When: another writer creates the target before the plan executes.
    directory.write("show episode 1.srt", b"existing target");
    let result = run(execute_plan_core(
        &controller,
        snapshot_plan_id(&snapshot),
        copy_worker,
    ))
    .expect("execution report");

    // Then: exclusive creation preserves both files and returns only safe DTO data.
    let value = result_value(&result);
    assert_eq!(value["failed"]["code"], "already-exists");
    assert_eq!(value["failed"]["partialTargetMayRemain"], false);
    assert_eq!(directory.read("show episode 1.srt"), b"existing target");
    assert_eq!(directory.read("subtitle episode 1.srt"), b"subtitle");
    assert_safe_json(&value, "command-late-target-private-marker");
}

#[test]
fn execute_plan_reports_a_vanished_source_without_leaking_private_paths() {
    // Given: a plan whose subtitle exists when scanning completes.
    let directory = TestDirectory::create("command-vanished-source-private-marker");
    directory.executable_files();
    let controller = Controller::new();
    let snapshot = select_plan(&controller, directory.path());

    // When: the source disappears before the worker copies it.
    fs::remove_file(directory.path().join("subtitle episode 1.srt")).expect("remove source");
    let result = run(execute_plan_core(
        &controller,
        snapshot_plan_id(&snapshot),
        copy_worker,
    ))
    .expect("execution report");

    // Then: the safe not-found result does not create a target or reveal the directory.
    let value = result_value(&result);
    assert_eq!(value["failed"]["code"], "not-found");
    assert!(!directory.path().join("show episode 1.srt").exists());
    assert_safe_json(&value, "command-vanished-source-private-marker");
}

#[test]
fn execute_plan_clears_busy_when_its_worker_join_fails() {
    // Given: an executable plan reserved for a worker that will panic.
    let directory = TestDirectory::create("command-worker-join");
    directory.executable_files();
    let controller = Controller::new();
    let snapshot = select_plan(&controller, directory.path());

    // When: the blocking task fails to join.
    let result = run(execute_plan_core(
        &controller,
        snapshot_plan_id(&snapshot),
        failed_copy_worker,
    ));

    // Then: the failure is safe, busy is cleared, and the selected directory can rescan.
    assert_error_code(result, "copy-failed");
    assert_eq!(controller.busy_kind(), Ok(None));
    assert_eq!(directory.read("subtitle episode 1.srt"), b"subtitle");
    assert!(run(rescan_core(&controller, plan_worker)).is_ok());
}

#[cfg(unix)]
#[test]
fn select_and_plan_keeps_a_non_utf_selected_path_inside_rust() {
    use std::{ffi::OsString, os::unix::ffi::OsStringExt};

    // Given: a real selected directory with a non-UTF path component.
    let directory = TestDirectory::create("command-non-utf-private-marker");
    let selected = directory
        .path()
        .join(OsString::from_vec(b"selected-\xff-folder".to_vec()));
    fs::create_dir(&selected).expect("create non-UTF selected directory");
    fs::write(selected.join("show episode 1.mkv"), b"video").expect("write video");
    fs::write(selected.join("subtitle episode 1.srt"), b"subtitle").expect("write subtitle");
    let controller = Controller::new();

    // When: that native path becomes a command snapshot.
    let snapshot = run(select_and_plan_core(
        &controller,
        {
            let selected = selected.clone();
            move || selection_worker(Some(selected))
        },
        plan_worker,
    ))
    .expect("safe snapshot")
    .expect("selected snapshot");

    // Then: JSON contains only an escaped label and never the parent marker or a raw path field.
    let value = snapshot_value(&snapshot);
    assert_eq!(value["directoryLabel"], "selected-\\u{fffd}-folder");
    assert_safe_json(&value, "command-non-utf-private-marker");
}

fn select_plan(controller: &Controller, directory: &Path) -> PlanSnapshotDto {
    run(select_and_plan_core(
        controller,
        {
            let directory = directory.to_path_buf();
            move || selection_worker(Some(directory))
        },
        plan_worker,
    ))
    .expect("planning result")
    .expect("selected directory")
}

fn selection_worker(selection: Option<PathBuf>) -> JoinHandle<Result<Option<PathBuf>, ()>> {
    spawn_blocking(move || Ok(selection))
}

fn plan_worker(directory: PathBuf) -> JoinHandle<Result<CopyPlan, DiscoverError>> {
    spawn_blocking(move || plan_directory(&directory))
}

fn copy_worker(plan: CopyPlan) -> JoinHandle<ExecutionReport> {
    spawn_blocking(move || execute_plan(plan))
}

fn failed_copy_worker(_plan: CopyPlan) -> JoinHandle<ExecutionReport> {
    spawn_blocking(|| -> ExecutionReport { panic!("injected worker join failure") })
}

fn run<F>(future: F) -> F::Output
where
    F: Future,
{
    block_on(future)
}

fn snapshot_plan_id(snapshot: &PlanSnapshotDto) -> PlanId {
    serde_json::from_value(snapshot_value(snapshot)["planId"].clone()).expect("opaque plan ID")
}

fn snapshot_value(snapshot: &PlanSnapshotDto) -> serde_json::Value {
    serde_json::to_value(snapshot).expect("snapshot JSON")
}

fn result_value(result: &ExecutionResultDto) -> serde_json::Value {
    serde_json::to_value(result).expect("result JSON")
}

fn assert_error_code<T: std::fmt::Debug>(result: Result<T, ErrorDto>, expected: &str) {
    let error = result.expect_err("expected safe command error");
    assert_eq!(
        serde_json::to_value(error).expect("error JSON")["code"],
        expected
    );
}

fn assert_safe_json(value: &serde_json::Value, private_marker: &str) {
    let json = value.to_string();
    assert!(!json.contains(private_marker));
    assert!(!json.contains(r#"\"source\":"#));
    assert!(!json.contains(r#"\"target\":"#));
    assert!(!json.contains("PathBuf"));
}

struct TestDirectory {
    root: PathBuf,
}

impl TestDirectory {
    fn create(marker: &str) -> Self {
        let suffix = NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed);
        let root = std::env::temp_dir().join(format!(
            "subtitle-renamer-{marker}-{}-{suffix}",
            process::id()
        ));
        fs::create_dir_all(&root).expect("test directory");
        Self { root }
    }

    fn path(&self) -> &Path {
        &self.root
    }

    fn executable_files(&self) {
        self.write("show episode 1.mkv", b"video");
        self.write("subtitle episode 1.srt", b"subtitle");
    }

    fn write(&self, name: &str, bytes: &[u8]) {
        fs::write(self.root.join(name), bytes).expect("test file");
    }

    fn read(&self, name: &str) -> Vec<u8> {
        fs::read(self.root.join(name)).expect("test file")
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.root).expect("test directory cleanup");
    }
}
