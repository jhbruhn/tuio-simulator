use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct ClientConnectedEvent {
    pub client_id: String,
}

#[derive(Clone, Serialize)]
pub struct ClientDisconnectedEvent {
    pub client_id: String,
}

#[derive(Clone, Serialize)]
pub struct FrameSentEvent {
    pub frame_id: u32,
    pub object_count: usize,
}

#[derive(Clone, Serialize)]
pub struct ServerStatusEvent {
    pub running: bool,
    pub connected_clients: usize,
}

#[derive(Clone, Serialize)]
pub struct OscMessageEvent {
    pub frame_id: u32,
    pub timestamp: i64,
    pub object_count: usize,
    pub message_size: usize,
    pub connected_clients: usize,
}

/// Emit a client connected event
pub fn emit_client_connected(app: &AppHandle, client_id: String) {
    let event = ClientConnectedEvent { client_id };
    let _ = app.emit("client_connected", event);
}

/// Emit a client disconnected event
pub fn emit_client_disconnected(app: &AppHandle, client_id: String) {
    let event = ClientDisconnectedEvent { client_id };
    let _ = app.emit("client_disconnected", event);
}

/// Emit a frame sent event
pub fn emit_frame_sent(app: &AppHandle, frame_id: u32, object_count: usize) {
    let event = FrameSentEvent {
        frame_id,
        object_count,
    };
    let _ = app.emit("frame_sent", event);
}

/// Emit a server status change event
pub fn emit_server_status(app: &AppHandle, running: bool, connected_clients: usize) {
    let event = ServerStatusEvent {
        running,
        connected_clients,
    };
    let _ = app.emit("server_status", event);
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
