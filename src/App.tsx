import { useState } from "react";
import { Canvas } from "./components/Canvas";
import { useTuioObjects } from "./hooks/useTuioObjects";
import { useWebSocketServer } from "./hooks/useWebSocketServer";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";

function App() {
  const [canvasWidth] = useState(1920);
  const [canvasHeight] = useState(1080);
  const [showGrid, setShowGrid] = useState(true);

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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">TUIO 2.0 Simulator</h1>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Server Controls</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Port</label>
              <input
                type="number"
                value={port}
                disabled={isRunning}
                className="w-full px-3 py-2 border rounded disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">FPS</label>
              <input
                type="number"
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value))}
                min="1"
                max="120"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleStartServer}
              disabled={isRunning}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
            >
              Start Server
            </button>
            <button
              onClick={handleStopServer}
              disabled={!isRunning}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
            >
              Stop Server
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Status:</span>{" "}
              <span className={isRunning ? "text-green-600" : "text-red-600"}>
                {isRunning ? "Running" : "Stopped"}
              </span>
            </div>
            <div>
              <span className="font-medium">Clients:</span> {connectedClients}
            </div>
            <div>
              <span className="font-medium">Frames:</span> {frameCount}
            </div>
          </div>
        </div>

        {/* Object Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Object Controls</h2>

          <div className="flex gap-2">
            <button
              onClick={handleAddObject}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Object
            </button>
            <button
              onClick={handleRemoveSelected}
              disabled={selectedObjects.size === 0}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
            >
              Remove Selected ({selectedObjects.size})
            </button>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <span>Show Grid</span>
            </label>
          </div>

          <div className="mt-4 text-sm">
            <span className="font-medium">Objects:</span> {objects.length}
            {interactionState.selectedId && (
              <span className="ml-4">
                <span className="font-medium">Selected:</span> {interactionState.selectedId}
              </span>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Canvas</h2>
          <div
            onMouseDown={interactionHandlers.handleMouseDown}
            onMouseMove={interactionHandlers.handleMouseMove}
            onMouseUp={interactionHandlers.handleMouseUp}
            onWheel={interactionHandlers.handleWheel}
            className="inline-block"
          >
            <Canvas
              objects={objects}
              width={canvasWidth}
              height={canvasHeight}
              showGrid={showGrid}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Click to select objects, drag to move, scroll to rotate</p>
            <p>Canvas: {canvasWidth}×{canvasHeight}px (normalized to 0-1)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
