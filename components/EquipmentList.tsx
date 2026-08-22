import { computeVessels, suggestEquipment, type DishForEquipment, type EquipmentItem, type VesselItem } from "@/lib/equipmentAI";

function VesselSection({ vessels }: { vessels: VesselItem[] }) {
  if (vessels.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
        Cooking vessels
      </div>
      <ul className="text-sm pl-4 list-disc space-y-0.5">
        {vessels.map((v, i) => (
          <li key={i}>
            {v.count}&times; {v.label}{v.noun === "pan" ? ` ${v.noun}` : ""}
            <span className="text-black/60 dark:text-white/60">
              {" — "}
              {v.dishName}
              {v.variantLabel ? ` (${v.variantLabel})` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EquipmentSection({ heading, items }: { heading: string; items: EquipmentItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
        {heading}
      </div>
      <ul className="text-sm pl-4 list-disc space-y-0.5">
        {items.map((eq, i) => (
          <li key={i}>
            {eq.quantity} {eq.item}
            {eq.note && (
              <span className="text-black/60 dark:text-white/60"> &mdash; {eq.note}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function EquipmentList({
  dishes,
  headcount,
}: {
  dishes: DishForEquipment[];
  headcount: number;
}) {
  const vessels = computeVessels(dishes);
  const suggestions = await suggestEquipment(dishes, headcount);

  if (vessels.length === 0 && !suggestions) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Equipment</h2>
      <div className="rounded-md border border-black/10 dark:border-white/10 p-3 space-y-4">
        <VesselSection vessels={vessels} />
        {suggestions && (
          <>
            <EquipmentSection heading="Cooking equipment" items={suggestions.cookingEquipment} />
            <EquipmentSection heading="Serving ware" items={suggestions.servingWare} />
          </>
        )}
      </div>
    </div>
  );
}
