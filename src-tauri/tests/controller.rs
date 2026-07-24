// allow: SIZE_OK - focused lifecycle contract suite stays in this required test file.
#[allow(dead_code)]
#[path = "../src/controller.rs"]
mod controller;

use std::{
    fs,
    path::{Path, PathBuf},
    process,
    sync::{
        Arc, Barrier, Mutex,
        atomic::{AtomicUsize, Ordering},
    },
    thread,
};

use controller::{BusyKind, Controller, ControllerError};
use subtitle_renamer::plan_directory;

#[test]
fn only_one_concurrent_execute_reservation_runs_work() {
    // Given: a controller with one executable plan.
    let directory = TestDir::create();
    directory.write("show S01E01.mkv", b"video");
    directory.write("subtitle episode 1.srt", b"subtitle");
    let controller = Arc::new(Controller::new());
    let plan_id = store_plan(&controller, directory.path());

    // When: two workers attempt to reserve execution at once.
    let start = Arc::new(Barrier::new(3));
    let winner_holds_reservation = Arc::new(Barrier::new(2));
    let work_runs = Arc::new(AtomicUsize::new(0));
    let outcomes = Arc::new(Mutex::new(Vec::new()));
    let mut workers = Vec::new();
    for _ in 0..2 {
        let controller = Arc::clone(&controller);
        let start = Arc::clone(&start);
        let winner_holds_reservation = Arc::clone(&winner_holds_reservation);
        let work_runs = Arc::clone(&work_runs);
        let outcomes = Arc::clone(&outcomes);
        workers.push(thread::spawn(move || {
            start.wait();
            match controller.reserve_execute(plan_id) {
                Ok(reservation) => {
                    winner_holds_reservation.wait();
                    let (plan, finish) = reservation.into_parts();
                    let work = move || {
                        work_runs.fetch_add(1, Ordering::SeqCst);
                        drop(plan);
                    };
                    work();
                    controller
                        .finish_execute(finish)
                        .expect("execution finished");
                    outcomes.lock().expect("outcomes mutex").push("reserved");
                }
                Err(ControllerError::Busy(BusyKind::Execute))
                | Err(ControllerError::StalePlan { .. }) => {
                    outcomes.lock().expect("outcomes mutex").push("rejected");
                }
                Err(error) => panic!("unexpected reservation error: {error:?}"),
            }
        }));
    }
    start.wait();
    winner_holds_reservation.wait();
    for worker in workers {
        worker.join().expect("worker joins");
    }

    // Then: exactly one worker receives the plan and the loser runs no work.
    assert_eq!(work_runs.load(Ordering::SeqCst), 1);
    assert_eq!(outcomes.lock().expect("outcomes mutex").len(), 2);
}

#[test]
fn active_execute_rejects_select_and_rescan_without_running_work() {
    // Given: an executable plan whose execution reservation remains live.
    let directory = executable_directory();
    let controller = Controller::new();
    let plan_id = store_plan(&controller, directory.path());
    let reservation = controller
        .reserve_execute(plan_id)
        .expect("execution reservation");
    let work_runs = AtomicUsize::new(0);

    // When: selection and rescan compete with the held execution reservation.
    assert_error(
        controller.reserve_select(),
        ControllerError::Busy(BusyKind::Execute),
    );
    assert_error(
        controller.reserve_rescan(),
        ControllerError::Busy(BusyKind::Execute),
    );

    // Then: neither competing operation changes the consumed plan or runs work.
    assert_eq!(controller.current_plan_id().expect("current plan"), None);
    assert_eq!(
        controller.busy_kind().expect("busy kind"),
        Some(BusyKind::Execute)
    );
    assert_eq!(work_runs.load(Ordering::SeqCst), 0);
    let (plan, finish) = reservation.into_parts();
    drop(plan);
    controller.finish_execute(finish).expect("execution finish");
    let rescan = controller.reserve_rescan().expect("rescan reservation");
    controller.fail_rescan(rescan).expect("failed scan finish");
}

