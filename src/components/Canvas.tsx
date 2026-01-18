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
}

export function Canvas({ objects, width, height, showGrid = false, selectedObjects = new Set() }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, width, height);
    }

    // Draw all objects
    const dimensions: CanvasDimensions = { width, height };
    objects.forEach((obj) => {
      const isSelected = selectedObjects.has(obj.session_id);
      drawObject(ctx, obj, dimensions, isSelected);
    });
  }, [objects, width, height, showGrid, selectedObjects]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-300 bg-white"
    />
  );
}

/**
 * Draw a grid on the canvas for reference
 */
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gridSize = 50; // pixels

  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

/**
 * Draw a TUIO object on the canvas
 */
function drawObject(
  ctx: CanvasRenderingContext2D,
  obj: TuioObject,
  dimensions: CanvasDimensions,
  isSelected: boolean = false
) {
  // Convert normalized coordinates to pixels
  const pos = normalizedToPixel({ x: obj.x, y: obj.y }, dimensions);

  const radius = 20; // Object radius in pixels

  ctx.save();

  // Translate to object position
  ctx.translate(pos.x, pos.y);

  // Rotate by object angle
  ctx.rotate(obj.angle);

  // Draw selection ring if selected
  if (isSelected) {
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw circle
  ctx.fillStyle = `hsl(${(obj.type_id * 137) % 360}, 70%, 50%)`;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw direction indicator (line from center to edge)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radius, 0);
  ctx.stroke();

  // Draw session ID
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(obj.session_id.toString(), 0, 0);

  ctx.restore();
}
