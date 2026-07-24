use std::{io, path::Path};

use serde::{Deserialize, Serialize};
use subtitle_renamer::{CopyPlan, ExecutionReport, PlannedCopy, SkipReason};

pub(crate) use crate::controller::PlanId;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
struct CopyRowId(u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
struct SkipRowId(u64);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlanSnapshotDto {
    plan_id: PlanId,
    directory_label: String,
    can_execute: bool,
    copies: Vec<CopyRowDto>,
    skips: Vec<SkipRowDto>,
}

impl PlanSnapshotDto {
    pub(crate) fn from_plan(plan_id: PlanId, directory: &Path, plan: &CopyPlan) -> Self {
        let mut next_copy_id = 1;
        let copies = copy_rows(plan.copies(), &mut next_copy_id);
        let mut next_skip_id = 1;
        let skips = plan
            .skipped()
            .iter()
            .map(|skipped| SkipRowDto {
                row_id: SkipRowId(next_row_id(&mut next_skip_id)),
                source_label: safe_label(skipped.source(), "Unknown subtitle"),
                reason_code: skip_reason_code(skipped.reason()).to_owned(),
            })
            .collect();

        Self {
            plan_id,
            directory_label: safe_label(directory, "Selected folder"),
            can_execute: !copies.is_empty(),
            copies,
            skips,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopyRowDto {
    row_id: CopyRowId,
    source_label: String,
    target_label: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SkipRowDto {
    row_id: SkipRowId,
    source_label: String,
    reason_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExecutionResultDto {
    completed: Vec<CopyRowDto>,
    failed: Option<FailedCopyDto>,
    pending: Vec<CopyRowDto>,
}

impl ExecutionResultDto {
    pub(crate) fn from_report(report: &ExecutionReport) -> Self {
        let mut next_copy_id = 1;
        let completed = copy_rows(report.completed(), &mut next_copy_id);
        let failed = report.failure().map(|failure| {
            let details = copy_failure_details(failure.error());
            FailedCopyDto {
                row_id: CopyRowId(next_row_id(&mut next_copy_id)),
                source_label: safe_label(failure.source(), "Unknown subtitle"),
                target_label: safe_label(failure.target(), "Unknown target"),
                code: details.code,
                safe_message: details.safe_message,
                partial_target_may_remain: details.partial_target_may_remain,
            }
        });

        Self {
            completed,
            failed,
            pending: copy_rows(report.pending(), &mut next_copy_id),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FailedCopyDto {
    row_id: CopyRowId,
    source_label: String,
    target_label: String,
    code: String,
    safe_message: String,
    partial_target_may_remain: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ErrorDto {
    code: String,
    safe_message: String,
}

impl ErrorDto {
    pub(crate) fn busy() -> Self {
        Self {
            code: "busy".to_owned(),
            safe_message: "Another operation is already running.".to_owned(),
        }
    }

    pub(crate) fn rescanned() -> Self {
        Self {
            code: "rescanned".to_owned(),
            safe_message: "That plan was replaced by a rescan.".to_owned(),
        }
    }

    pub(crate) fn unknown_plan() -> Self {
        Self {
            code: "unknown-plan".to_owned(),
            safe_message: "The plan is no longer available.".to_owned(),
        }
    }

    pub(crate) fn zero_work() -> Self {
        Self {
            code: "zero-work".to_owned(),
            safe_message: "There are no planned copies to execute.".to_owned(),
        }
    }

    pub(crate) fn planning_failed() -> Self {
        Self {
            code: "planning-failed".to_owned(),
            safe_message: "The selected folder could not be scanned.".to_owned(),
        }
    }

    pub(crate) fn copy_failed() -> Self {
        Self {
            code: "copy-failed".to_owned(),
            safe_message: "The copy did not complete.".to_owned(),
        }
    }

    pub(crate) fn unavailable() -> Self {
        Self {
            code: "unavailable".to_owned(),
            safe_message: "The operation is unavailable.".to_owned(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CopyFailureDetails {
    code: String,
    safe_message: String,
    partial_target_may_remain: bool,
}

pub(crate) fn copy_failure_details(error: &io::Error) -> CopyFailureDetails {
    let (code, safe_message, partial_target_may_remain) = match error.kind() {
        io::ErrorKind::AlreadyExists => ("already-exists", "The target already exists.", false),
        io::ErrorKind::NotFound => ("not-found", "A source file was not found.", false),
        _ => ("copy-failed", "The copy did not complete.", true),
    };

    CopyFailureDetails {
        code: code.to_owned(),
        safe_message: safe_message.to_owned(),
        partial_target_may_remain,
    }
}

pub(crate) fn skip_reason_code(reason: SkipReason) -> &'static str {
    reason.as_str()
}

fn copy_rows(copies: &[PlannedCopy], next_copy_id: &mut u64) -> Vec<CopyRowDto> {
    copies
        .iter()
        .map(|copy| CopyRowDto {
            row_id: CopyRowId(next_row_id(next_copy_id)),
            source_label: safe_label(copy.source(), "Unknown subtitle"),
            target_label: safe_label(copy.target(), "Unknown target"),
        })
        .collect()
}

fn next_row_id(next_id: &mut u64) -> u64 {
    let current = *next_id;
    *next_id = next_id.saturating_add(1);
    current
}

fn safe_label(path: &Path, fallback: &str) -> String {
    path.file_name().map_or_else(
        || fallback.to_owned(),
        |name| name.to_string_lossy().escape_default().to_string(),
    )
}