#[test]
fn selection_cancel_preserves_the_current_directory_and_plan() {
    // Given: a selected directory with a stored plan.
    let directory = executable_directory();
    let controller = Controller::new();
    let plan_id = store_plan(&controller, directory.path());

    // When: the next folder selection is cancelled.
    let reservation = controller.reserve_select().expect("select reservation");
    controller
        .finish_select(reservation, None)
        .expect("selection cancellation");

    // Then: the prior directory and plan remain current.
    assert_eq!(
        controller.selected_directory().expect("selected directory"),
        Some(directory.path().to_path_buf())
    );
    assert_eq!(
        controller.current_plan_id().expect("current plan"),
        Some(plan_id)
    );
}

#[test]
fn new_selection_invalidates_the_current_plan_before_rescan() {
    // Given: a first selected directory with an executable plan.
    let first_directory = executable_directory();
    let second_directory = executable_directory();
    let controller = Controller::new();
    let first_plan_id = store_plan(&controller, first_directory.path());

    // When: a new directory selection completes.
    select_directory(&controller, second_directory.path());

    // Then: the earlier plan identifier is stale before another scan runs.
    assert_eq!(controller.current_plan_id().expect("current plan"), None);
    assert_error(
        controller.reserve_execute(first_plan_id),
        ControllerError::StalePlan {
            requested: first_plan_id,
            current: None,
        },
    );
}

#[test]
fn rescan_invalidates_the_prior_plan_id() {
    // Given: a selected directory with its first stored plan.
    let directory = executable_directory();
    let controller = Controller::new();
    let first_plan_id = store_plan(&controller, directory.path());

    // When: a new scan stores a replacement plan.
    let second_plan_id = rescan(&controller, directory.path());

    // Then: the old identifier is stale and the new one is current.
    assert_ne!(first_plan_id, second_plan_id);
    assert_error(
        controller.reserve_execute(first_plan_id),
        ControllerError::StalePlan {
            requested: first_plan_id,
            current: Some(second_plan_id),
        },
    );
}

#[test]
fn duplicate_execute_is_stale_after_the_first_reservation_finishes() {
    // Given: one executable plan.
    let directory = executable_directory();
    let controller = Controller::new();
    let plan_id = store_plan(&controller, directory.path());

    // When: the first execution reservation finishes without copying.
    let reservation = controller
        .reserve_execute(plan_id)
        .expect("execution reservation");
    let (plan, finish) = reservation.into_parts();
    drop(plan);
    controller.finish_execute(finish).expect("execution finish");

    // Then: a duplicate execution cannot obtain the consumed plan.
    assert_error(
        controller.reserve_execute(plan_id),
        ControllerError::StalePlan {
            requested: plan_id,
            current: None,
        },
    );
}

#[test]
fn zero_work_plan_cannot_be_reserved_for_execution() {
    // Given: a selected empty directory and its stored zero-work plan.
    let directory = TestDir::create();
    let controller = Controller::new();
    select_directory(&controller, directory.path());
    let plan_id = rescan(&controller, directory.path());

    // When: execution is requested for that plan.
    let reservation = controller.reserve_execute(plan_id);

    // Then: the plan remains current but cannot start copy work.
    assert_error(reservation, ControllerError::ZeroWork(plan_id));
    assert_eq!(
        controller.current_plan_id().expect("current plan"),
        Some(plan_id)
    );
    assert_eq!(controller.busy_kind().expect("busy kind"), None);
}

