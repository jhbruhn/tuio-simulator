use crate::state::{AppState, ServerStatus, TuioObject};
use tauri::State;

#[tauri::command]
pub async fn start_server(state: State<'_, AppState>, port: u16) -> Result<(), String> {
    // Update config
    {
        let mut config = state.config.lock();
        config.port = port;
    }

    // Set server running flag
    {
        let mut running = state.server_running.lock();
        *running = true;
    }

    // TODO: Actually start the WebSocket server
    // This will be implemented in the websocket module

    Ok(())
}

#[tauri::command]
pub async fn stop_server(state: State<'_, AppState>) -> Result<(), String> {
    // Set server running flag
    {
        let mut running = state.server_running.lock();
        *running = false;
    }

    // TODO: Actually stop the WebSocket server
    // This will be implemented in the websocket module

    Ok(())
}

#[tauri::command]
pub async fn add_object(
    state: State<'_, AppState>,
    type_id: u16,
    x: f32,
    y: f32,
) -> Result<u32, String> {
    // Validate coordinates
    if !(0.0..=1.0).contains(&x) || !(0.0..=1.0).contains(&y) {
        return Err("Coordinates must be in range [0.0, 1.0]".to_string());
    }

    let session_id = state.allocate_session_id();
    let timestamp = chrono::Utc::now().timestamp_millis();

    let object = TuioObject {
        session_id,
        type_id,
        user_id: 0,
        component_id: 0,
        x,
        y,
        angle: 0.0,
        x_vel: 0.0,
        y_vel: 0.0,
        angle_vel: 0.0,
        last_x: x,
        last_y: y,
        last_angle: 0.0,
        last_update: timestamp,
    };

    let mut objects = state.objects.lock();
    objects.insert(session_id, object);

    Ok(session_id)
}

#[tauri::command]
pub async fn update_object(
    state: State<'_, AppState>,
    session_id: u32,
    x: f32,
    y: f32,
    angle: f32,
) -> Result<(), String> {
    // Validate coordinates
    if !(0.0..=1.0).contains(&x) || !(0.0..=1.0).contains(&y) {
        return Err("Coordinates must be in range [0.0, 1.0]".to_string());
    }

    let timestamp = chrono::Utc::now().timestamp_millis();

    let mut objects = state.objects.lock();
    if let Some(object) = objects.get_mut(&session_id) {
        object.x = x;
        object.y = y;
        object.angle = angle;
        object.last_update = timestamp;
        Ok(())
    } else {
        Err(format!("Object with session_id {} not found", session_id))
    }
}

#[tauri::command]
pub async fn remove_object(state: State<'_, AppState>, session_id: u32) -> Result<(), String> {
    let mut objects = state.objects.lock();
    if objects.remove(&session_id).is_some() {
        Ok(())
    } else {
        Err(format!("Object with session_id {} not found", session_id))
    }
}

#[tauri::command]
pub async fn set_frame_rate(state: State<'_, AppState>, fps: u32) -> Result<(), String> {
    if !(1..=120).contains(&fps) {
        return Err("FPS must be in range [1, 120]".to_string());
    }

    let mut config = state.config.lock();
    config.fps = fps;

    // TODO: Update the frame generation interval
    // This will be implemented in the tuio module

    Ok(())
}

#[tauri::command]
pub async fn get_server_status(state: State<'_, AppState>) -> Result<ServerStatus, String> {
    let running = *state.server_running.lock();
    let config = state.config.lock();
    let connected_clients = *state.connected_clients.lock();
    let frame_count = *state.frame_counter.lock();
    let object_count = state.objects.lock().len();

    Ok(ServerStatus {
        running,
        port: config.port,
        fps: config.fps,
        connected_clients,
        frame_count,
        object_count,
    })
}

#[tauri::command]
pub async fn set_canvas_dimensions(
    state: State<'_, AppState>,
    width: u16,
    height: u16,
) -> Result<(), String> {
    if width == 0 || height == 0 {
        return Err("Width and height must be greater than 0".to_string());
    }

    let mut config = state.config.lock();
    config.width = width;
    config.height = height;

    Ok(())
}
