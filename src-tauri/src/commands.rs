use crate::events;
use crate::state::{AppState, ServerStatus, TuioObject};
use crate::tuio::frame::generate_frame;
use std::time::Duration;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn start_server(
    app: AppHandle,
    state: State<'_, AppState>,
    port: u16,
) -> Result<(), String> {
    // Check if already running
    {
        let running = state.server_running.lock();
        if *running {
            return Err("Server is already running".to_string());
        }
    }

    // Update config
    {
        let mut config = state.config.lock();
        config.port = port;
    }

    // Start WebSocket server
    state
        .websocket_server
        .start(port)
        .await
        .map_err(|e| format!("Failed to start WebSocket server: {}", e))?;

    // Start frame generation task
    let state_clone = state.inner().clone();
    let app_clone = app.clone();
    let task = tokio::spawn(async move {
        frame_generation_loop(state_clone, app_clone).await;
    });

    // Store task handle
    {
        let mut frame_task = state.frame_task.lock();
        *frame_task = Some(task);
    }

    // Set server running flag
    {
        let mut running = state.server_running.lock();
        *running = true;
    }

    Ok(())
}

#[tauri::command]
pub async fn stop_server(state: State<'_, AppState>) -> Result<(), String> {
    // Set server running flag (this will stop the frame generation loop)
    {
        let mut running = state.server_running.lock();
        *running = false;
    }

    // Abort the frame generation task
    {
        let mut frame_task = state.frame_task.lock();
        if let Some(task) = frame_task.take() {
            task.abort();
        }
    }

    // Stop the WebSocket server
    state.websocket_server.stop().await;

    Ok(())
}

#[tauri::command]
pub async fn add_object(
    state: State<'_, AppState>,
    component_id: u16,
    x: f32,
    y: f32,
) -> Result<u32, String> {
    // Validate component_id range (1-24)
    if !(1..=24).contains(&component_id) {
        return Err("Component ID must be in range [1, 24]".to_string());
    }

    // Validate coordinates
    if !(0.0..=1.0).contains(&x) || !(0.0..=1.0).contains(&y) {
        return Err("Coordinates must be in range [0.0, 1.0]".to_string());
    }

    // Check if component_id is already in use
    {
        let objects = state.objects.lock();
        if objects.values().any(|obj| obj.component_id == component_id) {
            return Err(format!("Component ID {} is already in use", component_id));
        }
    }

    let session_id = state.allocate_session_id();
    let timestamp = chrono::Utc::now().timestamp_millis();

    let object = TuioObject {
        session_id,
        type_id: component_id, // Use component_id as type_id for color mapping
        user_id: 0,
        component_id,
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
    let connected_clients = state.get_connected_clients();
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

/// Frame generation loop that runs continuously while the server is running
async fn frame_generation_loop(state: AppState, app: AppHandle) {
    loop {
        // Check if server is still running
        {
            let running = state.server_running.lock();
            if !*running {
                break;
            }
        }

        // Generate frame
        match generate_frame(&state) {
            Ok(frame_data) => {
                // Get current frame info for debugging
                let frame_id = *state.frame_counter.lock();
                let object_count = state.objects.lock().len();
                let message_size = frame_data.len();
                let connected_clients = state.get_connected_clients();
                let timestamp = chrono::Utc::now().timestamp_millis();

                // Emit OSC message debug event
                events::emit_osc_message(
                    &app,
                    frame_id,
                    timestamp,
                    object_count,
                    message_size,
                    connected_clients,
                );

                // Broadcast to all connected clients
                if let Err(e) = state.websocket_server.broadcast(frame_data).await {
                    eprintln!("Error broadcasting frame: {}", e);
                }
            }
            Err(e) => {
                eprintln!("Error generating frame: {}", e);
            }
        }

        // Sleep based on configured FPS
        let fps = {
            let config = state.config.lock();
            config.fps
        };

        let interval_ms = 1000 / fps.max(1);
        tokio::time::sleep(Duration::from_millis(interval_ms as u64)).await;
    }
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
