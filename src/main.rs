use std::{
    io,
    path::{Path, PathBuf},
    process,
};

use clap::Parser;

mod interaction;
mod matcher;
mod renamer;

const HELP_DETAILS: &str = "\
Supported video extensions: mkv, mp4, avi, mov, m4v, webm\n\
Supported subtitle extensions: ass, ssa, srt, vtt\n\
Accepted episode forms: episode N, ep N, S<season>E<episode>, <season>x<episode>\n\
Scans DIR only; does not recurse into subdirectories.\n\
Previews planned renames and skipped subtitles, then asks for confirmation before renaming.\n\
Never overwrites existing files.";

#[derive(Debug, Parser)]
#[command(
    name = "subtitle-renamer",
    version,
    about = "Rename subtitle files to match video episode filenames.",
    after_long_help = HELP_DETAILS,
)]
struct Cli {
    #[arg(value_name = "DIR", default_value = ".")]
    directory: PathBuf,
}

fn main() {
    let cli = Cli::parse();
    match run(&cli.directory) {
        Ok(RunOutcome::Completed) => {}
        Ok(RunOutcome::ExecutionFailed) => process::exit(1),
        Err(error) => {
            eprintln!("{error}");
            process::exit(1);
        }
    }
}

enum RunOutcome {
    Completed,
    ExecutionFailed,
}

fn run(directory: &Path) -> io::Result<RunOutcome> {
    let batch = renamer::plan(directory).map_err(io::Error::other)?;
    let renames = rename_lines(&batch.renames);
    let skips = batch
        .skipped
        .iter()
        .map(|skipped| interaction::SkippedSubtitle(skipped.reason.as_str(), &skipped.source))
        .collect::<Vec<_>>();
    let stdout = io::stdout();
    let mut stdout = stdout.lock();

    interaction::render_preview(&mut stdout, &renames, &skips)?;
    let stdin = io::stdin();
    let mut stdin = stdin.lock();
    if !interaction::confirm_rename(&mut stdin, &mut stdout, batch.renames.len())? {
        return Ok(RunOutcome::Completed);
    }

    let report = renamer::execute(&batch.renames);
    if let Some(failure) = report.failed {
        let completed = rename_lines(&report.completed);
        let pending = rename_lines(&report.pending);
        let failed = interaction::FailedRename(
            match failure.operation {
                renamer::ExecutionOperation::Link => interaction::FailureStep::Link,
                renamer::ExecutionOperation::Unlink => interaction::FailureStep::Unlink,
            },
            &failure.source,
            &failure.target,
            &failure.error,
        );
        let stderr = io::stderr();
        let mut stderr = stderr.lock();
        interaction::render_partial_report(&mut stderr, &completed, &failed, &pending)?;
        return Ok(RunOutcome::ExecutionFailed);
    }

    interaction::render_success(&mut stdout, batch.renames.len())?;
    Ok(RunOutcome::Completed)
}

fn rename_lines(plans: &[renamer::RenamePlan]) -> Vec<interaction::RenameLine<'_>> {
    plans
        .iter()
        .map(|plan| interaction::RenameLine(&plan.source, &plan.target))
        .collect()
}

#[cfg(test)]
mod tests {
    use clap::CommandFactory;

    use super::Cli;

    #[test]
    fn cli_definition_is_valid() {
        Cli::command().debug_assert();
    }
}
