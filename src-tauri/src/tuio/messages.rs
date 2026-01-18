use rosc::{OscMessage, OscTime, OscType};

/// FRM (Frame) message - Opens the bundle
/// OSC Address: /tuio2/frm
///
/// Parameters:
/// 1. frame_id (int32) - Sequential frame counter
/// 2. timestamp (timetag) - Milliseconds since epoch or relative time
/// 3. dimension (int32) - Sensor dimensions encoded as two 16-bit values
///    Width: bits 16-31, Height: bits 0-15
///    Encoding: (width << 16) | height
/// 4. source (string) - Source identifier (e.g., "tuio-simulator")
pub struct FrameMessage {
    pub frame_id: u32,
    pub timestamp: i64,
    pub width: u16,
    pub height: u16,
    pub source: String,
}

impl FrameMessage {
    pub fn new(frame_id: u32, timestamp: i64, width: u16, height: u16, source: String) -> Self {
        Self {
            frame_id,
            timestamp,
            width,
            height,
            source,
        }
    }

    /// Convert to OSC message
    pub fn to_osc(&self) -> OscMessage {
        // Encode dimensions: (width << 16) | height
        let dimension = ((self.width as i32) << 16) | (self.height as i32);

        // Convert timestamp to NTP timetag format
        // OscTime consists of seconds and fractional seconds
        let seconds = (self.timestamp / 1000) as u32;
        let fractional = (((self.timestamp % 1000) * u32::MAX as i64) / 1000) as u32;
        let timetag = OscTime { seconds, fractional };

        OscMessage {
            addr: "/tuio2/frm".to_string(),
            args: vec![
                OscType::Int(self.frame_id as i32),
                OscType::Time(timetag),
                OscType::Int(dimension),
                OscType::String(self.source.clone()),
            ],
        }
    }
}

/// ALV (Alive) message - Closes the bundle
/// OSC Address: /tuio2/alv
///
/// Parameters:
/// - Variable number of session_id (int32) values
/// - Lists all active session IDs in the current frame
/// - If no objects are active, ALV is sent with no parameters
pub struct AliveMessage {
    pub session_ids: Vec<u32>,
}

impl AliveMessage {
    pub fn new(session_ids: Vec<u32>) -> Self {
        Self { session_ids }
    }

    /// Convert to OSC message
    pub fn to_osc(&self) -> OscMessage {
        let args: Vec<OscType> = self
            .session_ids
            .iter()
            .map(|&id| OscType::Int(id as i32))
            .collect();

        OscMessage {
            addr: "/tuio2/alv".to_string(),
            args,
        }
    }
}

/// TOK (Token) message - Represents a tagged tangible object (fiducial marker)
/// OSC Address: /tuio2/tok
pub struct TokenMessage {
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
}

impl TokenMessage {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        session_id: u32,
        type_id: u16,
        user_id: u16,
        component_id: u16,
        x: f32,
        y: f32,
        angle: f32,
        x_vel: f32,
        y_vel: f32,
        angle_vel: f32,
    ) -> Self {
        Self {
            session_id,
            type_id,
            user_id,
            component_id,
            x,
            y,
            angle,
            x_vel,
            y_vel,
            angle_vel,
        }
    }

    /// Convert to OSC message
    pub fn to_osc(&self) -> OscMessage {
        // Encode type_user_id: (type_id << 16) | user_id
        let type_user_id = ((self.type_id as i32) << 16) | (self.user_id as i32);

        OscMessage {
            addr: "/tuio2/tok".to_string(),
            args: vec![
                OscType::Int(self.session_id as i32),
                OscType::Int(type_user_id),
                OscType::Int(self.component_id as i32),
                OscType::Float(self.x),
                OscType::Float(self.y),
                OscType::Float(self.angle),
                OscType::Float(self.x_vel),
                OscType::Float(self.y_vel),
                OscType::Float(self.angle_vel),
            ],
        }
    }
}

