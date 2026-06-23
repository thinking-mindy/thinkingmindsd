use std::path::PathBuf;

use tauri::Manager;

/// Runtime paths for local `db/` and `secrets/` (mirrors Next.js `process.cwd()` layout).
pub struct AppState {
    pub data_root: PathBuf,
}

impl AppState {
    pub fn from_app(app: &tauri::App) -> Result<Self, String> {
        let data_root = resolve_data_root(app)?;
        std::fs::create_dir_all(data_root.join("db").join("thinkingminds"))
            .map_err(|e| format!("create db dir: {e}"))?;
        std::fs::create_dir_all(data_root.join("secrets"))
            .map_err(|e| format!("create secrets dir: {e}"))?;
        Ok(Self { data_root })
    }

    pub fn db_dir(&self) -> PathBuf {
        self.data_root.join("db").join("thinkingminds")
    }

    pub fn secrets_dir(&self) -> PathBuf {
        self.data_root.join("secrets")
    }
}

fn resolve_data_root(app: &tauri::App) -> Result<PathBuf, String> {
    if let Ok(dir) = std::env::var("MINDS_DATA_DIR") {
        let trimmed = dir.trim();
        if !trimmed.is_empty() {
            return Ok(PathBuf::from(trimmed));
        }
    }

    // Dev: use repo root so `db/thinkingminds` matches `npm run dev`.
    #[cfg(debug_assertions)]
    {
        let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        if let Some(project_root) = manifest.parent() {
            if project_root.join("package.json").exists() {
                return Ok(project_root.to_path_buf());
            }
        }
    }

    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
}
