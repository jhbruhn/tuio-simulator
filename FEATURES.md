# TUIO Simulator - Feature Specification

## Overview

This document details all features of the TUIO Simulator, organized by priority and implementation phase.

---

## Feature Categories

### ✅ Must-Have (MVP)
Essential features required for a functional simulator.

### 🔧 Should-Have (Enhanced)
Important features that significantly improve usability.

### ⭕ Nice-to-Have (Future)
Optional features for advanced use cases.

---

## Protocol Features

### ✅ TUIO 2.0 Message Support (MVP)

#### FRM (Frame Message)
- **Purpose**: Bundle header with frame metadata
- **Fields**:
  - Frame ID (incremental counter)
  - Timestamp (milliseconds since epoch)
  - Sensor dimensions (canvas width × height)
  - Source identification string ("tuio-simulator")
- **Requirement**: Must be first message in every bundle

#### ALV (Alive Message)
- **Purpose**: Bundle footer listing active objects
- **Fields**: Array of all active session IDs
- **Requirement**: Must be last message in every bundle
- **Special Case**: Empty array when no objects exist

#### TOK (Token Message)
- **Purpose**: Tangible object representation
- **Fields** (all implemented):
  - Session ID (unique per object instance)
  - Type/User ID (combined 32-bit value)
  - Component ID (0 for simple objects)
  - Position (x, y) - normalized 0-1 coordinates
  - Rotation angle (radians, 0-2π)
  - Velocity (x_vel, y_vel) - calculated from movement
  - Rotation velocity (angle_vel) - calculated from rotation
- **Calculation**: Velocities computed from position/angle deltas

### ⭕ Additional Message Types (Future)

#### PTR (Pointer Message)
- Pointing gestures (touch, cursor, stylus)
- Includes pressure and hover detection
- Shear and radius parameters

#### BND (Bounds Message)
- Untagged objects via bounding box
- Width, height, area calculations
- Oriented bounding boxes

---

## Transport Layer

### ✅ WebSocket Server (MVP)
- **Implementation**: Rust with tokio-tungstenite
- **Default Port**: 3343 (configurable)
- **Protocol**: OSC-over-WebSocket (binary frames)
- **Features**:
  - Accept multiple simultaneous connections
  - Broadcast OSC bundles to all connected clients
  - Connection/disconnection event handling
  - Thread-safe client list management

### ✅ OSC Encoding (MVP)
- **Implementation**: rosc crate (Rust)
- **Format**: OSC 1.0 specification
- **Bundle Structure**:
  - Bundle identifier: "#bundle"
  - Timetag (8 bytes)
  - Variable number of messages
- **Message Structure**:
  - Address pattern (e.g., "/tuio2/tok")
  - Type tags (e.g., ",iiifffff")
  - Arguments (aligned to 4-byte boundaries)

### 🔧 Connection Management (Enhanced)
- Display list of connected clients (IP addresses or client IDs)
- Per-client connection status
- Manual disconnect capability
- Connection event logging

---

## GUI Features

### Canvas/Workspace

#### ✅ 2D Interactive Canvas (MVP)
- HTML5 Canvas element
- Mouse event handling (click, drag, release)
- Real-time object rendering
- Configurable dimensions (default: 1920×1080)

#### 🔧 Grid Overlay (Enhanced)
- Toggleable grid display
- Configurable grid spacing (e.g., 10×10, 20×20)
- Grid color and opacity settings
- Snap-to-grid option (hold Shift key)

#### 🔧 Coordinate Display (Enhanced)
- Mouse position indicator
- Display both:
  - Pixel coordinates (e.g., "1024, 768")
  - Normalized coordinates (e.g., "0.533, 0.711")
- Cursor crosshair (optional)

#### ⭕ Zoom and Pan (Future)
- Zoom in/out with mouse wheel (+ Ctrl)
- Pan with middle mouse button or spacebar + drag
- Reset view button
- Zoom level indicator

#### ⭕ Background Image (Future)
- Load custom background image
- Simulates physical surface or screen layout
- Opacity control
- Lock/unlock for editing

---

### Object Management

#### ✅ Create Objects (MVP)
- **Methods**:
  - Click canvas to place object at cursor position
  - Drag from object palette
  - Keyboard shortcut (e.g., 'N' for new)
- **Configuration**:
  - Select object type before creation
  - Auto-assign session ID
  - Default rotation (0°)

#### ✅ Select Objects (MVP)
- **Single Selection**:
  - Click object to select
  - Selected object highlighted (outline or color change)
- **Multi-Selection**:
  - Ctrl+Click to add/remove from selection
  - Rectangle selection (drag on empty canvas)
  - Select All (Ctrl+A)
- **Deselection**:
  - Click empty canvas area
  - Escape key

#### ✅ Move Objects (MVP)
- Drag selected object(s) with mouse
- Update position in real-time
- Broadcast position changes via TUIO

#### ✅ Rotate Objects (MVP)
- **Methods**:
  - Mouse wheel while object selected
  - Rotation handle (visual control)
  - Arrow keys (fine control: 1° per press)
  - Shift+Arrow keys (coarse: 15° per press)
