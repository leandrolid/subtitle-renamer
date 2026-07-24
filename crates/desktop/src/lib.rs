mod commands;
mod controller;
mod dto;

pub use controller::PlanId;

pub fn run() -> tauri::Result<()> {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(controller::Controller::new())
        .invoke_handler(tauri::generate_handler![
            commands::select_and_plan,
            commands::rescan,
            commands::execute_plan,
            commands::discard_plan,
        ])
        .run(tauri::generate_context!())
}
