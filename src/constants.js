// Geometry (simulation units, roughly screen pixels at scale 1).
export const CELL_SIZE = 60;
export const CELL_GAP = 8;
export const SEGMENTS_PER_SIDE = 6;
export const PLAQUE_OFFSETS = [20, 40];
export const PERINUCLEAR_NODES = 6;
export const PERINUCLEAR_RADIUS = 11;

// Material (tension in force units per unit strain).
export const MEMBRANE_STIFFNESS = 30;
export const MEMBRANE_BREAK_STRAIN = 0.15;
export const MEMBRANE_BREAK_SPREAD = 0.2;
export const DESMOSOME_STIFFNESS = 120;
export const DESMOSOME_BREAK_STRAIN = 8;
export const FILAMENT_STIFFNESS = 200;
export const FILAMENT_STIFFENING = 30;
export const FILAMENT_COMPRESSION = 0;
export const FILAMENT_SLACK = 0.12;
export const FILAMENT_BREAK_STRAIN = 3;
export const BULK_MODULUS = 3;
export const CYTOPLASM_STIFFNESS = 40;

// Dynamics.
export const TIME_STEP = 0.02;
export const MAX_FORCE = 150;
export const MAX_GRIP_TRAVEL = 180;
