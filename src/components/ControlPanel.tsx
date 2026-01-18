import React from 'react';

interface ControlPanelProps {
  isRunning: boolean;
  portInput: number;
  fps: number;
  onPortChange: (port: number) => void;
  onFpsChange: (fps: number) => void;
  onStartServer: () => void;
  onStopServer: () => void;
  onOpenDebugger: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  portInput,
  fps,
  onPortChange,
  onFpsChange,
  onStartServer,
  onStopServer,
  onOpenDebugger,
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Server</h2>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm mb-1">Port</label>
            <input
              type="number"
              value={portInput}
              onChange={(e) => {
                const newPort = parseInt(e.target.value) || 3333;
                onPortChange(newPort);
              }}
              disabled={isRunning}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1">FPS</label>
            <input
              type="number"
              value={fps}
              onChange={(e) => {
                const newFps = parseInt(e.target.value);
                onFpsChange(newFps);
              }}
              min="1"
              max="120"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onStartServer}
          disabled={isRunning}
          className="flex-1 px-3 py-2 bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
        >
          Start
        </button>
        <button
          onClick={onStopServer}
          disabled={!isRunning}
          className="flex-1 px-3 py-2 bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
        >
          Stop
        </button>
      </div>

      <button
        onClick={onOpenDebugger}
        className="w-full px-3 py-2 mt-2 bg-purple-600 rounded hover:bg-purple-700 text-sm font-medium"
        title="Open OSC Message Debugger"
      >
        🐛 OSC Debugger
      </button>
    </div>
  );
};
