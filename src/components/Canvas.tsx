import { useEffect, useRef } from "react";
import type { TuioObject } from "../types/tuio";
import {
  normalizedToPixel,
  type CanvasDimensions,
} from "../utils/coordinates";

interface CanvasProps {
  objects: TuioObject[];
  width: number;
  height: number;
  showGrid?: boolean;
  selectedObjects?: Set<number>;
  onMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onWheel?: (e: React.WheelEvent<HTMLCanvasElement>) => void;
}

export function Canvas({
  objects,
  width,
  height,
  showGrid = false,
  selectedObjects = new Set(),
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cache grid rendering in an offscreen canvas for better performance
  useEffect(() => {
    if (!showGrid) {
      gridCanvasRef.current = null;
      return;
    }

    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = width;
    gridCanvas.height = height;
    const gridCtx = gridCanvas.getContext('2d');
    if (gridCtx) {
      drawGrid(gridCtx, width, height);
      gridCanvasRef.current = gridCanvas;
    }
  }, [width, height, showGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dimensions: CanvasDimensions = { width, height };

    const render = () => {
      // Clear canvas with fillRect (faster than clearRect)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw cached grid if enabled (drawImage is much faster than redrawing)
      if (showGrid && gridCanvasRef.current) {
        ctx.drawImage(gridCanvasRef.current, 0, 0);
      }

      // Draw all objects with batched operations
      drawObjectsBatched(ctx, objects, dimensions, selectedObjects);
    };

    // Use requestAnimationFrame for smooth rendering at 60fps
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [objects, width, height, showGrid, selectedObjects]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-300 bg-white"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    />
  );
}

/**
 * Draw a grid on the canvas for reference with coordinate labels
 */
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gridSize = 100; // pixels

  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;

  // Vertical lines with labels
  for (let x = 0; x <= width; x += gridSize) {
    // Draw line
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    // Draw coordinate label
    if (x > 0) {
      ctx.fillStyle = "#999";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(x.toString(), x, 12);
    }
  }

  // Horizontal lines with labels
  for (let y = 0; y <= height; y += gridSize) {
    // Draw line
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    // Draw coordinate label
    if (y > 0) {
      ctx.fillStyle = "#999";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(y.toString(), 4, y + 12);
    }
  }

  // Draw origin label
  ctx.fillStyle = "#666";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("(0, 0)", 4, 12);

  // Draw normalized coordinate labels at corners
  ctx.fillStyle = "#666";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("(1.0, 0.0)", width - 4, 12);
  ctx.textAlign = "left";
  ctx.fillText("(0.0, 1.0)", 4, height - 4);
  ctx.textAlign = "right";
  ctx.fillText("(1.0, 1.0)", width - 4, height - 4);
}

/**
 * Draw all objects with batched operations for better performance
 * Reduces context state changes by grouping similar operations
 */
function drawObjectsBatched(
  ctx: CanvasRenderingContext2D,
  objects: TuioObject[],
  dimensions: CanvasDimensions,
  selectedObjects: Set<number>
) {
  const radius = 40;

  // First pass: Draw selection rings (batched)
  ctx.strokeStyle = "#ffaa00";
  ctx.lineWidth = 3;
  selectedObjects.forEach(sessionId => {
    const obj = objects.find(o => o.session_id === sessionId);
    if (!obj) return;

    const pos = normalizedToPixel({ x: obj.x, y: obj.y }, dimensions);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Second pass: Draw object circles (batched by color when possible)
  objects.forEach(obj => {
    const pos = normalizedToPixel({ x: obj.x, y: obj.y }, dimensions);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(obj.angle);

    // Draw circle
    ctx.fillStyle = `hsl(${(obj.type_id * 137) % 360}, 70%, 50%)`;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw direction indicator
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();

    ctx.restore();
  });

  // Third pass: Draw text labels (batched text operations)
  // Show component_id (token number) with larger, more visible font
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  objects.forEach(obj => {
    const pos = normalizedToPixel({ x: obj.x, y: obj.y }, dimensions);
    const text = obj.component_id.toString();

    // Draw black outline for visibility
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeText(text, pos.x, pos.y);

    // Draw white fill on top
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, pos.x, pos.y);
  });
}
