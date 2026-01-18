import { useState, useEffect, RefObject } from "react";

interface CanvasDimensions {
  width: number;
  height: number;
}

interface UseCanvasDimensionsParams {
  containerRef: RefObject<HTMLDivElement | null>;
  aspectRatio: number;
}

/**
 * Hook that calculates optimal canvas dimensions based on available container space
 * and desired aspect ratio. Since TUIO uses normalized values, actual pixel dimensions
 * don't matter - we just want to fill the available space optimally.
 */
export function useCanvasDimensions({
  containerRef,
  aspectRatio,
}: UseCanvasDimensionsParams): CanvasDimensions {
  const [dimensions, setDimensions] = useState<CanvasDimensions>({
    width: 1920,
    height: 1080,
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      // Account for padding (p-4 = 16px on each side = 32px total)
      const padding = 32;
      const containerWidth = container.clientWidth - padding;
      const containerHeight = container.clientHeight - padding;

      // Calculate dimensions that fit within container while maintaining aspect ratio
      let width: number;
      let height: number;

      // Try fitting by width first
      width = containerWidth;
      height = width / aspectRatio;

      // If height doesn't fit, fit by height instead
      if (height > containerHeight) {
        height = containerHeight;
        width = height * aspectRatio;
      }

      // Round to whole pixels and ensure minimum size
      const newWidth = Math.max(100, Math.floor(width));
      const newHeight = Math.max(100, Math.floor(height));

      // Only update if dimensions actually changed (prevent feedback loop)
      setDimensions((prev) => {
        if (prev.width === newWidth && prev.height === newHeight) {
          return prev;
        }
        return { width: newWidth, height: newHeight };
      });
    };

    // Initial calculation
    updateDimensions();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, aspectRatio]);

  return dimensions;
}
