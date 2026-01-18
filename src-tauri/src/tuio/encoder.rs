use super::messages::{AliveMessage, FrameMessage, PointerMessage, TokenMessage};
use crate::state::TuioObject;
use anyhow::Result;
use rosc::{encoder, OscBundle, OscPacket, OscTime};

/// Message type for TUIO objects
#[derive(Debug, Clone, Copy)]
pub enum MessageType {
    Token,  // TOK - Tagged tangible objects (fiducials)
    Pointer, // PTR - Pointing gestures (touch, stylus)
}

/// Creates a complete TUIO 2.0 OSC bundle
///
/// A TUIO 2.0 bundle contains:
/// 1. FRM (Frame) message - opens the bundle
/// 2. Object messages (TOK or PTR) - one per object (0 or more)
/// 3. ALV (Alive) message - closes the bundle
pub fn create_tuio_bundle(
    frame_id: u32,
    timestamp: i64,
    width: u16,
    height: u16,
    source: &str,
    objects: &[TuioObject],
) -> OscBundle {
    create_tuio_bundle_with_type(frame_id, timestamp, width, height, source, objects, MessageType::Token)
}

/// Creates a TUIO bundle with specified message type
pub fn create_tuio_bundle_with_type(
    frame_id: u32,
    timestamp: i64,
    width: u16,
    height: u16,
    source: &str,
    objects: &[TuioObject],
    message_type: MessageType,
) -> OscBundle {
    let mut content = Vec::new();

    // 1. Add FRM message
    let frm = FrameMessage::new(frame_id, timestamp, width, height, source.to_string());
    content.push(OscPacket::Message(frm.to_osc()));

    // 2. Add object messages (TOK or PTR) for each object
    for obj in objects {
        let msg = match message_type {
            MessageType::Token => {
                let tok = TokenMessage::new(
                    obj.session_id,
                    obj.type_id,
                    obj.user_id,
                    obj.component_id,
                    obj.x,
                    obj.y,
                    obj.angle,
                    obj.x_vel,
                    obj.y_vel,
                    obj.angle_vel,
                );
                tok.to_osc()
            }
            MessageType::Pointer => {
                let ptr = PointerMessage::new(
                    obj.session_id,
                    obj.type_id,
                    obj.user_id,
                    obj.component_id,
                    obj.x,
                    obj.y,
                    obj.angle,
                    obj.x_vel,
                    obj.y_vel,
                );
                ptr.to_osc()
            }
        };
        content.push(OscPacket::Message(msg));
    }

    // 3. Add ALV message with all active session IDs
    let session_ids: Vec<u32> = objects.iter().map(|obj| obj.session_id).collect();
    let alv = AliveMessage::new(session_ids);
    content.push(OscPacket::Message(alv.to_osc()));

    // Create bundle with NTP timetag
    // Using immediate execution tag (0x0000000000000001) for real-time processing
    let timetag = OscTime {
        seconds: 0,
        fractional: 1,
    };

    OscBundle { timetag, content }
}

/// Encodes an OSC bundle to binary format
///
/// Returns the encoded binary data ready for transmission over WebSocket
pub fn encode_bundle(bundle: &OscBundle) -> Result<Vec<u8>> {
    let packet = OscPacket::Bundle(bundle.clone());
    encoder::encode(&packet).map_err(|e| anyhow::anyhow!("Failed to encode OSC bundle: {}", e))
}

/// Convenience function to create and encode a TUIO bundle in one step
pub fn create_and_encode_tuio_bundle(
    frame_id: u32,
    timestamp: i64,
    width: u16,
    height: u16,
    source: &str,
    objects: &[TuioObject],
) -> Result<Vec<u8>> {
    let bundle = create_tuio_bundle(frame_id, timestamp, width, height, source, objects);
    encode_bundle(&bundle)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_object() -> TuioObject {
        TuioObject {
            session_id: 42,
            type_id: 1,
            user_id: 0,
            component_id: 0,
            x: 0.5,
            y: 0.5,
            angle: 1.57,
            x_vel: 0.0,
            y_vel: 0.0,
            angle_vel: 0.0,
            last_x: 0.5,
            last_y: 0.5,
            last_angle: 1.57,
            last_update: 0,
        }
    }

    #[test]
    fn test_create_tuio_bundle_empty() {
        let bundle = create_tuio_bundle(1, 1000, 1920, 1080, "test", &[]);

        assert_eq!(bundle.content.len(), 2); // FRM + ALV only

        // Verify FRM message
        if let OscPacket::Message(msg) = &bundle.content[0] {
            assert_eq!(msg.addr, "/tuio2/frm");
        } else {
            panic!("Expected FRM message");
        }

        // Verify ALV message
        if let OscPacket::Message(msg) = &bundle.content[1] {
            assert_eq!(msg.addr, "/tuio2/alv");
            assert_eq!(msg.args.len(), 0); // No active objects
        } else {
            panic!("Expected ALV message");
        }
    }

    #[test]
    fn test_create_tuio_bundle_with_objects() {
        let obj1 = create_test_object();
        let mut obj2 = create_test_object();
        obj2.session_id = 43;

        let objects = vec![obj1, obj2];
        let bundle = create_tuio_bundle(1, 1000, 1920, 1080, "test", &objects);

        assert_eq!(bundle.content.len(), 4); // FRM + 2*TOK + ALV

        // Verify message order
        if let OscPacket::Message(msg) = &bundle.content[0] {
            assert_eq!(msg.addr, "/tuio2/frm");
        } else {
            panic!("Expected FRM message");
        }

        if let OscPacket::Message(msg) = &bundle.content[1] {
            assert_eq!(msg.addr, "/tuio2/tok");
        } else {
            panic!("Expected first TOK message");
        }

        if let OscPacket::Message(msg) = &bundle.content[2] {
            assert_eq!(msg.addr, "/tuio2/tok");
        } else {
            panic!("Expected second TOK message");
        }

        if let OscPacket::Message(msg) = &bundle.content[3] {
            assert_eq!(msg.addr, "/tuio2/alv");
            assert_eq!(msg.args.len(), 2); // Two active objects
        } else {
            panic!("Expected ALV message");
        }
    }

    #[test]
    fn test_encode_bundle() {
        let bundle = create_tuio_bundle(1, 1000, 1920, 1080, "test", &[]);
        let encoded = encode_bundle(&bundle);

        assert!(encoded.is_ok());
        let data = encoded.unwrap();

        // OSC bundle starts with "#bundle\0"
        assert_eq!(&data[0..8], b"#bundle\0");

        // Should have some data beyond the header
        assert!(data.len() > 8);
    }

    #[test]
    fn test_create_and_encode_tuio_bundle() {
        let obj = create_test_object();
        let result = create_and_encode_tuio_bundle(1, 1000, 1920, 1080, "test", &[obj]);

        assert!(result.is_ok());
        let data = result.unwrap();

        // Verify it's a valid OSC bundle
        assert_eq!(&data[0..8], b"#bundle\0");
        assert!(data.len() > 8);
    }
}
