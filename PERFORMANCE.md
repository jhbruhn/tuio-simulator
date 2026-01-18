# Performance Optimizations

This document describes the performance optimizations implemented in the TUIO simulator.

## Canvas Rendering Optimizations

### 1. Grid Caching with Offscreen Canvas
**Problem:** The grid was being redrawn on every frame, even though it's static.

**Solution:** Cache the grid in an offscreen canvas and use `drawImage()` to composite it.
- Grid is rendered once when dimensions or visibility change
- Uses fast `drawImage()` operation instead of redrawing lines
- Reduces draw calls from ~200 (grid lines + labels) to 1 per frame

**Location:** `src/components/Canvas.tsx:36-50`

### 2. Batched Canvas Operations
**Problem:** Each object caused multiple context state changes (colors, transforms, text settings).

**Solution:** Group similar operations together to reduce context state changes.
- First pass: Draw all selection rings (same color/stroke settings)
- Second pass: Draw all object circles with rotation
- Third pass: Draw all text labels (same font/alignment settings)

**Impact:** Reduces context state changes from 6-10 per object to 3 total passes.

**Location:** `src/components/Canvas.tsx:134-189`

### 3. RequestAnimationFrame for Smooth Rendering
**Problem:** React's useEffect runs synchronously, potentially causing frame drops.

**Solution:** Use `requestAnimationFrame()` for smooth 60fps rendering.
- Aligns rendering with browser's repaint cycle
- Cancels pending frames when new data arrives
- Prevents unnecessary renders

**Location:** `src/components/Canvas.tsx:75-84`

### 4. Optimized Canvas Context
**Problem:** Default canvas context has alpha channel overhead.

**Solution:** Create context with `{ alpha: false }` for opaque rendering.
- Reduces memory usage and compositing overhead
- Use `fillRect()` instead of `clearRect()` for clearing

**Location:** `src/components/Canvas.tsx:56`

## Backend Optimizations

### 1. Skip Frame Generation When No Clients Connected
**Problem:** Server generates frames even when no clients are listening.

**Solution:** Check client count before generating frames.
- Saves CPU cycles when server is idle
- Continues ticking interval for quick response when clients connect

**Location:** `src-tauri/src/commands.rs:218-222`

### 2. Use tokio::time::interval Instead of Sleep Loop
**Problem:** `sleep()` in a loop can drift and accumulate timing errors.

**Solution:** Use `tokio::time::interval` with `MissedTickBehavior::Skip`.
- More accurate timing at configured FPS
- Automatically handles clock drift
- Skips missed ticks if system is overloaded

**Location:** `src-tauri/src/commands.rs:206-207`

### 3. Batch Lock Acquisitions
**Problem:** Multiple sequential lock acquisitions for debug info.

**Solution:** Acquire locks once and extract all needed data together.
- Reduces lock contention
- Improves cache locality
- Cleaner code with destructuring

**Location:** `src-tauri/src/commands.rs:238-243`

### 4. Dynamic FPS Adjustment
**Problem:** FPS changes required server restart to take effect.

**Solution:** Check for FPS changes and recreate interval when needed.
- Allows real-time FPS adjustment
- No server restart required
- Maintains accurate timing

**Location:** `src-tauri/src/commands.rs:224-233`

## Expected Performance Improvements

### Canvas Rendering
- **Grid rendering:** 95% reduction in draw calls when grid is enabled
- **Object rendering:** 40-60% reduction in context state changes
- **Frame timing:** Smoother rendering with requestAnimationFrame
- **Memory:** Lower memory usage with alpha-disabled context

### Backend
- **Idle CPU usage:** Near-zero when no clients connected
- **Timing accuracy:** More consistent frame intervals with tokio::interval
- **Lock contention:** Reduced mutex overhead with batched acquisitions
- **Responsiveness:** Real-time FPS changes without restart

## Benchmarking

To measure performance improvements:

1. **Canvas FPS:** Enable browser DevTools Performance monitor
2. **Backend throughput:** Use OSC Debugger to monitor actual FPS and message rate
3. **Memory usage:** Check browser Task Manager and Tauri process memory
4. **Network efficiency:** Monitor WebSocket message timing in Network tab

## Future Optimization Opportunities

- **WebGL rendering:** For >100 tokens, consider WebGL for GPU acceleration
- **Object pooling:** Reuse objects instead of creating/destroying
- **Dirty region tracking:** Only redraw changed canvas areas
- **WASM acceleration:** Move coordinate conversions to WebAssembly
- **Message batching:** Batch multiple WebSocket messages when possible
