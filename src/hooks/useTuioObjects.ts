import { useState, useCallback } from "react";
import type { TuioObject } from "../types/tuio";
import * as commands from "../api/commands";

export interface UseTuioObjects {
  objects: TuioObject[];
  selectedObjects: Set<number>;
  addObject: (componentId: number, x: number, y: number) => Promise<number>;
  updateObject: (sessionId: number, x: number, y: number, angle: number) => Promise<void>;
  removeObject: (sessionId: number) => Promise<void>;
  setSelection: (sessionIds: Set<number>) => void;
  toggleSelection: (sessionId: number) => void;
  clearSelection: () => void;
}

/**
 * Hook for managing TUIO objects state
 *
 * Provides methods for adding, updating, removing, and selecting objects
 */
export function useTuioObjects(): UseTuioObjects {
  const [objects, setObjects] = useState<TuioObject[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<Set<number>>(new Set());

  const addObject = useCallback(async (componentId: number, x: number, y: number): Promise<number> => {
    const sessionId = await commands.addObject(componentId, x, y);

    // Add to local state
    const newObject: TuioObject = {
      session_id: sessionId,
      type_id: componentId, // Use componentId as type_id for color mapping
      user_id: 0,
      component_id: componentId,
      x,
      y,
      angle: 0,
      x_vel: 0,
      y_vel: 0,
      angle_vel: 0,
      last_x: x,
      last_y: y,
      last_angle: 0,
      last_update: Date.now(),
    };

    setObjects((prev) => [...prev, newObject]);

    return sessionId;
  }, []);

  const updateObject = useCallback(
    async (sessionId: number, x: number, y: number, angle: number): Promise<void> => {
      await commands.updateObject(sessionId, x, y, angle);

      // Update local state
      setObjects((prev) =>
        prev.map((obj) =>
          obj.session_id === sessionId
            ? {
                ...obj,
                x,
                y,
                angle,
                last_update: Date.now(),
              }
            : obj
        )
      );
    },
    []
  );

  const removeObject = useCallback(async (sessionId: number): Promise<void> => {
    await commands.removeObject(sessionId);

    // Remove from local state
    setObjects((prev) => prev.filter((obj) => obj.session_id !== sessionId));

    // Remove from selection
    setSelectedObjects((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
  }, []);

  const setSelection = useCallback((sessionIds: Set<number>) => {
    setSelectedObjects(sessionIds);
  }, []);

  const toggleSelection = useCallback((sessionId: number) => {
    setSelectedObjects((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedObjects(new Set());
  }, []);

  return {
    objects,
    selectedObjects,
    addObject,
    updateObject,
    removeObject,
    setSelection,
    toggleSelection,
    clearSelection,
  };
}
