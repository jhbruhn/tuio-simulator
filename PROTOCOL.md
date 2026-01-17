# TUIO 2.0 Protocol Specification

## Overview

TUIO 2.0 is a protocol for transmitting tangible user interface data over a network. It uses **OSC (Open Sound Control)** as its underlying message format and is designed to be transport-agnostic (UDP, TCP, WebSocket).

**Official Specification**: https://www.tuio.org/?tuio20

---

## Coordinate System

TUIO uses **normalized coordinates** in the range `[0.0, 1.0]`:
- **X**: 0.0 = left edge, 1.0 = right edge
- **Y**: 0.0 = top edge, 1.0 = bottom edge

This allows the protocol to be resolution-independent.

---

## Message Structure

Every TUIO 2.0 bundle contains **exactly two required messages**:

1. **FRM (Frame)** - Opens the bundle
2. **ALV (Alive)** - Closes the bundle

Between FRM and ALV, component messages (TOK, PTR, BND, etc.) are included.

### OSC Bundle Format

```
OSC Bundle:
├── Timetag (8 bytes)
├── FRM message
├── TOK message (0 or more)
├── PTR message (0 or more)
├── BND message (0 or more)
└── ALV message
```

---

## Core Messages

### 1. FRM (Frame Message)

**OSC Address**: `/tuio2/frm`

**Purpose**: Identifies the frame and sensor properties.

**Parameters**:
1. `frame_id` (int32) - Sequential frame counter
2. `timestamp` (timetag) - Milliseconds since epoch or relative time
3. `dimension` (int32) - Sensor dimensions encoded as two 16-bit values
   - Width: bits 16-31
   - Height: bits 0-15
   - Encoding: `(width << 16) | height`
4. `source` (string) - Source identifier (e.g., "tuio-simulator")

**Example**:
```
/tuio2/frm 1234 1705500000000 125829120 "tuio-simulator"
         (frame_id=1234, timestamp, dimension=1920x1080, source)
```

**Dimension Calculation**:
```rust
let dimension: i32 = ((width as i32) << 16) | (height as i32);
// For 1920x1080: (1920 << 16) | 1080 = 125829120
```

---

### 2. ALV (Alive Message)

**OSC Address**: `/tuio2/alv`

**Purpose**: Lists all active session IDs in the current frame.

**Parameters**:
- `session_id_1` (int32)
- `session_id_2` (int32)
- ... (variable length)

**Example**:
```
/tuio2/alv 42 43 44
         (three active objects with session IDs 42, 43, 44)
```

**Important**:
- If no objects are active, ALV still must be sent with no parameters
- ALV message allows clients to detect removed objects

---

### 3. TOK (Token Message)

**OSC Address**: `/tuio2/tok`

**Purpose**: Represents a tagged tangible object (fiducial marker).

**Parameters** (in order):
1. `session_id` (int32) - Unique ID for this object instance (0 to 4,294,967,295)
2. `type_user_id` (int32) - Combined type and user ID
   - Type ID: bits 16-31
   - User ID: bits 0-15
   - Encoding: `(type_id << 16) | user_id`
3. `component_id` (int32) - Component identifier (0 for simple objects)
4. `x_pos` (float) - Normalized X position (0.0 - 1.0)
5. `y_pos` (float) - Normalized Y position (0.0 - 1.0)
6. `angle` (float) - Rotation angle in radians (0.0 - 2π)
7. `x_vel` (float) - X velocity (units/second)
8. `y_vel` (float) - Y velocity (units/second)
9. `angle_vel` (float) - Rotation velocity (radians/second)
10. `accel` (float) - Motion acceleration (optional)

**Minimum Required**: Parameters 1-6
**Recommended**: Parameters 1-9

**Example**:
```
/tuio2/tok 42 65536 0 0.5 0.5 1.57 0.0 0.0 0.0
         (session_id=42, type=1, user=0, component=0,
          x=0.5, y=0.5, angle=90°, velocities=0)
```

**Type/User ID Calculation**:
```rust
let type_user_id: i32 = ((type_id as i32) << 16) | (user_id as i32);
// For type=1, user=0: (1 << 16) | 0 = 65536
```

---

### 4. PTR (Pointer Message) - Optional

**OSC Address**: `/tuio2/ptr`

**Purpose**: Represents a pointing gesture (touch, stylus, cursor).

