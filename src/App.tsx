import { useState } from "react";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";
import { StatusBar } from "./components/StatusBar";
import { useTuioObjects } from "./hooks/useTuioObjects";
import { useWebSocketServer } from "./hooks/useWebSocketServer";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSettings } from "./hooks/useSettings";

function App() {
  const { settings, updateSettings } = useSettings();
  const { canvasWidth, canvasHeight, showGrid, canvasScale } = settings;

  // Selected object type for adding new objects
  const [selectedTypeId, setSelectedTypeId] = useState(1);

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
    port,
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

  const [interactionState, interactionHandlers] = useCanvasInteraction({
    objects,
    dimensions: { width: canvasWidth, height: canvasHeight },
    selectedObjects,
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
      await startServer(port);
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

  const handleAddObject = async () => {
    try {
      await addObject(selectedTypeId, 0.5, 0.5);
    } catch (err) {
      console.error("Failed to add object:", err);
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
    if (selectedObjects.size === 0) return;

    const newSessionIds: number[] = [];
    const offset = 20 / canvasWidth; // 20 pixel offset in normalized coords

    for (const sessionId of selectedObjects) {
      const obj = objects.find((o) => o.session_id === sessionId);
      if (!obj) continue;

      try {
        // Create duplicate with slight offset
        const newX = Math.min(1.0, obj.x + offset);
        const newY = Math.min(1.0, obj.y + offset);
        const newSessionId = await addObject(obj.type_id, newX, newY);

        // Update the angle to match original
        await updateObject(newSessionId, newX, newY, obj.angle);

        newSessionIds.push(newSessionId);
      } catch (err) {
        console.error("Failed to duplicate object:", err);
      }
    }

    // Select the duplicated objects
    if (newSessionIds.length > 0) {
      setSelection(new Set(newSessionIds));
    }
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
        <div className="w-[400px] shrink-0 bg-gray-800 text-white p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">TUIO Simulator</h1>

        {/* Server Controls */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Server</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Port</label>
              <input
                type="number"
                value={port}
                disabled={isRunning}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">FPS</label>
              <input
                type="number"
                value={fps}
                onChange={(e) => {
                  const newFps = parseInt(e.target.value);
                  setFps(newFps);
                  updateSettings({ fps: newFps });
                }}
                min="1"
                max="120"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleStartServer}
              disabled={isRunning}
              className="flex-1 px-3 py-2 bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
            >
              Start
            </button>
            <button
              onClick={handleStopServer}
              disabled={!isRunning}
              className="flex-1 px-3 py-2 bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
            >
              Stop
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={isRunning ? "text-green-400" : "text-red-400"}>
                {isRunning ? "Running" : "Stopped"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Clients:</span>
              <span>{connectedClients}</span>
            </div>
            <div className="flex justify-between">
              <span>Frames:</span>
              <span>{frameCount}</span>
            </div>
          </div>
        </div>

        {/* Object Controls */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Objects</h2>

          {/* Object Type Palette */}
          <div className="mb-3">
            <label className="block text-sm mb-2">Object Type</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((typeId) => {
                const hue = (typeId * 137) % 360;
                const isSelected = selectedTypeId === typeId;
                return (
                  <button
                    key={typeId}
                    onClick={() => setSelectedTypeId(typeId)}
                    className={`aspect-square rounded flex items-center justify-center text-xs font-medium transition-all ${
                      isSelected
                        ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800"
                        : "hover:ring-1 hover:ring-gray-500"
                    }`}
                    style={{
                      backgroundColor: `hsl(${hue}, 70%, 50%)`,
                    }}
                    title={`Type ${typeId}`}
                  >
                    {typeId}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleAddObject}
              className="w-full px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm font-medium"
            >
              + Add Object (Type {selectedTypeId})
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleDuplicateSelected}
                disabled={selectedObjects.size === 0}
                className="flex-1 px-3 py-2 bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
              >
                Duplicate
              </button>
              <button
                onClick={handleRemoveSelected}
                disabled={selectedObjects.size === 0}
                className="flex-1 px-3 py-2 bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total:</span>
              <span>{objects.length}</span>
            </div>
            {interactionState.selectedId && (
              <div className="flex justify-between">
                <span>Selected:</span>
                <span>#{interactionState.selectedId}</span>
              </div>
            )}
          </div>

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
          <p>• Ctrl/Cmd+D: Duplicate</p>
          <p>• Ctrl/Cmd+A: Select all</p>
          <p>• Esc: Clear selection</p>
          <p>• Arrow keys: Move (Shift for 10px)</p>
          <p>• Ctrl/Cmd+←/→: Rotate</p>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex items-center justify-center bg-gray-900 p-4 overflow-auto">
        <div className="relative">
          <div
            onMouseDown={interactionHandlers.handleMouseDown}
            onMouseMove={interactionHandlers.handleMouseMove}
            onMouseUp={interactionHandlers.handleMouseUp}
            onWheel={interactionHandlers.handleWheel}
            style={{
              transform: `scale(${canvasScale})`,
              transformOrigin: 'center center',
            }}
            className="shadow-2xl"
          >
            <Canvas
              objects={objects}
              width={canvasWidth}
              height={canvasHeight}
              showGrid={showGrid}
              selectedObjects={selectedObjects}
            />
          </div>
          <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-gray-500">
            {canvasWidth}×{canvasHeight}px @ {Math.round(canvasScale * 100)}% scale
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
    </div>
  );
}

export default App;
