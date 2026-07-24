fn main() {
    if let Err(error) = subtitle_renamer_desktop::run() {
        eprintln!("error while running Tauri application: {error}");
        std::process::exit(1);
    }
}
