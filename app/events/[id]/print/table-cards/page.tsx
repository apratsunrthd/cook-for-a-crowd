import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { TableCards } from "@/components/TableCards";
import { getDb } from "@/lib/db";
import { getEventPlan } from "@/lib/eventPlan";
import { listPurchasedItemsForEvent } from "@/lib/repo/purchasedItems";

export default async function TableCardsPrintPage({ params }: PageProps<"/events/[id]/print/table-cards">) {
  const { id } = await params;
  const db = getDb();
  const plan = getEventPlan(db, Number(id));
  if (!plan) notFound();
  const { event, dishes } = plan;
  const purchasedItems = listPurchasedItemsForEvent(db, event.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/events/${event.id}`} className="text-sm underline">
          &larr; Back to event
        </Link>
        <PrintButton />
      </div>

      <div className="hidden print:block text-center mb-2">
        <p className="text-xs text-black/40 uppercase tracking-widest">
          {event.eventDate ? `${event.name} — ${event.eventDate}` : event.name}
        </p>
      </div>

      <TableCards dishes={dishes} purchasedItems={purchasedItems} />
    </div>
  );
}
