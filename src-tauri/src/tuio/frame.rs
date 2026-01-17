use crate::state::{AppState, TuioObject};
use crate::tuio::encoder::create_and_encode_tuio_bundle;
use anyhow::Result;
use std::collections::HashMap;

/// Calculate velocities for all objects based on position/angle deltas
///
/// Velocities are calculated as:
/// - x_vel = (current_x - last_x) / delta_time_seconds
/// - y_vel = (current_y - last_y) / delta_time_seconds
/// - angle_vel = (current_angle - last_angle) / delta_time_seconds
pub fn calculate_velocities(objects: &mut HashMap<u32, TuioObject>, current_timestamp: i64) {
    for object in objects.values_mut() {
        let delta_time_ms = current_timestamp - object.last_update;

        // Only calculate velocity if enough time has passed (avoid division by zero)
        // and if object has actually been updated
        if delta_time_ms > 1 {
            let delta_time_seconds = delta_time_ms as f32 / 1000.0;

            // Calculate position velocities
            let delta_x = object.x - object.last_x;
            let delta_y = object.y - object.last_y;
            object.x_vel = delta_x / delta_time_seconds;
            object.y_vel = delta_y / delta_time_seconds;

            // Calculate rotation velocity
            let delta_angle = object.angle - object.last_angle;
            object.angle_vel = delta_angle / delta_time_seconds;

            // Update last known values
            object.last_x = object.x;
            object.last_y = object.y;
            object.last_angle = object.angle;
            object.last_update = current_timestamp;
        }
    }
}

/// Generate a complete TUIO frame bundle
///
/// This function:
/// 1. Gets the current frame ID and increments the counter
/// 2. Gets the current timestamp
/// 3. Collects all objects from state
/// 4. Calculates velocities for all objects
/// 5. Creates and encodes the OSC bundle
pub fn generate_frame(state: &AppState) -> Result<Vec<u8>> {
    let timestamp = chrono::Utc::now().timestamp_millis();
    let frame_id = state.increment_frame_counter();

    // Get config
    let config = state.config.lock();
    let width = config.width;
    let height = config.height;
    let source = config.source.clone();
    drop(config);

    // Get objects and calculate velocities
    let mut objects = state.objects.lock();
    calculate_velocities(&mut objects, timestamp);

    // Convert to vector for encoding
    let objects_vec: Vec<TuioObject> = objects.values().cloned().collect();
    drop(objects);

    // Create and encode bundle
    create_and_encode_tuio_bundle(frame_id, timestamp, width, height, &source, &objects_vec)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;
    use std::time::Duration;

    fn create_test_object(session_id: u32, x: f32, y: f32, angle: f32) -> TuioObject {
        let timestamp = chrono::Utc::now().timestamp_millis();
        TuioObject {
            session_id,
            type_id: 1,
            user_id: 0,
            component_id: 0,
            x,
            y,
            angle,
            x_vel: 0.0,
            y_vel: 0.0,
            angle_vel: 0.0,
            last_x: x,
            last_y: y,
            last_angle: angle,
            last_update: timestamp,
        }
    }

    #[test]
    fn test_calculate_velocities_no_movement() {
        let timestamp = chrono::Utc::now().timestamp_millis();
        let mut objects = HashMap::new();
        objects.insert(1, create_test_object(1, 0.5, 0.5, 0.0));

        // Wait a bit
        sleep(Duration::from_millis(10));
        let new_timestamp = chrono::Utc::now().timestamp_millis();

        calculate_velocities(&mut objects, new_timestamp);

        let obj = objects.get(&1).unwrap();
        // No movement = zero velocity
        assert_eq!(obj.x_vel, 0.0);
        assert_eq!(obj.y_vel, 0.0);
        assert_eq!(obj.angle_vel, 0.0);
    }

    #[test]
    fn test_calculate_velocities_with_movement() {
        let timestamp = chrono::Utc::now().timestamp_millis();
        let mut obj = create_test_object(1, 0.5, 0.5, 0.0);
        obj.last_update = timestamp - 100; // 100ms ago

        let mut objects = HashMap::new();
        objects.insert(1, obj);

        // Move the object
        {
            let obj = objects.get_mut(&1).unwrap();
            obj.x = 0.6; // Moved 0.1 units
            obj.y = 0.7; // Moved 0.2 units
            obj.angle = 1.57; // Rotated ~90 degrees
        }

        calculate_velocities(&mut objects, timestamp);

        let obj = objects.get(&1).unwrap();
        // Velocity should be delta / time_in_seconds
        // 0.1 / 0.1s = 1.0 units/s
        assert!((obj.x_vel - 1.0).abs() < 0.01);
        // 0.2 / 0.1s = 2.0 units/s
        assert!((obj.y_vel - 2.0).abs() < 0.01);
        // 1.57 / 0.1s = 15.7 rad/s
        assert!((obj.angle_vel - 15.7).abs() < 0.01);
    }

    #[test]
    fn test_calculate_velocities_multiple_objects() {
        let timestamp = chrono::Utc::now().timestamp_millis();
        let mut objects = HashMap::new();

        let mut obj1 = create_test_object(1, 0.5, 0.5, 0.0);
        obj1.last_update = timestamp - 100;
        obj1.x = 0.6;
        objects.insert(1, obj1);

        let mut obj2 = create_test_object(2, 0.3, 0.3, 0.0);
        obj2.last_update = timestamp - 100;
        obj2.y = 0.4;
        objects.insert(2, obj2);

        calculate_velocities(&mut objects, timestamp);

        let obj1 = objects.get(&1).unwrap();
        assert!((obj1.x_vel - 1.0).abs() < 0.01);
        assert!((obj1.y_vel - 0.0).abs() < 0.01);

        let obj2 = objects.get(&2).unwrap();
        assert!((obj2.x_vel - 0.0).abs() < 0.01);
        assert!((obj2.y_vel - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_generate_frame() {
        let state = AppState::new();

        // Add a test object
        {
            let mut objects = state.objects.lock();
            objects.insert(1, create_test_object(1, 0.5, 0.5, 0.0));
        }

        // Generate frame
        let result = generate_frame(&state);
        assert!(result.is_ok());

        let data = result.unwrap();
        // Should be a valid OSC bundle
        assert_eq!(&data[0..8], b"#bundle\0");
        assert!(data.len() > 8);
    }

    #[test]
    fn test_generate_frame_increments_counter() {
        let state = AppState::new();

        let initial_count = *state.frame_counter.lock();
        generate_frame(&state).unwrap();
        let after_count = *state.frame_counter.lock();

        assert_eq!(after_count, initial_count + 1);
    }

    #[test]
    fn test_generate_frame_empty_objects() {
        let state = AppState::new();

        let result = generate_frame(&state);
        assert!(result.is_ok());

        let data = result.unwrap();
        // Should still be a valid bundle even with no objects
        assert_eq!(&data[0..8], b"#bundle\0");
    }
}
