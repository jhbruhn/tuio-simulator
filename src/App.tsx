import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";
import { StatusBar } from "./components/StatusBar";
import { OscDebugger } from "./components/OscDebugger";
import { ControlPanel } from "./components/ControlPanel";
import { useTuioObjects } from "./hooks/useTuioObjects";
import { useWebSocketServer } from "./hooks/useWebSocketServer";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSettings } from "./hooks/useSettings";
import { useCanvasDimensions } from "./hooks/useCanvasDimensions";
import { pixelToNormalized, clampNormalized } from "./utils/coordinates";

function App() {
  const { settings, updateSettings } = useSettings();
  const { showGrid, aspectRatio } = settings;

  // Ref for canvas container to measure available space
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Calculate canvas dimensions based on available space and aspect ratio
  const { width: canvasWidth, height: canvasHeight } = useCanvasDimensions({
    containerRef: canvasContainerRef,
    aspectRatio,
  });

  // Dragging token from palette
  const [draggingTokenId, setDraggingTokenId] = useState<number | null>(null);

  // OSC Debugger state
  const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);

  // Local port state for input field (separate from server status)
  const [portInput, setPortInput] = useState(settings.port);

  // Sync port input with settings on mount (from localStorage)
  useEffect(() => {
    setPortInput(settings.port);
  }, [settings.port]);

  const {
    objects,
    selectedObjects,
    addObject,
    updateObject,
    removeObject,
    toggleSelection,
    setSelection,
    clearSelection,
  } = useTuioObjects();

  const {
    isRunning,
    connectedClients,
    frameCount,
    fps,
    startServer,
    stopServer,
    setFps,
  } = useWebSocketServer({
    initialPort: settings.port,
    initialFps: settings.fps,
  });

  const [_interactionState, interactionHandlers] = useCanvasInteraction({
    objects,
    dimensions: { width: canvasWidth, height: canvasHeight },
    selectedObjects,
    canvasScale: 1.0, // No scaling - canvas always fills available space
    onObjectUpdated: updateObject,
    onObjectClicked: (sessionId) => {
      console.log("Object clicked:", sessionId);
    },
    toggleSelection,
    setSelection,
    clearSelection,
  });

  const handleStartServer = async () => {
    try {
      await startServer(portInput);
    } catch (err) {
      console.error("Failed to start server:", err);
    }
  };

  const handleStopServer = async () => {
    try {
      await stopServer();
    } catch (err) {
      console.error("Failed to stop server:", err);
    }
  };

  // Track which component IDs are currently active on the canvas
  // Using useMemo to prevent unnecessary re-renders and flickering
  const activeTokens = useMemo(() => {
    return new Set(objects.map((obj) => obj.component_id));
  }, [objects.map((obj) => obj.component_id).sort().join(',')]);

  const handleTokenDragStart = (componentId: number) => {
    setDraggingTokenId(componentId);
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCanvasDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!draggingTokenId) return;

    // Get canvas element and its bounding rect
    const canvasEl = e.currentTarget.querySelector('canvas');
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();

    // Calculate position relative to canvas (no scale needed - always 1:1)
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Convert to normalized coordinates
    const normalized = pixelToNormalized(
      { x: canvasX, y: canvasY },
      { width: canvasWidth, height: canvasHeight }
    );
    const clamped = clampNormalized(normalized);

    try {
      await addObject(draggingTokenId, clamped.x, clamped.y);
    } catch (err) {
      console.error("Failed to add object:", err);
      alert(`Failed to add token: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDraggingTokenId(null);
    }
  };

  const handleTokenReturn = async (componentId: number) => {
    // Find and remove the object with this component_id
    const obj = objects.find((o) => o.component_id === componentId);
    if (obj) {
      try {
        await removeObject(obj.session_id);
      } catch (err) {
        console.error("Failed to return token:", err);
      }
    }
  };

  const handleRemoveSelected = async () => {
    for (const sessionId of selectedObjects) {
      try {
        await removeObject(sessionId);
      } catch (err) {
        console.error("Failed to remove object:", err);
      }
    }
  };

  const handleDuplicateSelected = async () => {
    // Note: Duplicate is disabled because component_id must be unique
    // This feature would require picking a new component_id from available tokens
    alert("Duplicate is not available - each token can only be used once. Drag a new token from the palette instead.");
  };

  const handleSelectAll = () => {
    const allSessionIds = new Set(objects.map((obj) => obj.session_id));
    setSelection(allSessionIds);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    objects,
    selectedObjects,
    canvasDimensions: { width: canvasWidth, height: canvasHeight },
    onDelete: handleRemoveSelected,
    onDuplicate: handleDuplicateSelected,
    onSelectAll: handleSelectAll,
    onClearSelection: clearSelection,
    onUpdateObject: updateObject,
  });

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-[320px] shrink-0 bg-gray-800 text-white p-4 overflow-y-auto">
          {/* Server Controls */}
          <ControlPanel
            isRunning={isRunning}
            portInput={portInput}
            fps={fps}
            onPortChange={(newPort) => {
              setPortInput(newPort);
              updateSettings({ port: newPort });
            }}
            onFpsChange={(newFps) => {
              setFps(newFps);
              updateSettings({ fps: newFps });
            }}
            onStartServer={handleStartServer}
            onStopServer={handleStopServer}
          />

          {/* Controls */}
          <div className="mb-6">
            {selectedObjects.size > 0 && (
              <div className="mb-3">
                <button
                  onClick={handleRemoveSelected}
                  className="w-full px-3 py-2 bg-red-600 rounded hover:bg-red-700 text-sm font-medium"
                >
                  Delete Selected
                </button>
              </div>
            )}

            {/* Property Panel */}
            <PropertyPanel
              selectedObjects={selectedObjects}
              objects={objects}
              canvasDimensions={{ width: canvasWidth, height: canvasHeight }}
              onUpdate={updateObject}
            />

            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => updateSettings({ showGrid: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">Show Grid</span>
            </label>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-400 space-y-1">
            <p className="font-semibold text-gray-300 mb-1">Mouse:</p>
            <p>• Click to select</p>
            <p>• Ctrl/Cmd+Click to multi-select</p>
            <p>• Drag to move</p>
            <p>• Scroll to rotate</p>

            <p className="font-semibold text-gray-300 mt-2 mb-1">Keyboard:</p>
            <p>• Del/Backspace: Delete</p>
            <p>• Ctrl/Cmd+A: Select all</p>
            <p>• Esc: Clear selection</p>
            <p>• Arrow keys: Move (Shift for 10px)</p>
            <p>• Ctrl/Cmd+←/→: Rotate</p>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex bg-gray-900 overflow-hidden">
          {/* Canvas Center */}
          <div
            className="flex-1 flex items-center justify-center p-4"
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          >
            <div className="relative max-w-full max-h-full" style={{ aspectRatio: aspectRatio }}>
              <div ref={canvasContainerRef} className="absolute inset-0">
                <Canvas
                  objects={objects}
                  width={canvasWidth}
                  height={canvasHeight}
                  showGrid={showGrid}
                  selectedObjects={selectedObjects}
                  onMouseDown={interactionHandlers.handleMouseDown}
                  onMouseMove={interactionHandlers.handleMouseMove}
                  onMouseUp={interactionHandlers.handleMouseUp}
                  onWheel={interactionHandlers.handleWheel}
                />
              </div>
              <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-gray-500">
                {canvasWidth}×{canvasHeight}px ({aspectRatio.toFixed(2)}:1)
              </div>
            </div>
          </div>

          {/* Token Repository - Right Side */}
          <div className="w-[280px] shrink-0 bg-gray-800 text-white p-4 overflow-y-auto">
            <div className="mb-4">
              <h3 className="font-semibold text-sm mb-1">Token Repository</h3>
              <span className="text-xs text-gray-400">
                {activeTokens.size}/24 active
              </span>
            </div>
            <div className="text-xs text-gray-400 mb-3">
              Drag tokens to canvas to activate them
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 24 }, (_, i) => i + 1).map((componentId) => {
                const isActive = activeTokens.has(componentId);
                const hue = ((componentId - 1) * 137) % 360;
                const color = `hsl(${hue}, 70%, 50%)`;

                return (
                  <div
                    key={componentId}
                    draggable={!isActive}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('componentId', componentId.toString());
                      handleTokenDragStart(componentId);
                    }}
                    onClick={() => isActive && handleTokenReturn(componentId)}
                    className={`
                      relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                      cursor-pointer transition-all select-none
                      ${isActive
                        ? 'opacity-30 border-gray-600 cursor-not-allowed'
                        : 'border-gray-500 hover:border-white hover:scale-105 active:scale-95'
                      }
                    `}
                    style={{
                      backgroundColor: isActive ? '#1a1a1a' : color,
                    }}
                    title={isActive ? `Token ${componentId} (On canvas - click to return)` : `Drag Token ${componentId} to canvas`}
                  >
                    <div className="text-base font-bold text-white drop-shadow-md">
                      {componentId}
                    </div>
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <div className="text-xs text-white">Active</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        isRunning={isRunning}
        connectedClients={connectedClients}
        frameCount={frameCount}
        fps={fps}
        totalObjects={objects.length}
        selectedObjects={selectedObjects.size}
      />

      {/* OSC Debugger Bottom Panel */}
      <OscDebugger isOpen={isDebuggerOpen} onToggle={() => setIsDebuggerOpen(!isDebuggerOpen)} />
    </div>
  );
}

export default App;