- **Visual Feedback**:
  - Rotation indicator (arrow or line on object)
  - Angle display during rotation

#### ✅ Delete Objects (MVP)
- Delete key
- Context menu (right-click)
- Delete button in property panel
- Remove session ID from active list

#### 🔧 Duplicate Objects (Enhanced)
- Ctrl+D to duplicate selected object(s)
- New session ID assigned
- Offset position slightly (10 pixels)

#### 🔧 Object Properties Panel (Enhanced)
- Display for selected object:
  - Session ID (read-only)
  - Type ID (editable)
  - User ID (editable)
  - Position X, Y (editable, both normalized and pixel)
  - Rotation angle (editable, degrees and radians)
- Manual input fields for precise positioning
- Apply/Reset buttons

---

### Object Visualization

#### ✅ Visual Representation (MVP)
- **Shapes**: Circles or squares (based on type)
- **Rotation Indicator**: Arrow or line showing orientation
- **Labels**: Session ID displayed on object
- **Selection Highlight**: Outline or glow effect

#### 🔧 Customizable Appearance (Enhanced)
- **Per Object Type**:
  - Custom color
  - Custom size
  - Custom icon/image
  - Shape (circle, square, triangle)
- **Type Badge**: Small indicator showing type ID
- **Opacity Control**: For overlapping objects

---

### Control Panel

#### ✅ Server Controls (MVP)
- **Start/Stop Server Button**:
  - Green "Start Server" button (when stopped)
  - Red "Stop Server" button (when running)
  - Disable port field while running
- **Port Configuration**:
  - Input field for port number
  - Default: 3343
  - Validation (1024-65535)
- **Connection Status**:
  - Indicator light (green=running, red=stopped)
  - Text status ("Running", "Stopped")

#### ✅ Frame Rate Control (MVP)
- **FPS Slider**: 1-120 FPS
- **Numeric Input**: For precise value
- **Current FPS Display**: Actual frames/second
- **Frame Counter**: Total frames sent

#### 🔧 Connected Clients List (Enhanced)
- Table or list of connected clients
- Columns:
  - Client ID or IP address
  - Connection time
  - Frames received (if trackable)
- Manual disconnect button per client

#### 🔧 Manual Frame Stepping (Enhanced)
- "Pause" button to stop automatic frame generation
- "Step" button to send single frame
- Useful for debugging client parsing

---

### Object Library

#### 🔧 Object Type Management (Enhanced)
- **Predefined Types**:
  - Create templates for common object types
  - Each type has: type_id, name, color, icon
  - Default types (e.g., "Fiducial 1", "Fiducial 2")
- **CRUD Operations**:
  - Add new type
  - Edit existing type (name, appearance)
  - Delete type
  - Duplicate type
- **Type ID Assignment**:
  - Manual assignment (0-65535)
  - Auto-increment option
  - Conflict detection

#### 🔧 Object Palette (Enhanced)
- Visual palette showing available object types
- Drag-and-drop to canvas to create
- Quick access to frequently used types
- Search/filter types by name or ID

---

### Settings

#### 🔧 Canvas Dimensions (Enhanced)
- Width and height input fields
- Common presets (1920×1080, 1280×720, 3840×2160)
- Apply button (clears canvas or scales objects)
- Aspect ratio lock toggle

#### 🔧 Coordinate System Display (Enhanced)
- Toggle between:
  - Pixel coordinates only
  - Normalized coordinates only
  - Both (default)
- Coordinate precision (decimal places)

#### 🔧 Velocity Calculation Toggle (Enhanced)
- Enable/disable velocity calculation
- Smoothing factor slider (exponential moving average)
- Display raw vs. smoothed velocities

#### ⭕ Settings Persistence (Future)
- Save settings to JSON file
- Auto-load settings on startup
- Export/import settings
- Reset to defaults button

---

## Debugging Features

### 🔧 OSC Message Logging (Enhanced)
- **Message Inspector Panel**:
  - Display outgoing OSC messages
  - Syntax-highlighted JSON representation
  - Collapsible per frame
- **Filters**:
  - Show only FRM messages
  - Show only TOK messages
  - Show only ALV messages
- **Export**: Copy messages to clipboard or save to file

### 🔧 Frame Timing Statistics (Enhanced)
- **Metrics**:
  - Current FPS (actual)
  - Target FPS (configured)
  - Frame generation time (avg, min, max)
  - Dropped frames counter
- **Visualization**: Graph of FPS over time

### 🔧 Bandwidth Usage Monitor (Enhanced)
- Bytes sent per second
- Bytes per frame
- Total bytes sent (session)
- Per-client bandwidth (if trackable)

### ⭕ Client Message Logger (Future)
- Log incoming messages from clients (if protocol supports)
- Useful for debugging two-way communication

---

## Advanced Features

### ⭕ Recording and Playback (Future)

#### Recording Mode
- Start/stop recording
- Capture all object movements over time
- Save to file format (JSON or custom binary)
- Metadata: timestamp, FPS, canvas dimensions