**Parameters**:
1. `session_id` (int32)
2. `type_user_id` (int32)
3. `component_id` (int32)
4. `x_pos` (float)
5. `y_pos` (float)
6. `angle` (float) - Pointing angle
7. `shear` (float) - Shear angle
8. `radius` (float) - Region of influence
9. `pressure` (float) - Pressure (-1.0 to 1.0, negative = hovering)
10. `x_vel` (float)
11. `y_vel` (float)
12. `pressure_vel` (float)
13. `accel` (float)

**Note**: Not implemented in MVP (future enhancement).

---

### 5. BND (Bounds Message) - Optional

**OSC Address**: `/tuio2/bnd`

**Purpose**: Represents an untagged object via oriented bounding box.

**Parameters**:
1. `session_id` (int32)
2. `x_pos` (float) - Center X
3. `y_pos` (float) - Center Y
4. `angle` (float) - Major axis angle
5. `width` (float)
6. `height` (float)
7. `area` (float)
8. `x_vel` (float)
9. `y_vel` (float)
10. `angle_vel` (float)
11. `accel` (float)

**Note**: Not implemented in MVP (future enhancement).

---

## Session ID Management

### Rules
- Each object instance is assigned a unique **32-bit unsigned integer** (0 to 4,294,967,295)
- Session IDs are assigned when an object is created
- Session IDs persist for the lifetime of the object
- When an object is removed, its session ID may be reused (but not immediately)
- Session IDs are **not** related to object types

### Implementation Strategy
```rust
// Simple incrementing counter
let next_session_id = 0u32;

fn allocate_session_id() -> u32 {
    let id = next_session_id;
    next_session_id = next_session_id.wrapping_add(1);
    id
}
```

---

## OSC Encoding

### OSC Message Format
```
OSC Message:
├── Address pattern (null-terminated string, aligned to 4 bytes)
├── Type tag string (comma + type chars, null-terminated, aligned to 4 bytes)
└── Arguments (each aligned to 4 bytes)
```

### Type Tags
- `i` - int32
- `f` - float32
- `s` - string (null-terminated, aligned to 4 bytes)
- `t` - timetag (8 bytes, NTP format)

### Example: FRM Message Encoding
```
Address: "/tuio2/frm\0\0"  (12 bytes, aligned)
Type tags: ",iits\0\0\0"   (8 bytes)
Arguments:
  - frame_id: 1234 (4 bytes)
  - timestamp: 1705500000000 (8 bytes as timetag)
  - dimension: 125829120 (4 bytes)
  - source: "tuio-simulator\0\0" (16 bytes, aligned)
```

### OSC Bundle Format
```
Bundle Identifier: "#bundle\0" (8 bytes)
Timetag: 8 bytes (NTP format or immediate=0x0000000000000001)
[Message 1 Size (int32)][Message 1 Data]
[Message 2 Size (int32)][Message 2 Data]
...
```

---

## Transport: WebSocket

### Protocol
- **OSC-over-WebSocket**: Raw OSC bundle sent as binary WebSocket message
- **Default Port**: 3343 (configurable)
- **Message Type**: Binary frames (not text)

### Connection Flow
```
Client connects to ws://localhost:3343
  ↓
Server accepts connection
  ↓
Server broadcasts OSC bundles at configured FPS
  ↓
Client receives binary OSC bundle messages
  ↓
Client decodes OSC and updates TUIO state
```

### Frame Broadcasting
```rust
// Pseudo-code
loop {
    sleep(1000ms / fps);

    let bundle = create_osc_bundle();

    for client in websocket_clients {
        client.send_binary(bundle);
    }
}
```

---

## Frame Generation Logic

### 1. Collect Current State
```rust
let objects = state.get_all_objects();
let frame_id = state.increment_frame_counter();
let timestamp = get_current_timestamp_ms();
```

### 2. Calculate Velocities
```rust
for object in objects {
    let delta_time = timestamp - object.last_update;
    if delta_time > 0 {
        object.x_vel = (object.x - object.last_x) / (delta_time as f32 / 1000.0);
        object.y_vel = (object.y - object.last_y) / (delta_time as f32 / 1000.0);
        object.angle_vel = (object.angle - object.last_angle) / (delta_time as f32 / 1000.0);
    }

    object.last_x = object.x;
    object.last_y = object.y;
    object.last_angle = object.angle;
    object.last_update = timestamp;
}
```

