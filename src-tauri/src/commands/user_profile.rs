use tauri::State;

use crate::admin::service::ActionResult;
use crate::auth::session::SessionState;
use crate::state::AppState;
use crate::user_profile::service::{
    get_current_user_profile, get_profile_display_name, update_current_user_profile, UserProfileData,
    UserProfileInput,
};

#[tauri::command]
pub fn user_profile_get_current_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> ActionResult<UserProfileData> {
    get_current_user_profile(&app, &session)
}

#[tauri::command]
pub fn user_profile_update_current_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
    input: UserProfileInput,
) -> ActionResult<UserProfileData> {
    update_current_user_profile(&app, &session, input)
}

#[tauri::command]
pub fn user_profile_get_display_name_cmd(
    app: State<'_, AppState>,
    session: State<'_, SessionState>,
) -> Result<String, String> {
    get_profile_display_name(&app, &session)
}
