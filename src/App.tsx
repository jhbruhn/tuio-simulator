import { useState } from "react";
import { Canvas } from "./components/Canvas";
import { useTuioObjects } from "./hooks/useTuioObjects";
import { useWebSocketServer } from "./hooks/useWebSocketServer";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";

function App() {
  const [canvasWidth] = useState(1920);
  const [canvasHeight] = useState(1080);
  const [showGrid, setShowGrid] = useState(true);
  // Scale down canvas to fit viewport (60% of actual size)
  const [canvasScale] = useState(0.6);

  const {
    objects,
    selectedObjects,
    addObject,
    updateObject,
    removeObject,
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
  } = useWebSocketServer();

  const [interactionState, interactionHandlers] = useCanvasInteraction({
    objects,
    dimensions: { width: canvasWidth, height: canvasHeight },
    onObjectUpdated: updateObject,
    onObjectClicked: (sessionId) => {
      console.log("Object clicked:", sessionId);
    },
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
      await addObject(1, 0.5, 0.5);
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

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar Controls */}
      <div className="w-96 bg-gray-800 text-white p-4 overflow-y-auto">
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
                onChange={(e) => setFps(parseInt(e.target.value))}
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

          <div className="space-y-2">
            <button
              onClick={handleAddObject}
              className="w-full px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm font-medium"
            >
              + Add Object
            </button>
            <button
              onClick={handleRemoveSelected}
              disabled={selectedObjects.size === 0}
              className="w-full px-3 py-2 bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
            >
              Remove ({selectedObjects.size})
            </button>
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

          {/* Rotation Controls */}
          {interactionState.selectedId && (() => {
            const selectedObj = objects.find(o => o.session_id === interactionState.selectedId);
            if (!selectedObj) return null;
            const angleDeg = Math.round((selectedObj.angle * 180) / Math.PI);

            const handleRotationChange = async (newAngleDeg: number) => {
              const newAngleRad = (newAngleDeg * Math.PI) / 180;
              try {
                await updateObject(selectedObj.session_id, selectedObj.x, selectedObj.y, newAngleRad);
              } catch (err) {
                console.error("Failed to update rotation:", err);
              }
            };

            return (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <h3 className="text-sm font-semibold mb-2">Rotation</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRotationChange(angleDeg - 15)}
                      className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                    >
                      -15°
                    </button>
                    <input
                      type="number"
                      value={angleDeg}
                      onChange={(e) => handleRotationChange(parseInt(e.target.value) || 0)}
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm text-center"
                    />
                    <button
                      onClick={() => handleRotationChange(angleDeg + 15)}
                      className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                    >
                      +15°
                    </button>
                  </div>
                  <button
                    onClick={() => handleRotationChange(0)}
                    className="w-full px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
                  >
                    Reset to 0°
                  </button>
                </div>
              </div>
            );
          })()}

          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Show Grid</span>
          </label>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Click to select objects</p>
          <p>• Drag to move</p>
          <p>• Scroll to rotate</p>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex items-center justify-center bg-gray-900 p-8">
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
            />
          </div>
          <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-gray-500">
            {canvasWidth}×{canvasHeight}px @ {Math.round(canvasScale * 100)}% scale
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
