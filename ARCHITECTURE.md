# TUIO Simulator - Architecture

## Technology Stack

### Backend (Rust)
- **Tauri 2.x** - Application framework
- **tokio** - Async runtime
- **tokio-tungstenite** - WebSocket server
- **rosc** - OSC (Open Sound Control) encoding/decoding
- **serde** - Serialization for IPC communication
- **chrono** - Timestamp handling
- **parking_lot** - Fast mutex implementation

### Frontend (Web)
- **Bun** - Runtime and package manager
- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite** - Build tool (bundled with Tauri)
- **HTML5 Canvas API** or **Konva.js** - 2D rendering
- **Tailwind CSS** - Styling

### Benefits
- ✅ Small binary size (~3-5 MB vs 100+ MB for Electron)
- ✅ Low memory footprint (~50-100 MB vs 200-500 MB)
- ✅ Rust performance for WebSocket/OSC handling
- ✅ Bun's fast package installation and runtime
- ✅ Native OS integration
- ✅ Built-in auto-updater

---

## Project Structure

```
tuio-simulator/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs           # Tauri entry point
│   │   ├── websocket/
│   │   │   ├── mod.rs        # WebSocket server module
│   │   │   └── connection.rs # Connection handler
│   │   ├── tuio/
│   │   │   ├── mod.rs        # TUIO protocol module
│   │   │   ├── messages.rs   # FRM, ALV, TOK structures
│   │   │   ├── encoder.rs    # OSC encoding
│   │   │   └── frame.rs      # Frame generation logic
│   │   ├── state.rs          # Application state management
│   │   ├── commands.rs       # Tauri IPC commands
│   │   └── events.rs         # Event emission to frontend
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
│
├── src/                       # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── Canvas.tsx        # Main 2D canvas
│   │   ├── CanvasObject.tsx  # Individual TUIO object
│   │   ├── ControlPanel.tsx  # Server controls
│   │   ├── PropertyPanel.tsx # Object properties editor
│   │   ├── ObjectPalette.tsx # Object type library
│   │   └── StatusBar.tsx     # Connection/frame status
│   ├── hooks/
│   │   ├── useTuioObjects.ts # Object state management
│   │   ├── useWebSocket.ts   # WS server state
│   │   └── useCanvas.ts      # Canvas interaction logic
│   ├── types/
│   │   ├── tuio.ts           # TUIO type definitions
│   │   └── app.ts            # App state types
│   ├── utils/
│   │   ├── coordinates.ts    # Pixel ↔ normalized conversion
│   │   └── geometry.ts       # Rotation, velocity calculations
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   └── styles/
│       └── globals.css       # Tailwind styles
│
├── package.json              # Bun dependencies
├── bun.lockb                 # Bun lock file
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite config
├── ARCHITECTURE.md           # This file
├── PROTOCOL.md               # TUIO protocol details
├── FEATURES.md               # Feature specifications
└── README.md
```

---

## Core Components

### Rust Backend Components

#### 1. WebSocket Server (`websocket/mod.rs`)
**Responsibilities:**
- Accept WebSocket connections on configurable port (default: 3343)
- Maintain list of connected clients
- Broadcast OSC bundles to all clients
- Handle connection lifecycle
- Emit connection events to frontend

**Key Functions:**
- `start_server(port: u16) -> Result<()>`
- `stop_server() -> Result<()>`
- `broadcast(bundle: Vec<u8>) -> Result<()>`
- `handle_connection(stream: WebSocketStream) -> Result<()>`

#### 2. TUIO Protocol Handler (`tuio/mod.rs`)
**Responsibilities:**
- Encode TUIO 2.0 messages (FRM, ALV, TOK)
- Create OSC bundles
- Manage session IDs
- Calculate velocities from position deltas
- Generate frame messages at configured FPS

**Key Structures:**
```rust
struct TuioObject {
    session_id: u32,
    type_id: u16,
    user_id: u16,
    component_id: u16,
    x: f32,          // normalized 0-1
    y: f32,          // normalized 0-1
    angle: f32,      // radians
    x_vel: f32,
    y_vel: f32,
    angle_vel: f32,
    last_update: Instant,
}

struct FrameMessage {
    frame_id: u32,
    timestamp: i64,
    width: u16,
    height: u16,
    source: String,
}
```