#### Playback Mode
- Load recorded session
- Play, pause, stop controls
- Seek to timestamp
- Playback speed control (0.1x to 10x)
- Loop mode

### ⭕ Scripted Motion Patterns (Future)

#### Pattern Types
- **Circular Motion**: Objects move in circles
- **Linear Motion**: Objects move in straight lines
- **Bezier Path**: Objects follow custom curves
- **Random Walk**: Brownian motion simulation

#### Configuration
- Pattern editor UI
- Duration, speed, start/end positions
- Apply pattern to selected objects
- Chain multiple patterns

### ⭕ Multi-User Scenarios (Future)
- Assign different user IDs to objects
- Visualize user ownership (color-coded)
- Filter view by user ID

---

## Keyboard Shortcuts

### ✅ MVP Shortcuts
- `Delete` - Delete selected object(s)
- `Ctrl+A` - Select all objects
- `Escape` - Deselect all
- `Arrow Keys` - Rotate selected object(s)

### 🔧 Enhanced Shortcuts
- `Ctrl+D` - Duplicate selected object(s)
- `Ctrl+Z` - Undo last action
- `Ctrl+Shift+Z` - Redo
- `Ctrl+S` - Save current scene
- `Ctrl+O` - Open saved scene
- `N` - Create new object
- `G` - Toggle grid
- `H` - Toggle help overlay
- `Space` - Pan mode (drag canvas)

---

## Context Menus

### 🔧 Canvas Context Menu (Enhanced)
- Right-click on empty canvas:
  - Create Object Here
  - Paste Object (if copied)
  - Toggle Grid
  - Background Image...

### 🔧 Object Context Menu (Enhanced)
- Right-click on object:
  - Duplicate
  - Delete
  - Properties...
  - Bring to Front
  - Send to Back
  - Copy
  - Lock Position (prevent dragging)

---

## User Workflows

### Workflow 1: Basic Object Manipulation
1. Click "Start Server" button
2. Click canvas to create object
3. Drag object to move
4. Scroll mouse wheel to rotate
5. Press Delete to remove
6. Object changes broadcast via WebSocket

### Workflow 2: Precise Positioning
1. Create object
2. Select object
3. Open Property Panel
4. Enter exact X, Y coordinates
5. Enter exact rotation angle
6. Click "Apply"

### Workflow 3: Multi-Object Management
1. Create multiple objects
2. Ctrl+Click to select multiple
3. Drag to move all together
4. Or use property panel for batch edit

### Workflow 4: Testing with Client
1. Configure port and FPS
2. Start server
3. Connect client application (tuio_client_js)
4. Create/move objects in simulator
5. Verify client receives updates
6. Check OSC message log for debugging

---

## Accessibility Features

### ⭕ Future Enhancements
- Keyboard-only navigation
- Screen reader support
- High contrast mode
- Adjustable UI font size
- Tooltips on all controls

---

## Performance Targets

### Canvas Rendering
- **60 FPS** rendering at 1920×1080 resolution
- Support for **50-100 objects** simultaneously
- Smooth dragging with no visible lag

### WebSocket Broadcasting
- **60 FPS** frame generation and broadcast
- Sub-millisecond frame encoding time
- Support for **10+ concurrent clients**

### Memory Usage
- **< 100 MB** total memory footprint
- Minimal allocation during frame generation
- No memory leaks over extended use

---

## Error Handling

### User Errors
- **Invalid Port**: Show error message, prevent server start
- **Port Already in Use**: Detect and notify user
- **Invalid Coordinates**: Clamp to valid range (0-1)
- **Invalid Rotation**: Normalize to 0-2π range

### Network Errors
- **Client Disconnect**: Remove from client list, continue broadcasting
- **WebSocket Error**: Log error, attempt to recover or stop server
- **Send Failure**: Log error, skip frame if necessary

### State Errors
- **Session ID Collision**: Should never happen (use wrapping_add)
- **Missing Object**: Handle gracefully in update/delete operations
- **Invalid Type ID**: Warn user but allow (0-65535 all valid)

---

## Platform Support

### ✅ Target Platforms (MVP)
- **Linux** (Ubuntu 20.04+, Fedora 36+, Arch)
- **macOS** (10.15 Catalina or later)
- **Windows** (Windows 10/11)

### Requirements
- Modern web browser engine (via Tauri WebView)
- OpenGL or DirectX support (for canvas rendering)
- Network stack (for WebSocket server)

---

## Future Enhancements Roadmap

### Version 1.0 (MVP)
- All ✅ Must-Have features
- Basic GUI
- TOK message support
- WebSocket server

### Version 1.1 (Enhanced)
- All 🔧 Should-Have features
- Full GUI polish
- Debugging tools
- Settings persistence

### Version 2.0 (Advanced)
- PTR and BND message support
- Recording and playback
- Scripted motion patterns
- Multi-user scenarios

### Version 2.1+
- Plugin system for custom object types
- Network discovery (mDNS/Bonjour)
- Web-based remote control interface
- Cloud storage for saved scenes
