use std::{
    error::Error,
    fs, io,
    path::{Path, PathBuf},
    process,
    sync::atomic::{AtomicUsize, Ordering},
};

use subtitle_renamer::{
    CopyPlan, DiscoverError, ExecutionFailure, ExecutionReport, PlannedCopy, SkipReason,
    SkippedSubtitle, execute_plan, plan_directory,
};

static NEXT_DIR: AtomicUsize = AtomicUsize::new(0);

#[test]
fn plans_and_executes_copies_through_the_public_engine() -> Result<(), Box<dyn Error>> {
    // Given: one compatible video and subtitle with distinct bytes.
    let directory = TestDir::create()?;
    let source = directory.write("subtitle episode 1.srt", b"subtitle bytes")?;
    let target = directory.path().join("show S01E01.srt");
    directory.write("show S01E01.mkv", b"video bytes")?;

    // When: the caller plans and consumes the plan through the public engine.
    let planning: Result<CopyPlan, DiscoverError> = plan_directory(directory.path());
    let plan = planning?;
    let _: &[PlannedCopy] = plan.copies();
    let _: &[SkippedSubtitle] = plan.skipped();
    let copy = plan
        .copies()
        .first()
        .ok_or_else(|| io::Error::other("expected one planned copy"))?;
    assert_eq!(copy.source(), source);
    assert_eq!(copy.target(), target);
    let report: ExecutionReport = execute_plan(plan);
    let _: Option<&ExecutionFailure> = report.failure();

    // Then: accessors report the copied operation and both files preserve their bytes.
    assert_eq!(report.completed().len(), 1);
    assert_eq!(report.completed()[0].source(), source);
    assert_eq!(report.completed()[0].target(), target);
    assert!(report.failure().is_none());
    assert!(report.pending().is_empty());
    assert_eq!(fs::read(&source)?, b"subtitle bytes");
    assert_eq!(fs::read(&target)?, b"subtitle bytes");
    Ok(())
}

#[test]
fn preserves_target_created_after_public_planning() -> Result<(), Box<dyn Error>> {
    // Given: a target that appears after a copy plan is built.
    let directory = TestDir::create()?;
    let source = directory.write("subtitle episode 1.srt", b"subtitle bytes")?;
    let target = directory.path().join("show S01E01.srt");
    directory.write("show S01E01.mkv", b"video bytes")?;
    let plan = plan_directory(directory.path())?;
    fs::write(&target, b"sentinel")?;

    // When: the stale public plan is consumed.
    let report = execute_plan(plan);

    // Then: exclusive creation preserves the late target and reports its failure.
    let failure = report
        .failure()
        .ok_or_else(|| io::Error::other("expected late-target failure"))?;
    assert_eq!(failure.source(), source);
    assert_eq!(failure.target(), target);
    assert_eq!(failure.error().kind(), io::ErrorKind::AlreadyExists);
    assert!(report.completed().is_empty());
    assert!(report.pending().is_empty());
    assert_eq!(fs::read(&source)?, b"subtitle bytes");
    assert_eq!(fs::read(&target)?, b"sentinel");
    Ok(())
}

