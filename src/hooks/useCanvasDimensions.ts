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
      // CSS aspect-ratio handles the ratio, we just read the actual size
      const newWidth = Math.floor(container.clientWidth);
      const newHeight = Math.floor(container.clientHeight);

      // Only update if dimensions actually changed (prevent feedback loop)
      setDimensions((prev) => {
        if (prev.width === newWidth && prev.height === newHeight) {
          return prev;
        }
        return { width: newWidth, height: newHeight };
      });
    };

    // Delay initial calculation to let CSS apply
    const timeoutId = setTimeout(updateDimensions, 0);

    // Update on resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [containerRef, aspectRatio]);

  return dimensions;
}
