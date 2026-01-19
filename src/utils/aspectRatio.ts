/**
 * Converts a decimal aspect ratio to its common fraction representation
 * @param ratio - Aspect ratio as width/height (e.g., 1.777... for 16:9)
 * @returns String representation like "16:9"
 */
export function formatAspectRatio(ratio: number): string {
  // Common aspect ratios lookup table
  const commonRatios: Record<string, string> = {
    '1.333': '4:3',
    '1.600': '16:10',
    '1.778': '16:9',
    '2.333': '21:9',
    '2.370': '21.5:9',
    '3.200': '32:10',
    '1.000': '1:1',
    '0.750': '3:4',
    '0.625': '10:16',
    '0.563': '9:16',
  };

  // Round to 3 decimal places for lookup
  const roundedRatio = ratio.toFixed(3);

  // Check if it's a common ratio
  if (commonRatios[roundedRatio]) {
    return commonRatios[roundedRatio];
  }

  // For custom ratios, calculate GCD to find simplest fraction
  const tolerance = 0.01;
  let bestNumerator = Math.round(ratio);
  let bestDenominator = 1;
  let bestError = Math.abs(ratio - bestNumerator);

  // Search for a good fraction approximation (up to denominator 100)
  for (let denominator = 1; denominator <= 100; denominator++) {
    const numerator = Math.round(ratio * denominator);
    const error = Math.abs(ratio - numerator / denominator);

    if (error < bestError) {
      bestError = error;
      bestNumerator = numerator;
      bestDenominator = denominator;

      // If we're within tolerance, we found a good match
      if (error < tolerance) {
        break;
      }
    }
  }

  // Simplify the fraction using GCD
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(bestNumerator, bestDenominator);

  return `${bestNumerator / divisor}:${bestDenominator / divisor}`;
}

/**
 * Parses an aspect ratio string (e.g., "16:9") to a decimal number
 * @param ratioStr - Aspect ratio string like "16:9"
 * @returns Decimal aspect ratio (width/height)
 */
export function parseAspectRatio(ratioStr: string): number {
  const parts = ratioStr.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid aspect ratio format. Expected "width:height"');
  }

  const width = parseFloat(parts[0]);
  const height = parseFloat(parts[1]);

  if (isNaN(width) || isNaN(height) || height === 0) {
    throw new Error('Invalid aspect ratio values');
  }

  return width / height;
}
