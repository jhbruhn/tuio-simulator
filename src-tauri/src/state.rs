use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TuioObject {
    pub session_id: u32,
    pub type_id: u16,
    pub user_id: u16,
    pub component_id: u16,
    pub x: f32,
    pub y: f32,
    pub angle: f32,
    pub x_vel: f32,
    pub y_vel: f32,
    pub angle_vel: f32,
    pub last_x: f32,
    pub last_y: f32,
    pub last_angle: f32,
    pub last_update: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub port: u16,
    pub fps: u32,
    pub width: u16,
    pub height: u16,
    pub source: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            port: 3343,
            fps: 60,
            width: 1920,
            height: 1080,
            source: "tuio-simulator".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub running: bool,
    pub port: u16,
    pub fps: u32,
    pub connected_clients: usize,
    pub frame_count: u32,
    pub object_count: usize,
}

pub struct AppState {
    pub objects: Arc<Mutex<HashMap<u32, TuioObject>>>,
    pub next_session_id: Arc<Mutex<u32>>,
    pub frame_counter: Arc<Mutex<u32>>,
    pub config: Arc<Mutex<Config>>,
    pub server_running: Arc<Mutex<bool>>,
    pub connected_clients: Arc<Mutex<usize>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            objects: Arc::new(Mutex::new(HashMap::new())),
            next_session_id: Arc::new(Mutex::new(0)),
            frame_counter: Arc::new(Mutex::new(0)),
            config: Arc::new(Mutex::new(Config::default())),
            server_running: Arc::new(Mutex::new(false)),
            connected_clients: Arc::new(Mutex::new(0)),
        }
    }

    pub fn allocate_session_id(&self) -> u32 {
        let mut next_id = self.next_session_id.lock();
        let id = *next_id;
        *next_id = next_id.wrapping_add(1);
        id
    }

    pub fn increment_frame_counter(&self) -> u32 {
        let mut counter = self.frame_counter.lock();
        *counter = counter.wrapping_add(1);
        *counter
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
