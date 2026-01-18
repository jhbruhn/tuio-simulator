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
      // Try both width-constrained and height-constrained fits
      const widthConstrainedHeight = containerWidth / aspectRatio;
      const heightConstrainedWidth = containerHeight * aspectRatio;

      // Choose the dimension that fits within the container
      let finalWidth: number;
      if (widthConstrainedHeight <= containerHeight) {
        // Width-constrained: use full width, calculate height
        finalWidth = containerWidth;
      } else {
        // Height-constrained: use full height, calculate width
        finalWidth = heightConstrainedWidth;
      }

      // Round width and calculate height to maintain exact aspect ratio
      const newWidth = Math.max(100, Math.floor(finalWidth));
      const newHeight = Math.max(100, Math.floor(newWidth / aspectRatio));

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