#[test]
fn busy_select_and_rescan_reject_competing_operations() {
    // Given: a controller with an executable directory selected.
    let directory = executable_directory();
    let controller = Controller::new();

    // When: selection and then scanning are each held open.
    let select = controller.reserve_select().expect("select reservation");
    assert_error(
        controller.reserve_rescan(),
        ControllerError::Busy(BusyKind::Select),
    );
    controller
        .finish_select(select, Some(directory.path().to_path_buf()))
        .expect("selected directory");
    let rescan = controller.reserve_rescan().expect("rescan reservation");
    assert_error(
        controller.reserve_select(),
        ControllerError::Busy(BusyKind::Rescan),
    );

    // Then: failing the scan clears its busy state for a fresh operation.
    controller.fail_rescan(rescan).expect("failed scan finish");
    assert_eq!(controller.busy_kind().expect("busy kind"), None);
    let select = controller
        .reserve_select()
        .expect("next select reservation");
    controller
        .finish_select(select, None)
        .expect("next selection cancellation");
}

#[test]
fn failed_rescan_removes_the_stale_plan_and_keeps_the_directory() {
    // Given: one selected directory with an executable plan.
    let directory = executable_directory();
    let controller = Controller::new();
    let plan_id = store_plan(&controller, directory.path());

    // When: its replacement scan fails after reserving the operation.
    let rescan = controller.reserve_rescan().expect("rescan reservation");
    controller.fail_rescan(rescan).expect("failed scan finish");

    // Then: selection remains while the invalidated plan stays unavailable.
    assert_eq!(
        controller.selected_directory().expect("selected directory"),
        Some(directory.path().to_path_buf())
    );
    assert_eq!(controller.current_plan_id().expect("current plan"), None);
    assert_eq!(controller.busy_kind().expect("busy kind"), None);
    assert_error(
        controller.reserve_execute(plan_id),
        ControllerError::StalePlan {
            requested: plan_id,
            current: None,
        },
    );
}

#[test]
fn discard_consumes_only_the_plan_and_preserves_selection() {
    // Given: an executable plan for a selected directory.
    let directory = executable_directory();
    let controller = Controller::new();
    let plan_id = store_plan(&controller, directory.path());

    // When: the plan is reserved and finished for discard.
    let reservation = controller
        .reserve_discard(plan_id)
        .expect("discard reservation");
    assert_eq!(
        controller.busy_kind().expect("busy kind"),
        Some(BusyKind::Discard)
    );
    controller
        .finish_discard(reservation)
        .expect("discard finish");

    // Then: only the plan is gone.
    assert_eq!(
        controller.selected_directory().expect("selected directory"),
        Some(directory.path().to_path_buf())
    );
    assert_eq!(controller.current_plan_id().expect("current plan"), None);
}

#[test]
fn checked_plan_ids_report_exhaustion_and_reset_busy_state() {
    // Given: a controller whose next valid plan identifier is the maximum value.
    let directory = executable_directory();
    let controller = Controller::with_next_plan_id_for_test(u64::MAX);
    select_directory(&controller, directory.path());

    // When: the maximum plan is stored and the next scan tries to allocate again.
    let maximum_plan_id = rescan(&controller, directory.path());
    assert_eq!(maximum_plan_id.get(), u64::MAX);
    let discard = controller
        .reserve_discard(maximum_plan_id)
        .expect("discard reservation");
    controller.finish_discard(discard).expect("discard finish");
    let rescan = controller.reserve_rescan().expect("rescan reservation");
    let exhaustion =
        controller.finish_rescan(rescan, plan_directory(directory.path()).expect("copy plan"));

    // Then: exhaustion is typed and never leaves the controller busy.
    assert_eq!(exhaustion, Err(ControllerError::PlanIdExhausted));
    assert_eq!(controller.busy_kind().expect("busy kind"), None);
    assert_eq!(controller.current_plan_id().expect("current plan"), None);
}

#[test]
fn unavailable_poisoned_state_returns_a_typed_error() {
    // Given: a controller whose state mutex has been poisoned.
    let controller = Controller::new();
    let result = std::panic::catch_unwind(|| controller.poison_for_test());
    assert!(result.is_err());

    // When: a lifecycle operation tries to access the unavailable state.
    let reservation = controller.reserve_select();

    // Then: the caller receives a typed unavailable-state error.
    assert_error(reservation, ControllerError::StateUnavailable);
}