#### 3. State Manager (`state.rs`)
**Responsibilities:**
- Store all TUIO objects (`Arc<Mutex<Vec<TuioObject>>>`)
- Manage frame counter and timestamp
- Track server configuration (port, FPS, dimensions)
- Thread-safe access for WS server and IPC

**Key Structure:**
```rust
struct AppState {
    objects: Arc<Mutex<HashMap<u32, TuioObject>>>,
    next_session_id: Arc<Mutex<u32>>,
    frame_counter: Arc<Mutex<u32>>,
    config: Arc<Mutex<Config>>,
    ws_clients: Arc<Mutex<Vec<ClientId>>>,
}

struct Config {
    port: u16,
    fps: u32,
    width: u16,
    height: u16,
    source: String,
}
```

#### 4. Tauri Commands (`commands.rs`)
**IPC commands exposed to frontend:**
```rust
#[tauri::command]
async fn start_server(state: State<AppState>, port: u16) -> Result<()>;

#[tauri::command]
async fn stop_server(state: State<AppState>) -> Result<()>;

#[tauri::command]
async fn add_object(state: State<AppState>, type_id: u16, x: f32, y: f32) -> Result<u32>;

#[tauri::command]
async fn update_object(state: State<AppState>, session_id: u32, x: f32, y: f32, angle: f32) -> Result<()>;

#[tauri::command]
async fn remove_object(state: State<AppState>, session_id: u32) -> Result<()>;

#[tauri::command]
async fn set_frame_rate(state: State<AppState>, fps: u32) -> Result<()>;

#[tauri::command]
async fn get_server_status(state: State<AppState>) -> Result<ServerStatus>;

#[tauri::command]
async fn set_canvas_dimensions(state: State<AppState>, width: u16, height: u16) -> Result<()>;
```

#### 5. Event Emitter (`events.rs`)
**Events emitted to frontend:**
```rust
emit("client_connected", ClientConnectedEvent { client_id: String });
emit("client_disconnected", ClientDisconnectedEvent { client_id: String });
emit("frame_sent", FrameSentEvent { frame_id: u32, object_count: usize });
emit("osc_message_log", OscMessageLogEvent { message: String });
```

---

### Frontend Components (React)

#### 1. Canvas Component (`Canvas.tsx`)
**Responsibilities:**
- Render all TUIO objects on HTML5 canvas
- Handle mouse events (click, drag, wheel)
- Convert between pixel and normalized coordinates
- Selection management
- Rotation handles
- Grid overlay

**Props:**
```typescript
interface CanvasProps {
  objects: TuioObject[];
  selectedIds: Set<number>;
  onObjectsUpdated: (updates: ObjectUpdate[]) => void;
  onSelectionChanged: (selectedIds: Set<number>) => void;
  width: number;
  height: number;
  showGrid: boolean;
}
```

#### 2. Control Panel (`ControlPanel.tsx`)
**Features:**
- Start/Stop server button
- Port input field
- FPS slider (1-120)
- Connection status indicator
- Connected clients counter
- Frame counter display

#### 3. Property Panel (`PropertyPanel.tsx`)
**Features:**
- Display selected object properties
- Editable fields: type_id, x, y, angle
- Read-only: session_id
- Apply/Reset buttons
- Delete object button

#### 4. Object Palette (`ObjectPalette.tsx`)
**Features:**
- List of predefined object types
- Drag-to-create objects
- Add/edit object type templates
- Color and icon customization

---

### Frontend Hooks

#### 1. `useTuioObjects.ts`
**State management for TUIO objects:**
```typescript
interface UseTuioObjects {
  objects: TuioObject[];
  selectedObjects: Set<number>;
  addObject: (typeId: number, x: number, y: number) => Promise<number>;
  updateObject: (sessionId: number, updates: Partial<TuioObject>) => Promise<void>;
  removeObject: (sessionId: number) => Promise<void>;
  setSelection: (sessionIds: Set<number>) => void;
}
```

