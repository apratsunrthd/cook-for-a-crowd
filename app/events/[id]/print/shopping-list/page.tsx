import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/AutoPrint";
import { PrintButton } from "@/components/PrintButton";
import { ShoppingList } from "@/components/ShoppingList";
import { getDb } from "@/lib/db";
import { drinkUnitsNeeded } from "@/lib/drinks";
import { getEventPlan } from "@/lib/eventPlan";
import { listDrinksForEvent } from "@/lib/repo/drinks";

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export default async function ShoppingListPrintPage({
  params,
}: PageProps<"/events/[id]/print/shopping-list">) {
  const { id } = await params;
  const db = getDb();
  const plan = getEventPlan(db, Number(id));
  if (!plan) notFound();
  const { event, headcount, shoppingList } = plan;
  const drinks = listDrinksForEvent(db, event.id);

  return (
    <div className="space-y-6">
      <AutoPrint />
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/events/${event.id}`} className="text-sm underline">
          &larr; Back to event
        </Link>
        <PrintButton />
      </div>

      <ShoppingList items={shoppingList} eventName={event.name} />

      {drinks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Drinks to buy</h2>
          <ul className="text-sm space-y-1">
            {drinks.map((drink) => {
              const drinkHeadcount = drink.targetHeadcount ?? headcount;
              const units = drinkUnitsNeeded(drinkHeadcount, drink.servingSizeOz, drink.packageSizeOz);
              return (
                <li key={drink.id}>
                  {pluralize(units, drink.unitLabel)} {drink.name}
                  {drink.notes && <span className="italic"> ({drink.notes})</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
