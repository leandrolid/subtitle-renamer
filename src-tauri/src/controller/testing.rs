#![allow(dead_code)]

use super::*;

impl PlanId {
    pub const fn get(self) -> u64 {
        self.0
    }
}

impl StoredPlan {
    pub const fn id(&self) -> PlanId {
        self.id
    }
}

impl Controller {
    pub fn selected_directory(&self) -> Result<Option<PathBuf>, ControllerError> {
        Ok(self.lock_state()?.selected_directory.clone())
    }

    pub fn current_plan_id(&self) -> Result<Option<PlanId>, ControllerError> {
        Ok(self.lock_state()?.current_plan.as_ref().map(StoredPlan::id))
    }

    pub fn busy_kind(&self) -> Result<Option<BusyKind>, ControllerError> {
        Ok(self.lock_state()?.busy)
    }

    pub fn finish_rescan(
        &self,
        reservation: RescanReservation,
        plan: CopyPlan,
    ) -> Result<PlanId, ControllerError> {
        self.finish_rescan_with(reservation, plan, |plan_id, _| plan_id)
    }

    pub fn with_next_plan_id_for_test(next_plan_id: u64) -> Self {
        Self {
            state: Mutex::new(ControllerState {
                selected_directory: None,
                current_plan: None,
                next_plan_id: Some(PlanId::new(next_plan_id)),
                busy: None,
            }),
        }
    }

    pub fn poison_for_test(&self) {
        let _state = self.state.lock().expect("test lock");
        panic!("test state poison");
    }
}
