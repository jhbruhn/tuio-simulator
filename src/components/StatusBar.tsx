interface StatusBarProps {
  isRunning: boolean;
  connectedClients: number;
  frameCount: number;
  fps: number;
  totalObjects: number;
  selectedObjects: number;
}

export function StatusBar({
  isRunning,
  connectedClients,
  frameCount,
  fps,
  totalObjects,
  selectedObjects,
}: StatusBarProps) {
  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-300">
      {/* Left section - Server status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isRunning ? "bg-green-400" : "bg-red-400"
            }`}
          />
          <span className="font-medium">
            {isRunning ? "Running" : "Stopped"}
          </span>
        </div>
        <div className="text-gray-500">|</div>
        <div>
          <span className="text-gray-500">Clients: </span>
          <span className="font-medium">{connectedClients}</span>
        </div>
        <div>
          <span className="text-gray-500">Frames: </span>
          <span className="font-medium">{frameCount.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-500">FPS: </span>
          <span className="font-medium">{fps}</span>
        </div>
      </div>

      {/* Right section - Object statistics */}
      <div className="flex items-center gap-4">
        <div>
          <span className="text-gray-500">Objects: </span>
          <span className="font-medium">{totalObjects}</span>
        </div>
        {selectedObjects > 0 && (
          <>
            <div className="text-gray-500">|</div>
            <div>
              <span className="text-gray-500">Selected: </span>
              <span className="font-medium text-yellow-400">{selectedObjects}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
