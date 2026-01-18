import { useEffect } from "react";
import type { TuioObject } from "../types/tuio";

interface UseKeyboardShortcutsProps {
  objects: TuioObject[];
  selectedObjects: Set<number>;
  canvasDimensions: { width: number; height: number };
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onUpdateObject: (sessionId: number, x: number, y: number, angle: number) => Promise<void>;
}

/**
 * Hook for handling keyboard shortcuts
 *
 * Shortcuts:
 * - Delete/Backspace: Delete selected objects
 * - Ctrl/Cmd+D: Duplicate selected objects
 * - Ctrl/Cmd+A: Select all objects
 * - Escape: Clear selection
 * - Arrow keys: Move selected objects by 1px
 * - Shift+Arrow keys: Move selected objects by 10px
 * - Ctrl/Cmd+Left/Right: Rotate selected objects by 15°
 */
export function useKeyboardShortcuts({
  objects,
  selectedObjects,
  canvasDimensions,
  onDelete,
  onDuplicate,
  onSelectAll,
  onClearSelection,
  onUpdateObject,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      // Delete/Backspace - Delete selected objects
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDelete();
        return;
      }

      // Ctrl/Cmd+D - Duplicate selected objects
      if (ctrlOrCmd && e.key === "d") {
        e.preventDefault();
        onDuplicate();
        return;
      }

      // Ctrl/Cmd+A - Select all objects
      if (ctrlOrCmd && e.key === "a") {
        e.preventDefault();
        onSelectAll();
        return;
      }

      // Escape - Clear selection
      if (e.key === "Escape") {
        e.preventDefault();
        onClearSelection();
        return;
      }

      // Arrow keys - Move selected objects
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();

        if (selectedObjects.size === 0) return;

        // Movement step (1px normal, 10px with shift)
        const step = e.shiftKey ? 10 : 1;

        // Movement direction
        const dx =
          e.key === "ArrowLeft" ? -step :
          e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step :
          e.key === "ArrowDown" ? step : 0;

        // Apply movement to all selected objects
        selectedObjects.forEach(sessionId => {
          const obj = objects.find(o => o.session_id === sessionId);
          if (!obj) return;

          // Convert pixel movement to normalized coordinates
          const dxNorm = dx / canvasDimensions.width;
          const dyNorm = dy / canvasDimensions.height;

          // Calculate new position and clamp
          const newX = Math.max(0, Math.min(1, obj.x + dxNorm));
          const newY = Math.max(0, Math.min(1, obj.y + dyNorm));

          onUpdateObject(sessionId, newX, newY, obj.angle);
        });

        return;
      }

      // Ctrl/Cmd+Left/Right - Rotate selected objects
      if (ctrlOrCmd && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();

        if (selectedObjects.size === 0) return;

        // Rotation step (15 degrees)
        const angleDelta = (e.key === "ArrowLeft" ? -15 : 15) * (Math.PI / 180);

        // Apply rotation to all selected objects
        selectedObjects.forEach(sessionId => {
          const obj = objects.find(o => o.session_id === sessionId);
          if (!obj) return;

          const newAngle = obj.angle + angleDelta;

          onUpdateObject(sessionId, obj.x, obj.y, newAngle);
        });

        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [objects, selectedObjects, canvasDimensions, onDelete, onDuplicate, onSelectAll, onClearSelection, onUpdateObject]);
}
