import type { TuioObject } from "../types/tuio";

interface PropertyPanelProps {
  selectedObjects: Set<number>;
  objects: TuioObject[];
  canvasDimensions: { width: number; height: number };
  onUpdate: (sessionId: number, x: number, y: number, angle: number) => Promise<void>;
}

export function PropertyPanel({
  selectedObjects,
  objects,
  canvasDimensions,
  onUpdate,
}: PropertyPanelProps) {
  // Show properties for the first selected object
  if (selectedObjects.size === 0) {
    return null;
  }

  const selectedId = Array.from(selectedObjects)[0];
  const obj = objects.find((o) => o.session_id === selectedId);

  if (!obj) {
    return null;
  }

  // Convert normalized coords to pixels for display
  const pixelX = Math.round(obj.x * canvasDimensions.width);
  const pixelY = Math.round(obj.y * canvasDimensions.height);
  const angleDeg = Math.round((obj.angle * 180) / Math.PI);

  const handleNormalizedXChange = async (newX: number) => {
    const clamped = Math.max(0, Math.min(1, newX));
    try {
      await onUpdate(obj.session_id, clamped, obj.y, obj.angle);
    } catch (err) {
      console.error("Failed to update x:", err);
    }
  };

  const handleNormalizedYChange = async (newY: number) => {
    const clamped = Math.max(0, Math.min(1, newY));
    try {
      await onUpdate(obj.session_id, obj.x, clamped, obj.angle);
    } catch (err) {
      console.error("Failed to update y:", err);
    }
  };

  const handlePixelXChange = async (newPixelX: number) => {
    const normalized = newPixelX / canvasDimensions.width;
    await handleNormalizedXChange(normalized);
  };

  const handlePixelYChange = async (newPixelY: number) => {
    const normalized = newPixelY / canvasDimensions.height;
    await handleNormalizedYChange(normalized);
  };

  const handleAngleChange = async (newAngleDeg: number) => {
    const newAngleRad = (newAngleDeg * Math.PI) / 180;
    try {
      await onUpdate(obj.session_id, obj.x, obj.y, newAngleRad);
    } catch (err) {
      console.error("Failed to update angle:", err);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-700">
      <h3 className="text-sm font-semibold mb-3">
        Properties
        {selectedObjects.size > 1 && (
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({selectedObjects.size} selected)
          </span>
        )}
      </h3>

      <div className="space-y-3 text-sm">
        {/* Session ID (read-only) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Session ID</label>
          <div className="px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-300">
            {obj.session_id}
          </div>
        </div>

        {/* Type ID (read-only for now) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type ID</label>
          <div className="px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-300">
            {obj.type_id}
          </div>
        </div>

        {/* Position X */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">X Position</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={obj.x.toFixed(3)}
                onChange={(e) => handleNormalizedXChange(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                max="1"
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">normalized</div>
            </div>
            <div className="flex-1">
              <input
                type="number"
                value={pixelX}
                onChange={(e) => handlePixelXChange(parseInt(e.target.value) || 0)}
                min="0"
                max={canvasDimensions.width}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">pixels</div>
            </div>
          </div>
        </div>

        {/* Position Y */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Y Position</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={obj.y.toFixed(3)}
                onChange={(e) => handleNormalizedYChange(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                max="1"
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">normalized</div>
            </div>
            <div className="flex-1">
              <input
                type="number"
                value={pixelY}
                onChange={(e) => handlePixelYChange(parseInt(e.target.value) || 0)}
                min="0"
                max={canvasDimensions.height}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">pixels</div>
            </div>
          </div>
        </div>

        {/* Angle */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Angle (degrees)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={angleDeg}
              onChange={(e) => handleAngleChange(parseInt(e.target.value) || 0)}
              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
            <button
              onClick={() => handleAngleChange(0)}
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Velocities (read-only) */}
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Velocities</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-gray-500">X Vel</div>
              <div className="text-gray-300">{obj.x_vel.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-gray-500">Y Vel</div>
              <div className="text-gray-300">{obj.y_vel.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-gray-500">Angle Vel</div>
              <div className="text-gray-300">{obj.angle_vel.toFixed(3)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
