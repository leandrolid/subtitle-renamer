use std::path::PathBuf;

use subtitle_renamer::{
    CopyPlan, DiscoverError, ExecutionReport, execute_plan as run_plan, plan_directory,
};
use tauri::{
    AppHandle, State,
    async_runtime::{JoinHandle, spawn_blocking},
};
use tauri_plugin_dialog::{DialogExt, FilePath};

use crate::{
    controller::{Controller, ControllerError},
    dto::{ErrorDto, ExecutionResultDto, PlanId, PlanSnapshotDto},
};

#[tauri::command]
pub(crate) async fn select_and_plan(
    app: AppHandle,
    controller: State<'_, Controller>,
) -> Result<Option<PlanSnapshotDto>, ErrorDto> {
    let dialog_app = app.clone();
    select_and_plan_core(
        &controller,
        move || {
            spawn_blocking(move || {
                dialog_app
                    .dialog()
                    .file()
                    .blocking_pick_folder()
                    .map(FilePath::into_path)
                    .transpose()
                    .map_err(|_| ())
            })
        },
        plan_in_worker,
    )
    .await
}

#[tauri::command]
pub(crate) async fn rescan(controller: State<'_, Controller>) -> Result<PlanSnapshotDto, ErrorDto> {
    rescan_core(&controller, plan_in_worker).await
}

#[tauri::command]
pub(crate) async fn execute_plan(
    plan_id: String,
    controller: State<'_, Controller>,
) -> Result<ExecutionResultDto, ErrorDto> {
    let plan_id = PlanId::parse(&plan_id).ok_or_else(ErrorDto::unknown_plan)?;
    execute_plan_core(&controller, plan_id, |plan| {
        spawn_blocking(move || run_plan(plan))
    })
    .await
}

#[tauri::command]
pub(crate) fn discard_plan(
    plan_id: String,
    controller: State<'_, Controller>,
) -> Result<(), ErrorDto> {
    let plan_id = PlanId::parse(&plan_id).ok_or_else(ErrorDto::unknown_plan)?;
    discard_plan_core(&controller, plan_id)
}

pub(crate) async fn select_and_plan_core<Select, Plan>(
    controller: &Controller,
    select: Select,
    plan: Plan,
) -> Result<Option<PlanSnapshotDto>, ErrorDto>
where
    Select: FnOnce() -> JoinHandle<Result<Option<PathBuf>, ()>>,
    Plan: FnOnce(PathBuf) -> JoinHandle<Result<CopyPlan, DiscoverError>>,
{
    let reservation = controller.reserve_select().map_err(controller_error)?;
    let selection = match select().await {
        Ok(Ok(selection)) => selection,
        Ok(Err(())) | Err(_) => {
            controller
                .finish_select(reservation, None)
                .map_err(controller_error)?;
            return Err(ErrorDto::planning_failed());
        }
    };
    let should_plan = selection.is_some();
    controller
        .finish_select(reservation, selection)
        .map_err(controller_error)?;

    if should_plan {
        rescan_core(controller, plan).await.map(Some)
    } else {
        Ok(None)
    }
}

pub(crate) async fn rescan_core<Plan>(
    controller: &Controller,
    plan: Plan,
) -> Result<PlanSnapshotDto, ErrorDto>
where
    Plan: FnOnce(PathBuf) -> JoinHandle<Result<CopyPlan, DiscoverError>>,
{
    let reservation = controller.reserve_rescan().map_err(controller_error)?;
    let directory = reservation.directory().to_path_buf();
    match plan(directory.clone()).await {
        Ok(Ok(plan)) => controller
            .finish_rescan_with(reservation, plan, |plan_id, plan| {
                PlanSnapshotDto::from_plan(plan_id, &directory, plan)
            })
            .map_err(controller_error),
        Ok(Err(_)) | Err(_) => {
            controller
                .fail_rescan(reservation)
                .map_err(controller_error)?;
            Err(ErrorDto::planning_failed())
        }
    }
}

pub(crate) async fn execute_plan_core<Copy>(
    controller: &Controller,
    plan_id: PlanId,
    copy: Copy,
) -> Result<ExecutionResultDto, ErrorDto>
where
    Copy: FnOnce(CopyPlan) -> JoinHandle<ExecutionReport>,
{
    let reservation = controller
        .reserve_execute(plan_id)
        .map_err(controller_error)?;
    let (plan, finish) = reservation.into_parts();
    let report = copy(plan).await;
    controller
        .finish_execute(finish)
        .map_err(controller_error)?;
    match report {
        Ok(report) => Ok(ExecutionResultDto::from_report(&report)),
        Err(_) => Err(ErrorDto::copy_failed()),
    }
}

pub(crate) fn discard_plan_core(controller: &Controller, plan_id: PlanId) -> Result<(), ErrorDto> {
    let reservation = controller
        .reserve_discard(plan_id)
        .map_err(controller_error)?;
    controller
        .finish_discard(reservation)
        .map_err(controller_error)
}

fn plan_in_worker(directory: PathBuf) -> JoinHandle<Result<CopyPlan, DiscoverError>> {
    spawn_blocking(move || plan_directory(&directory))
}

fn controller_error(error: ControllerError) -> ErrorDto {
    match error {
        ControllerError::Busy(_) => ErrorDto::busy(),
        ControllerError::NoSelection => ErrorDto::planning_failed(),
        ControllerError::NoActiveOperation
        | ControllerError::PlanIdExhausted
        | ControllerError::StateUnavailable => ErrorDto::unavailable(),
        ControllerError::StalePlan {
            current: Some(_), ..
        } => ErrorDto::rescanned(),
        ControllerError::StalePlan { current: None, .. } => ErrorDto::unknown_plan(),
        ControllerError::ZeroWork(_) => ErrorDto::zero_work(),
    }
}