### 3. Build OSC Bundle
```rust
let mut bundle = OscBundle::new();

// FRM message
bundle.add(OscMessage {
    addr: "/tuio2/frm",
    args: vec![
        OscType::Int(frame_id),
        OscType::Time(timestamp),
        OscType::Int((width << 16) | height),
        OscType::String("tuio-simulator".into()),
    ],
});

// TOK messages
for object in objects {
    bundle.add(OscMessage {
        addr: "/tuio2/tok",
        args: vec![
            OscType::Int(object.session_id),
            OscType::Int((object.type_id << 16) | object.user_id),
            OscType::Int(object.component_id),
            OscType::Float(object.x),
            OscType::Float(object.y),
            OscType::Float(object.angle),
            OscType::Float(object.x_vel),
            OscType::Float(object.y_vel),
            OscType::Float(object.angle_vel),
        ],
    });
}

// ALV message
let session_ids: Vec<OscType> = objects
    .iter()
    .map(|obj| OscType::Int(obj.session_id))
    .collect();

bundle.add(OscMessage {
    addr: "/tuio2/alv",
    args: session_ids,
});
```

### 4. Encode and Broadcast
```rust
let encoded = rosc::encoder::encode(&bundle)?;
websocket_server.broadcast_binary(encoded)?;
```

---

## Velocity Calculation Details

### Position Velocity
```
x_vel = (current_x - previous_x) / delta_time_seconds
y_vel = (current_y - previous_y) / delta_time_seconds

Units: normalized_units/second
Range: Typically -2.0 to +2.0 (can exceed if moving very fast)
```

### Rotation Velocity
```
angle_vel = (current_angle - previous_angle) / delta_time_seconds

Units: radians/second
Range: -2π to +2π typically
```

### Considerations
- Only update velocity when object has actually moved
- If delta_time < threshold (e.g., 1ms), skip velocity update to avoid division errors
- Smooth velocity using exponential moving average (optional):
  ```rust
  smoothed_vel = alpha * new_vel + (1.0 - alpha) * old_vel
  ```

---

## Angle Representation

TUIO 2.0 uses **radians**:
- `0.0` = 0° (pointing right)
- `π/2` ≈ `1.5708` = 90° (pointing down)
- `π` ≈ `3.1416` = 180° (pointing left)
- `3π/2` ≈ `4.7124` = 270° (pointing up)
- `2π` ≈ `6.2832` = 360° (back to 0°)

### Conversion
```rust
fn degrees_to_radians(degrees: f32) -> f32 {
    degrees * std::f32::consts::PI / 180.0
}

fn radians_to_degrees(radians: f32) -> f32 {
    radians * 180.0 / std::f32::consts::PI
}
```

---

## Testing with tuio_client_js

### Expected Client Behavior
The tuio_client_js library will:
1. Connect to `ws://localhost:3343`
2. Receive binary WebSocket messages
3. Decode OSC bundles
4. Parse TUIO 2.0 messages
5. Emit events for object add/update/remove

### Verification
```javascript
import TuioClient from 'tuio_client_js';

const client = new TuioClient('ws://localhost:3343');

client.on('addTuioToken', (token) => {
    console.log('Token added:', token.sessionId, token.x, token.y, token.angle);
});

client.on('updateTuioToken', (token) => {
    console.log('Token updated:', token.sessionId, token.x, token.y);
});

client.on('removeTuioToken', (token) => {
    console.log('Token removed:', token.sessionId);
});

client.connect();
```

---

## Reference Implementation Notes

### Frame Rate Considerations
- **30 FPS**: Smooth for most applications (33.33ms interval)
- **60 FPS**: Very smooth, recommended (16.67ms interval)
- **120 FPS**: High precision, may increase CPU/network load (8.33ms interval)

### Bandwidth Estimation
```
Per object per frame:
- TOK message: ~60 bytes (OSC encoded)

For 10 objects at 60 FPS:
- 10 objects × 60 bytes × 60 FPS = 36,000 bytes/second ≈ 35 KB/s
```

### Recommended Defaults
- **Port**: 3343
- **FPS**: 60
- **Canvas dimensions**: 1920×1080
- **Source**: "tuio-simulator"
- **Component ID**: 0 (for simple objects)
- **User ID**: 0 (unless multi-user scenarios)
