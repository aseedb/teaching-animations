// How a flexible filament looks: straight when taut, a gentle wave when slack,
// with the wave's amplitude chosen so the drawn length equals its contour.

export const FILAMENT_WAVELENGTH = 7;
const SAMPLES_PER_WAVE = 10;

export function filamentPath(x1, y1, x2, y2, strain) {
  if (strain >= 0) return [[x1, y1], [x2, y2]];
  const span = Math.hypot(x2 - x1, y2 - y1);
  const waves = Math.max(1, Math.round(span / FILAMENT_WAVELENGTH));
  const wavelength = span / waves;
  const amplitude = amplitudeForExcess(wavelength, 1 / (1 + strain) - 1);
  return sampleWave(x1, y1, x2, y2, waves, amplitude);
}

// Arc length of a sine: L ≈ span (1 + (πA/λ)²) for moderate amplitudes.
function amplitudeForExcess(wavelength, excess) {
  return (wavelength / Math.PI) * Math.sqrt(excess);
}

function sampleWave(x1, y1, x2, y2, waves, amplitude) {
  const span = Math.hypot(x2 - x1, y2 - y1);
  const [ux, uy] = [(x2 - x1) / span, (y2 - y1) / span];
  const count = waves * SAMPLES_PER_WAVE;
  return Array.from({ length: count + 1 }, (_, k) => {
    const t = k / count;
    const offset = amplitude * Math.sin(2 * Math.PI * waves * t);
    return [x1 + (x2 - x1) * t - uy * offset, y1 + (y2 - y1) * t + ux * offset];
  });
}
