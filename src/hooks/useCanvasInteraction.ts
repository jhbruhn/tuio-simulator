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
  selectedObjects: Set<number>;
  onObjectUpdated?: (sessionId: number, x: number, y: number, angle: number) => void;
  onObjectClicked?: (sessionId: number) => void;
  toggleSelection?: (sessionId: number) => void;
  setSelection?: (sessionIds: Set<number>) => void;
  clearSelection?: () => void;
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
  selectedObjects,
  onObjectUpdated,
  onObjectClicked,
  toggleSelection,
  setSelection,
  clearSelection,
}: UseCanvasInteractionProps): [CanvasInteractionState, CanvasInteractionHandlers] {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Point | null>(null);
  const dragOffsetsRef = useRef<Map<number, Point>>(new Map());

  // Get the primary selected object (first in the set)
  const selectedId = selectedObjects.size > 0 ? Array.from(selectedObjects)[0] : null;

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
        // Handle multi-select with Ctrl/Cmd key
        if (e.ctrlKey || e.metaKey) {
          // Toggle selection
          if (toggleSelection) {
            toggleSelection(obj.session_id);
          }
        } else {
          // Single select (replace selection)
          if (!selectedObjects.has(obj.session_id)) {
            if (setSelection) {
              setSelection(new Set([obj.session_id]));
            }
          }
        }

        // Start dragging - store initial positions for all selected objects
        setIsDragging(true);
        dragStartRef.current = { x, y };

        const offsets = new Map<number, Point>();
        selectedObjects.forEach(sessionId => {
          const selectedObj = objects.find(o => o.session_id === sessionId);
          if (selectedObj) {
            const objX = selectedObj.x * dimensions.width;
            const objY = selectedObj.y * dimensions.height;
            offsets.set(sessionId, { x: x - objX, y: y - objY });
          }
        });
        dragOffsetsRef.current = offsets;

        if (onObjectClicked) {
          onObjectClicked(obj.session_id);
        }
      } else {
        // Clicked on empty space - clear selection
        if (clearSelection) {
          clearSelection();
        }
      }
    },
    [findObjectAtPosition, onObjectClicked, selectedObjects, toggleSelection, setSelection, clearSelection, objects, dimensions]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || selectedObjects.size === 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Move all selected objects
      selectedObjects.forEach(sessionId => {
        const obj = objects.find((o) => o.session_id === sessionId);
        if (!obj) return;

        const offset = dragOffsetsRef.current.get(sessionId) || { x: 0, y: 0 };

        // Apply offset to get object position
        const objPixelX = x - offset.x;
        const objPixelY = y - offset.y;

        // Convert to normalized coordinates
        const normalized = pixelToNormalized({ x: objPixelX, y: objPixelY }, dimensions);
        const clamped = clampNormalized(normalized);

        if (onObjectUpdated) {
          onObjectUpdated(sessionId, clamped.x, clamped.y, obj.angle);
        }
      });
    },
    [isDragging, selectedObjects, objects, dimensions, onObjectUpdated]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    dragOffsetsRef.current.clear();
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      if (selectedObjects.size === 0) return;

      // Rotate by delta (wheel movement)
      const angleDelta = e.deltaY * 0.01;

      // Rotate all selected objects
      selectedObjects.forEach(sessionId => {
        const obj = objects.find((o) => o.session_id === sessionId);
        if (!obj) return;

        const newAngle = obj.angle + angleDelta;

        if (onObjectUpdated) {
          onObjectUpdated(sessionId, obj.x, obj.y, newAngle);
        }
      });
    },
    [selectedObjects, objects, onObjectUpdated]
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
