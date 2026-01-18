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
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

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

      // Round to whole pixels
      setDimensions({
        width: Math.floor(width),
        height: Math.floor(height),
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