#[test]
fn reports_ordered_partial_state_when_second_source_vanishes_after_public_planning()
-> Result<(), Box<dyn Error>> {
    // Given: three copies planned through the public engine.
    let directory = TestDir::create()?;
    let first_source = directory.write("a episode 1.srt", b"first subtitle")?;
    let second_source = directory.write("b episode 2.srt", b"second subtitle")?;
    let third_source = directory.write("c episode 3.srt", b"third subtitle")?;
    directory.write("show episode 01.mkv", b"first video")?;
    directory.write("show episode 02.mkv", b"second video")?;
    directory.write("show episode 03.mkv", b"third video")?;
    let first_target = directory.path().join("show episode 01.srt");
    let second_target = directory.path().join("show episode 02.srt");
    let third_target = directory.path().join("show episode 03.srt");
    let plan = plan_directory(directory.path())?;
    assert_eq!(plan.copies().len(), 3);
    assert_eq!(plan.copies()[0].source(), first_source);
    assert_eq!(plan.copies()[1].source(), second_source);
    assert_eq!(plan.copies()[2].source(), third_source);
    assert_eq!(plan.copies()[0].target(), first_target);
    assert_eq!(plan.copies()[1].target(), second_target);
    assert_eq!(plan.copies()[2].target(), third_target);
    fs::remove_file(&second_source)?;

    // When: the stale public plan is consumed after its second source disappears.
    let report = execute_plan(plan);

    // Then: one copy completes, NotFound stops the batch, and the final copy stays pending.
    let failure = report
        .failure()
        .ok_or_else(|| io::Error::other("expected vanished-source failure"))?;
    assert_eq!(report.completed().len(), 1);
    assert_eq!(report.completed()[0].source(), first_source);
    assert_eq!(report.completed()[0].target(), first_target);
    assert_eq!(failure.source(), second_source);
    assert_eq!(failure.target(), second_target);
    assert_eq!(failure.error().kind(), io::ErrorKind::NotFound);
    assert_eq!(report.pending().len(), 1);
    assert_eq!(report.pending()[0].source(), third_source);
    assert_eq!(report.pending()[0].target(), third_target);
    assert_eq!(fs::read(&first_source)?, b"first subtitle");
    assert_eq!(fs::read(&first_target)?, b"first subtitle");
    assert_eq!(fs::read(&third_source)?, b"third subtitle");
    assert!(!second_target.exists());
    assert!(!third_target.exists());
    Ok(())
}

#[test]
fn executes_zero_work_plan_without_touching_files_added_after_inspection()
-> Result<(), Box<dyn Error>> {
    // Given: an empty directory whose public inspection produces no work.
    let directory = TestDir::create()?;
    let plan = plan_directory(directory.path())?;
    assert!(plan.copies().is_empty());
    assert!(plan.skipped().is_empty());
    let video = directory.write("show S01E01.mkv", b"video bytes")?;
    let source = directory.write("subtitle episode 1.srt", b"subtitle bytes")?;
    let target = directory.path().join("show S01E01.srt");

    // When: the zero-work plan is consumed after matching files appear.
    let report = execute_plan(plan);

    // Then: inspection and execution leave late files untouched and create no target.
    assert!(report.completed().is_empty());
    assert!(report.failure().is_none());
    assert!(report.pending().is_empty());
    assert_eq!(fs::read(&video)?, b"video bytes");
    assert_eq!(fs::read(&source)?, b"subtitle bytes");
    assert!(!target.exists());
    Ok(())
}

#[test]
fn exposes_skip_reasons_without_mutating_the_directory() -> Result<(), Box<dyn Error>> {
    // Given: a subtitle with no matching video.
    let directory = TestDir::create()?;
    let source = directory.write("subtitle episode 1.srt", b"subtitle bytes")?;

    // When: public planning discovers the directory.
    let plan = plan_directory(directory.path())?;

    // Then: the read-only skip accessor exposes the stable reason and source.
    let skipped = plan
        .skipped()
        .first()
        .ok_or_else(|| io::Error::other("expected one skipped subtitle"))?;
    assert_eq!(skipped.source(), source);
    assert_eq!(skipped.reason(), SkipReason::NoMatch);
    assert_eq!(skipped.reason().as_str(), "no-match");
    assert_eq!(fs::read(&source)?, b"subtitle bytes");
    Ok(())
}

struct TestDir {
    path: PathBuf,
}

impl TestDir {
    fn create() -> io::Result<Self> {
        let path = std::env::temp_dir().join(format!(
            "subtitle-renamer-engine-{}-{}",
            process::id(),
            NEXT_DIR.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&path)?;
        Ok(Self { path })
    }

    fn path(&self) -> &Path {
        &self.path
    }

    fn write(&self, name: &str, contents: &[u8]) -> io::Result<PathBuf> {
        let path = self.path.join(name);
        fs::write(&path, contents)?;
        Ok(path)
    }
}

impl Drop for TestDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