#[test]
fn worker_join_error_does_not_leave_execution_busy() {
    // Given: an executable plan reserved for a worker.
    let directory = executable_directory();
    let controller = Controller::new();
    let plan_id = store_plan(&controller, directory.path());
    let reservation = controller
        .reserve_execute(plan_id)
        .expect("execution reservation");
    let (plan, finish) = reservation.into_parts();

    // When: the worker panics and its join reports an error.
    let join = thread::spawn(move || {
        drop(plan);
        panic!("test worker failure");
    })
    .join();
    assert!(join.is_err());
    controller.finish_execute(finish).expect("execution finish");

    // Then: the completed join-error path releases the controller for rescan.
    assert_eq!(controller.busy_kind().expect("busy kind"), None);
    let rescan = controller.reserve_rescan().expect("rescan reservation");
    controller.fail_rescan(rescan).expect("failed scan finish");
}

#[test]
fn concurrent_execute_reservation_stays_single_winner_under_repetition() {
    // Given: an executable directory reused to build independent plans.
    let directory = executable_directory();

    // When: repeated pairs contend for each freshly stored plan.
    for _ in 0..64 {
        let controller = Arc::new(Controller::new());
        let plan_id = store_plan(&controller, directory.path());
        let start = Arc::new(Barrier::new(3));
        let winners = Arc::new(AtomicUsize::new(0));
        let mut workers = Vec::new();
        for _ in 0..2 {
            let controller = Arc::clone(&controller);
            let start = Arc::clone(&start);
            let winners = Arc::clone(&winners);
            workers.push(thread::spawn(move || {
                start.wait();
                if let Ok(reservation) = controller.reserve_execute(plan_id) {
                    let (plan, finish) = reservation.into_parts();
                    drop(plan);
                    winners.fetch_add(1, Ordering::SeqCst);
                    controller.finish_execute(finish).expect("execution finish");
                }
            }));
        }
        start.wait();
        for worker in workers {
            worker.join().expect("worker joins");
        }
        // Then: every contention round atomically grants the plan once.
        assert_eq!(winners.load(Ordering::SeqCst), 1);
    }
}

fn executable_directory() -> TestDir {
    let directory = TestDir::create();
    directory.write("show S01E01.mkv", b"video");
    directory.write("subtitle episode 1.srt", b"subtitle");
    directory
}

fn select_directory(controller: &Controller, directory: &Path) {
    let select = controller.reserve_select().expect("select reservation");
    controller
        .finish_select(select, Some(directory.to_path_buf()))
        .expect("selected directory");
}

fn rescan(controller: &Controller, directory: &Path) -> controller::PlanId {
    let scan = controller.reserve_rescan().expect("rescan reservation");
    assert_eq!(scan.directory(), directory);
    controller
        .finish_rescan(scan, plan_directory(directory).expect("copy plan"))
        .expect("stored plan")
}

fn store_plan(controller: &Controller, directory: &Path) -> controller::PlanId {
    select_directory(controller, directory);
    rescan(controller, directory)
}

fn assert_error<T>(result: Result<T, ControllerError>, expected: ControllerError) {
    match result {
        Err(error) => assert_eq!(error, expected),
        Ok(_) => panic!("expected controller error: {expected:?}"),
    }
}

struct TestDir {
    path: PathBuf,
}

impl TestDir {
    fn create() -> Self {
        static NEXT_DIRECTORY: AtomicUsize = AtomicUsize::new(0);
        let path = std::env::temp_dir().join(format!(
            "subtitle-renamer-controller-test-{}-{}",
            process::id(),
            NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&path).expect("test directory");
        Self { path }
    }

    fn path(&self) -> &Path {
        &self.path
    }

    fn write(&self, name: &str, contents: &[u8]) {
        fs::write(self.path.join(name), contents).expect("test file");
    }
}

impl Drop for TestDir {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.path).expect("test directory cleanup");
    }
}
