use std::{
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard},
};

use serde::{Deserialize, Serialize};
use subtitle_renamer::CopyPlan;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct PlanId(u64);

impl PlanId {
    pub(crate) const fn new(value: u64) -> Self {
        Self(value)
    }

    pub(crate) fn parse(value: &str) -> Option<Self> {
        value.parse().ok().map(Self)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BusyKind {
    Select,
    Rescan,
    Execute,
    Discard,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ControllerError {
    Busy(BusyKind),
    NoSelection,
    NoActiveOperation,
    StalePlan {
        requested: PlanId,
        current: Option<PlanId>,
    },
    ZeroWork(PlanId),
    PlanIdExhausted,
    StateUnavailable,
}

#[derive(Debug)]
pub struct StoredPlan {
    id: PlanId,
    plan: CopyPlan,
}

#[derive(Debug)]
pub struct Controller {
    state: Mutex<ControllerState>,
}

#[derive(Debug)]
struct ControllerState {
    selected_directory: Option<PathBuf>,
    current_plan: Option<StoredPlan>,
    next_plan_id: Option<PlanId>,
    busy: Option<BusyKind>,
}

impl ControllerState {
    fn finish(&mut self, expected: BusyKind) -> Result<(), ControllerError> {
        match self.busy.take() {
            Some(actual) if actual == expected => Ok(()),
            Some(actual) => {
                self.busy = Some(actual);
                Err(ControllerError::Busy(actual))
            }
            None => Err(ControllerError::NoActiveOperation),
        }
    }

    fn allocate_plan_id(&mut self) -> Result<PlanId, ControllerError> {
        let plan_id = self.next_plan_id.ok_or(ControllerError::PlanIdExhausted)?;
        self.next_plan_id = plan_id.0.checked_add(1).map(PlanId::new);
        Ok(plan_id)
    }
}

impl Controller {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(ControllerState {
                selected_directory: None,
                current_plan: None,
                next_plan_id: Some(PlanId::new(1)),
                busy: None,
            }),
        }
    }

    pub fn reserve_select(&self) -> Result<SelectReservation, ControllerError> {
        let mut state = self.lock_state()?;
        if let Some(busy) = state.busy {
            return Err(ControllerError::Busy(busy));
        }
        state.busy = Some(BusyKind::Select);
        Ok(SelectReservation { _private: () })
    }

    pub fn finish_select(
        &self,
        _reservation: SelectReservation,
        selection: Option<PathBuf>,
    ) -> Result<(), ControllerError> {
        let mut state = self.lock_state()?;
        state.finish(BusyKind::Select)?;
        if let Some(directory) = selection {
            state.selected_directory = Some(directory);
            state.current_plan = None;
        }
        Ok(())
    }

    pub fn reserve_rescan(&self) -> Result<RescanReservation, ControllerError> {
        let mut state = self.lock_state()?;
        if let Some(busy) = state.busy {
            return Err(ControllerError::Busy(busy));
        }
        let directory = state
            .selected_directory
            .clone()
            .ok_or(ControllerError::NoSelection)?;
        state.busy = Some(BusyKind::Rescan);
        state.current_plan = None;
        Ok(RescanReservation {
            directory,
            _private: (),
        })
    }

    pub fn finish_rescan_with<T>(
        &self,
        _reservation: RescanReservation,
        plan: CopyPlan,
        project: impl FnOnce(PlanId, &CopyPlan) -> T,
    ) -> Result<T, ControllerError> {
        let mut state = self.lock_state()?;
        state.finish(BusyKind::Rescan)?;
        let plan_id = state.allocate_plan_id()?;
        let output = project(plan_id, &plan);
        state.current_plan = Some(StoredPlan { id: plan_id, plan });
        Ok(output)
    }

    pub fn fail_rescan(&self, _reservation: RescanReservation) -> Result<(), ControllerError> {
        self.lock_state()?.finish(BusyKind::Rescan)
    }

    pub fn reserve_execute(
        &self,
        requested: PlanId,
    ) -> Result<ExecuteReservation, ControllerError> {
        let mut state = self.lock_state()?;
        if let Some(busy) = state.busy {
            return Err(ControllerError::Busy(busy));
        }
        let Some(plan) = state.current_plan.take() else {
            return Err(ControllerError::StalePlan {
                requested,
                current: None,
            });
        };
        if plan.id != requested {
            let current = plan.id;
            state.current_plan = Some(plan);
            return Err(ControllerError::StalePlan {
                requested,
                current: Some(current),
            });
        }
        if plan.plan.copies().is_empty() {
            state.current_plan = Some(plan);
            return Err(ControllerError::ZeroWork(requested));
        }
        state.busy = Some(BusyKind::Execute);
        Ok(ExecuteReservation { plan })
    }

    pub fn finish_execute(&self, _finish: ExecuteFinish) -> Result<(), ControllerError> {
        self.lock_state()?.finish(BusyKind::Execute)
    }

    pub fn reserve_discard(
        &self,
        requested: PlanId,
    ) -> Result<DiscardReservation, ControllerError> {
        let mut state = self.lock_state()?;
        if let Some(busy) = state.busy {
            return Err(ControllerError::Busy(busy));
        }
        let Some(plan) = state.current_plan.take() else {
            return Err(ControllerError::StalePlan {
                requested,
                current: None,
            });
        };
        if plan.id != requested {
            let current = plan.id;
            state.current_plan = Some(plan);
            return Err(ControllerError::StalePlan {
                requested,
                current: Some(current),
            });
        }
        state.busy = Some(BusyKind::Discard);
        Ok(DiscardReservation { _plan: plan })
    }

    pub fn finish_discard(&self, _reservation: DiscardReservation) -> Result<(), ControllerError> {
        self.lock_state()?.finish(BusyKind::Discard)
    }

    fn lock_state(&self) -> Result<MutexGuard<'_, ControllerState>, ControllerError> {
        self.state
            .lock()
            .map_err(|_| ControllerError::StateUnavailable)
    }
}

#[cfg(test)]
#[path = "controller/testing.rs"]
mod testing;

pub struct SelectReservation {
    _private: (),
}

pub struct RescanReservation {
    directory: PathBuf,
    _private: (),
}

impl RescanReservation {
    pub fn directory(&self) -> &Path {
        &self.directory
    }
}

pub struct ExecuteReservation {
    plan: StoredPlan,
}

impl ExecuteReservation {
    pub fn into_parts(self) -> (CopyPlan, ExecuteFinish) {
        (self.plan.plan, ExecuteFinish { _private: () })
    }
}

pub struct ExecuteFinish {
    _private: (),
}

pub struct DiscardReservation {
    _plan: StoredPlan,
}
