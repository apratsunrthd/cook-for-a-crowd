export interface SupplyPreset {
  id: string;
  name: string;
  unit: string;
  perPersonQuantity: number;
}

// Well-established per-person catering multipliers -- unlike drinks, there's
// no real regional/preference judgment call here, so these are plain
// defaults to start from rather than something worth an AI call for.
export const SUPPLY_PRESETS: SupplyPreset[] = [
  { id: "plates", name: "Plates", unit: "plate", perPersonQuantity: 1.1 },
  { id: "napkins", name: "Napkins", unit: "napkin", perPersonQuantity: 2 },
  { id: "cups", name: "Cups", unit: "cup", perPersonQuantity: 1.5 },
  { id: "forks", name: "Forks", unit: "fork", perPersonQuantity: 1.1 },
  { id: "spoons", name: "Spoons", unit: "spoon", perPersonQuantity: 1 },
  { id: "knives", name: "Knives", unit: "knife", perPersonQuantity: 1 },
  // A common catering rule of thumb for a several-hour outdoor group event
  // (drink chilling + coolers) -- less is fine for a short indoor one.
  { id: "ice", name: "Ice", unit: "lb", perPersonQuantity: 1.5 },
];

/** Total quantity needed, always rounding up -- same "never come up short" rule as everything else. */
export function suppliesNeeded(perPersonQuantity: number, headcount: number): number {
  if (perPersonQuantity <= 0 || headcount <= 0) return 0;
  return Math.ceil(perPersonQuantity * headcount);
}
