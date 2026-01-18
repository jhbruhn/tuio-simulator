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
    let timeoutId: number | null = null;

    const updateDimensions = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      // CSS aspect-ratio handles the ratio, we just read the actual size
      const newWidth = Math.floor(container.clientWidth);
      const newHeight = Math.floor(container.clientHeight);

      // Ignore invalid dimensions
      if (newWidth === 0 || newHeight === 0) return;

      // Only update if dimensions actually changed by more than 1px (prevent feedback loop)
      setDimensions((prev) => {
        const widthDiff = Math.abs(prev.width - newWidth);
        const heightDiff = Math.abs(prev.height - newHeight);

        if (widthDiff <= 1 && heightDiff <= 1) {
          return prev;
        }
        return { width: newWidth, height: newHeight };
      });
    };

    // Debounced update to prevent rapid firing
    const debouncedUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 100);
    };

    // Initial calculation
    updateDimensions();

    // Update on resize with debouncing
    const resizeObserver = new ResizeObserver(debouncedUpdate);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [containerRef, aspectRatio]);

  return dimensions;
}