/// PTR (Pointer) message - Represents a pointing gesture (touch, stylus, cursor)
/// OSC Address: /tuio2/ptr
pub struct PointerMessage {
    pub session_id: u32,
    pub type_id: u16,
    pub user_id: u16,
    pub component_id: u16,
    pub x: f32,
    pub y: f32,
    pub angle: f32,
    pub shear: f32,
    pub radius: f32,
    pub pressure: f32,
    pub x_vel: f32,
    pub y_vel: f32,
    pub pressure_vel: f32,
    pub accel: f32,
}

impl PointerMessage {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        session_id: u32,
        type_id: u16,
        user_id: u16,
        component_id: u16,
        x: f32,
        y: f32,
        angle: f32,
        x_vel: f32,
        y_vel: f32,
    ) -> Self {
        Self {
            session_id,
            type_id,
            user_id,
            component_id,
            x,
            y,
            angle,
            shear: 0.0,
            radius: 0.0,
            pressure: 1.0, // Positive pressure = touching
            x_vel,
            y_vel,
            pressure_vel: 0.0,
            accel: 0.0,
        }
    }

    /// Convert to OSC message
    pub fn to_osc(&self) -> OscMessage {
        // Encode type_user_id: (type_id << 16) | user_id
        let type_user_id = ((self.type_id as i32) << 16) | (self.user_id as i32);

        OscMessage {
            addr: "/tuio2/ptr".to_string(),
            args: vec![
                OscType::Int(self.session_id as i32),
                OscType::Int(type_user_id),
                OscType::Int(self.component_id as i32),
                OscType::Float(self.x),
                OscType::Float(self.y),
                OscType::Float(self.angle),
                OscType::Float(self.shear),
                OscType::Float(self.radius),
                OscType::Float(self.pressure),
                OscType::Float(self.x_vel),
                OscType::Float(self.y_vel),
                OscType::Float(self.pressure_vel),
                OscType::Float(self.accel),
            ],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_frame_message() {
        let frm = FrameMessage::new(1234, 1705500000000, 1920, 1080, "tuio-simulator".to_string());
        let osc = frm.to_osc();

        assert_eq!(osc.addr, "/tuio2/frm");
        assert_eq!(osc.args.len(), 4);

        // Verify dimension encoding: (1920 << 16) | 1080 = 125830200
        if let OscType::Int(dimension) = osc.args[2] {
            assert_eq!(dimension, 125830200);
        } else {
            panic!("Expected Int for dimension");
        }
    }

    #[test]
    fn test_alive_message() {
        let alv = AliveMessage::new(vec![42, 43, 44]);
        let osc = alv.to_osc();

        assert_eq!(osc.addr, "/tuio2/alv");
        assert_eq!(osc.args.len(), 3);
    }

    #[test]
    fn test_alive_message_empty() {
        let alv = AliveMessage::new(vec![]);
        let osc = alv.to_osc();

        assert_eq!(osc.addr, "/tuio2/alv");
        assert_eq!(osc.args.len(), 0);
    }

    #[test]
    fn test_token_message() {
        let tok = TokenMessage::new(42, 1, 0, 0, 0.5, 0.5, 1.57, 0.0, 0.0, 0.0);
        let osc = tok.to_osc();

        assert_eq!(osc.addr, "/tuio2/tok");
        assert_eq!(osc.args.len(), 9);

        // Verify type_user_id encoding: (1 << 16) | 0 = 65536
        if let OscType::Int(type_user_id) = osc.args[1] {
            assert_eq!(type_user_id, 65536);
        } else {
            panic!("Expected Int for type_user_id");
        }
    }

    #[test]
    fn test_pointer_message() {
        let ptr = PointerMessage::new(42, 1, 0, 0, 0.5, 0.5, 0.0, 0.0, 0.0);
        let osc = ptr.to_osc();

        assert_eq!(osc.addr, "/tuio2/ptr");
        assert_eq!(osc.args.len(), 13);

        // Verify type_user_id encoding
        if let OscType::Int(type_user_id) = osc.args[1] {
            assert_eq!(type_user_id, 65536);
        } else {
            panic!("Expected Int for type_user_id");
        }

        // Verify pressure is 1.0 (touching)
        if let OscType::Float(pressure) = osc.args[8] {
            assert_eq!(pressure, 1.0);
        } else {
            panic!("Expected Float for pressure");
        }
    }
}
