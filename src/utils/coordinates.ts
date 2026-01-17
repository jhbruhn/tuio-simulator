/**
 * Coordinate conversion utilities for TUIO 2.0
 *
 * TUIO uses normalized coordinates in the range [0.0, 1.0]:
 * - X: 0.0 = left edge, 1.0 = right edge
 * - Y: 0.0 = top edge, 1.0 = bottom edge
 *
 * These utilities convert between normalized coordinates and pixel coordinates
 */

export interface Point {
  x: number;
  y: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

/**
 * Convert normalized coordinates (0-1) to pixel coordinates
 *
 * @param normalized - Normalized coordinates in range [0, 1]
 * @param dimensions - Canvas dimensions in pixels
 * @returns Pixel coordinates
 */
export function normalizedToPixel(
  normalized: NormalizedPoint,
  dimensions: CanvasDimensions
): Point {
  return {
    x: normalized.x * dimensions.width,
    y: normalized.y * dimensions.height,
  };
}

/**
 * Convert pixel coordinates to normalized coordinates (0-1)
 *
 * @param pixel - Pixel coordinates
 * @param dimensions - Canvas dimensions in pixels
 * @returns Normalized coordinates in range [0, 1]
 */
export function pixelToNormalized(
  pixel: Point,
  dimensions: CanvasDimensions
): NormalizedPoint {
  return {
    x: pixel.x / dimensions.width,
    y: pixel.y / dimensions.height,
  };
}

/**
 * Clamp normalized coordinates to valid range [0, 1]
 *
 * @param normalized - Normalized coordinates
 * @returns Clamped coordinates
 */
export function clampNormalized(
  normalized: NormalizedPoint
): NormalizedPoint {
  return {
    x: Math.max(0, Math.min(1, normalized.x)),
    y: Math.max(0, Math.min(1, normalized.y)),
  };
}

/**
 * Convert degrees to radians
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Normalize angle to range [0, 2π]
 *
 * @param radians - Angle in radians
 * @returns Normalized angle in range [0, 2π]
 */
export function normalizeAngle(radians: number): number {
  const normalized = radians % (2 * Math.PI);
  return normalized >= 0 ? normalized : normalized + 2 * Math.PI;
}
