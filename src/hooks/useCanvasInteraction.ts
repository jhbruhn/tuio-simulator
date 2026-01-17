import { useCallback, useRef, useState } from "react";
import type { TuioObject } from "../types/tuio";
import {
  pixelToNormalized,
  clampNormalized,
  type Point,
  type CanvasDimensions,
} from "../utils/coordinates";

export interface CanvasInteractionState {
  selectedId: number | null;
  isDragging: boolean;
}

export interface CanvasInteractionHandlers {
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
  handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
}

export interface UseCanvasInteractionProps {
  objects: TuioObject[];
  dimensions: CanvasDimensions;
  onObjectUpdated?: (sessionId: number, x: number, y: number, angle: number) => void;
  onObjectClicked?: (sessionId: number) => void;
}

/**
 * Hook for handling canvas mouse interactions
 *
 * Provides handlers for:
 * - Clicking to select objects
 * - Dragging to move objects
 * - Mouse wheel to rotate objects
 */
export function useCanvasInteraction({
  objects,
  dimensions,
  onObjectUpdated,
  onObjectClicked,
}: UseCanvasInteractionProps): [CanvasInteractionState, CanvasInteractionHandlers] {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Point | null>(null);

  /**
   * Find object at given pixel coordinates
   */
  const findObjectAtPosition = useCallback(
    (x: number, y: number): TuioObject | null => {
      const radius = 20; // Same as rendering radius

      for (const obj of objects) {
        const objX = obj.x * dimensions.width;
        const objY = obj.y * dimensions.height;

        const distance = Math.sqrt((x - objX) ** 2 + (y - objY) ** 2);

        if (distance <= radius) {
          return obj;
        }
      }

      return null;
    },
    [objects, dimensions]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const obj = findObjectAtPosition(x, y);

      if (obj) {
        setSelectedId(obj.session_id);
        setIsDragging(true);
        dragStartRef.current = { x, y };

        if (onObjectClicked) {
          onObjectClicked(obj.session_id);
        }
      } else {
        setSelectedId(null);
      }
    },
    [findObjectAtPosition, onObjectClicked]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || selectedId === null) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const obj = objects.find((o) => o.session_id === selectedId);
      if (!obj) return;

      // Convert to normalized coordinates
      const normalized = pixelToNormalized({ x, y }, dimensions);
      const clamped = clampNormalized(normalized);

      if (onObjectUpdated) {
        onObjectUpdated(selectedId, clamped.x, clamped.y, obj.angle);
      }
    },
    [isDragging, selectedId, objects, dimensions, onObjectUpdated]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      if (selectedId === null) return;

      const obj = objects.find((o) => o.session_id === selectedId);
      if (!obj) return;

      // Rotate by delta (wheel movement)
      const angleDelta = e.deltaY * 0.01;
      const newAngle = obj.angle + angleDelta;

      if (onObjectUpdated) {
        onObjectUpdated(selectedId, obj.x, obj.y, newAngle);
      }
    },
    [selectedId, objects, onObjectUpdated]
  );

  const state: CanvasInteractionState = {
    selectedId,
    isDragging,
  };

  const handlers: CanvasInteractionHandlers = {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  };

  return [state, handlers];
}
