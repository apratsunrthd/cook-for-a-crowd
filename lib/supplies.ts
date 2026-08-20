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
  // Separate line items, not one "Plates" x2 -- a dessert plate is
  // typically a different (smaller) size than a dinner plate, so this
  // keeps them independently adjustable/orderable rather than one lump
  // count that hides which size you actually need more of.
  { id: "dinner-plates", name: "Dinner plates", unit: "plate", perPersonQuantity: 1.1 },
  { id: "dessert-plates", name: "Dessert plates", unit: "plate", perPersonQuantity: 1.1 },
  { id: "napkins", name: "Napkins", unit: "napkin", perPersonQuantity: 2 },
  { id: "cups", name: "Cups", unit: "cup", perPersonQuantity: 1.5 },
  // 2x, not 1x -- someone eats their meal, throws that fork away, and
  // gets a clean one for dessert. A single utensil per person undercounts
  // by about half in practice.
  { id: "forks", name: "Forks", unit: "fork", perPersonQuantity: 2.2 },
  { id: "spoons", name: "Spoons", unit: "spoon", perPersonQuantity: 2 },
  // Knives don't get the same dessert-round bump -- dessert rarely needs
  // one, so a single dinner knife per person is still the right default.
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
