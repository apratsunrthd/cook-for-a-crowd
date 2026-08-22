import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import { getDb } from "@/lib/db";
import { drinkUnitsNeeded, splitDrinkHeadcounts } from "@/lib/drinks";
import { getEventPlan } from "@/lib/eventPlan";
import { listDrinksForEvent } from "@/lib/repo/drinks";
import { listPurchasedItemsForEvent } from "@/lib/repo/purchasedItems";
import { listSuppliesForEvent } from "@/lib/repo/supplies";
import { suppliesNeeded } from "@/lib/supplies";

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
  const drinkHeadcounts = splitDrinkHeadcounts(drinks, headcount);
  const supplies = listSuppliesForEvent(db, event.id);
  const purchasedItems = listPurchasedItemsForEvent(db, event.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/events/${event.id}`} className="text-sm underline">
          &larr; Back to event
        </Link>
        <PrintButton />
      </div>

      <ShoppingListSection items={shoppingList} eventName={event.name} eventId={event.id} />

      {drinks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Drinks to buy</h2>
          <ul className="text-sm space-y-1">
            {drinks.map((drink) => {
              const drinkHeadcount = drinkHeadcounts.get(drink.id) ?? headcount;
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

      {supplies.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Supplies to buy</h2>
          <ul className="text-sm space-y-1">
            {supplies.map((supply) => {
              const supplyHeadcount = supply.targetHeadcount ?? headcount;
              const needed = suppliesNeeded(supply.perPersonQuantity, supplyHeadcount);
              return (
                <li key={supply.id}>
                  {pluralize(needed, supply.unit)} ({supply.name})
                  {supply.notes && <span className="italic"> ({supply.notes})</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {purchasedItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Also buying / ordering</h2>
          <ul className="text-sm space-y-1">
            {purchasedItems.map((item) => (
              <li key={item.id}>
                {item.name} -- {item.quantityNote}
                {item.notes && <span className="italic"> ({item.notes})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
