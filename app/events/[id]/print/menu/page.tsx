import Link from "next/link";
import { notFound } from "next/navigation";
import { Menu } from "@/components/Menu";
import { PrintButton } from "@/components/PrintButton";
import { getDb } from "@/lib/db";
import { getEventPlan } from "@/lib/eventPlan";
import { listDrinksForEvent } from "@/lib/repo/drinks";
import { listPurchasedItemsForEvent } from "@/lib/repo/purchasedItems";

export default async function MenuPrintPage({ params }: PageProps<"/events/[id]/print/menu">) {
  const { id } = await params;
  const db = getDb();
  const plan = getEventPlan(db, Number(id));
  if (!plan) notFound();
  const { event, dishes } = plan;
  const drinks = listDrinksForEvent(db, event.id);
  const purchasedItems = listPurchasedItemsForEvent(db, event.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/events/${event.id}`} className="text-sm underline">
          &larr; Back to event
        </Link>
        <PrintButton />
      </div>

      <Menu
        eventName={event.name}
        eventDate={event.eventDate}
        dishes={dishes}
        purchasedItems={purchasedItems}
        drinks={drinks}
      />
    </div>
  );
}
