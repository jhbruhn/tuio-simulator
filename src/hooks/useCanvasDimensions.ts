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
      // Account for padding (p-4 = 16px on each side)
      const availableWidth = container.clientWidth - 32;
      const availableHeight = container.clientHeight - 32;

      // Ignore invalid dimensions
      if (availableWidth <= 0 || availableHeight <= 0) return;

      // Calculate dimensions that fit while maintaining aspect ratio
      let newWidth: number;
      let newHeight: number;

      // Try width-constrained
      newWidth = availableWidth;
      newHeight = Math.floor(newWidth / aspectRatio);

      // If height doesn't fit, use height-constrained
      if (newHeight > availableHeight) {
        newHeight = availableHeight;
        newWidth = Math.floor(newHeight * aspectRatio);
      }

      // Only update if dimensions actually changed by more than 2px (prevent feedback loop)
      setDimensions((prev) => {
        const widthDiff = Math.abs(prev.width - newWidth);
        const heightDiff = Math.abs(prev.height - newHeight);

        if (widthDiff <= 2 && heightDiff <= 2) {
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