#### 2. `useWebSocket.ts`
**WebSocket server state:**
```typescript
interface UseWebSocket {
  isRunning: boolean;
  port: number;
  connectedClients: string[];
  frameCount: number;
  fps: number;
  startServer: (port: number) => Promise<void>;
  stopServer: () => Promise<void>;
  setFps: (fps: number) => Promise<void>;
}
```

#### 3. `useCanvas.ts`
**Canvas interaction logic:**
```typescript
interface UseCanvas {
  handleMouseDown: (e: MouseEvent) => void;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: (e: MouseEvent) => void;
  handleWheel: (e: WheelEvent) => void;
  pixelToNormalized: (x: number, y: number) => { x: number; y: number };
  normalizedToPixel: (x: number, y: number) => { x: number; y: number };
}
```

---

## Data Flow

### Object Creation Flow
```
User clicks canvas
  ↓
Canvas.tsx calculates position
  ↓
useTuioObjects.addObject(typeId, x, y)
  ↓
Tauri IPC: invoke("add_object", { typeId, x, y })
  ↓
Rust: commands::add_object()
  ↓
state.add_object() → assigns session_id
  ↓
Returns session_id to frontend
  ↓
Frontend updates local state
  ↓
Canvas re-renders with new object
```

### Frame Generation Flow (Rust)
```
Tokio interval timer (based on FPS)
  ↓
tuio::frame::generate_frame()
  ↓
Read all objects from state (acquire mutex)
  ↓
Calculate velocities:
  - delta_x = current_x - last_x
  - delta_y = current_y - last_y
  - delta_time = current_time - last_time
  - x_vel = delta_x / delta_time
  - y_vel = delta_y / delta_time
  ↓
Create OSC bundle:
  1. FRM message (frame_id, timestamp, dimensions, source)
  2. TOK messages (one per object)
  3. ALV message (list of all session IDs)
  ↓
Encode to OSC binary format (rosc crate)
  ↓
websocket::broadcast(bundle)
  ↓
Send to all connected WebSocket clients
  ↓
Emit frame_sent event to frontend
  ↓
Frontend updates frame counter display
```

### Object Movement Flow
```
User drags object on canvas
  ↓
Canvas.onMouseMove → calculates new position
  ↓
useTuioObjects.updateObject(sessionId, { x, y })
  ↓
Tauri IPC: invoke("update_object", { sessionId, x, y, angle })
  ↓
Rust: commands::update_object()
  ↓
state.update_object() → stores new position & timestamp
  ↓
Next frame generation includes updated position
  ↓
Velocity automatically calculated from position delta
  ↓
Broadcast to clients
```

---

## Dependencies

### Rust (`Cargo.toml`)
```toml
[dependencies]
tauri = { version = "2", features = ["unstable"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = "0.21"
rosc = "0.10"
chrono = "0.4"
uuid = "1.6"
parking_lot = "0.12"
anyhow = "1.0"
thiserror = "1.0"
```

### Frontend (`package.json` with Bun)
```json
{
  "name": "tuio-simulator",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tauri-apps/api": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "@tauri-apps/cli": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## Performance Considerations

### Rust Backend
- **Thread Safety**: Use `Arc<Mutex<T>>` for shared state, `parking_lot::Mutex` for better performance
- **Async I/O**: All WebSocket operations are async with tokio
- **Frame Rate**: Configurable timer interval (e.g., 60 FPS = ~16.67ms interval)
- **Velocity Calculation**: Only calculate when object has moved since last frame
- **Memory**: Reuse OSC buffer allocation where possible

### Frontend
- **Canvas Rendering**: Use `requestAnimationFrame` for smooth rendering
- **Event Throttling**: Throttle mouse move events during drag operations
- **State Updates**: Batch React state updates where possible
- **Object Count**: Optimize for 50-100 objects on screen simultaneously

---

## Security Considerations

- **WebSocket Server**: Only bind to localhost by default (configurable)
- **Tauri IPC**: All commands validated and type-checked
- **Input Validation**: Validate all user inputs (coordinates, IDs, FPS values)
- **No External Network**: No internet access required, fully offline capable
