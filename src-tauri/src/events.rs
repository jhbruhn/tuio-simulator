use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct OscMessageEvent {
    pub frame_id: u32,
    pub timestamp: i64,
    pub object_count: usize,
    pub message_size: usize,
    pub connected_clients: usize,
}

/// Emit an OSC message debug event
pub fn emit_osc_message(
    app: &AppHandle,
    frame_id: u32,
    timestamp: i64,
    object_count: usize,
    message_size: usize,
    connected_clients: usize,
) {
    let event = OscMessageEvent {
        frame_id,
        timestamp,
        object_count,
        message_size,
        connected_clients,
    };
    let _ = app.emit("osc_message", event);
}
