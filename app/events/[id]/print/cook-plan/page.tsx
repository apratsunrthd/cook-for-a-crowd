import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/AutoPrint";
import { CookPlan } from "@/components/CookPlan";
import { PrintButton } from "@/components/PrintButton";
import { getDb } from "@/lib/db";
import { getEventPlan } from "@/lib/eventPlan";

export default async function CookPlanPrintPage({ params }: PageProps<"/events/[id]/print/cook-plan">) {
  const { id } = await params;
  const db = getDb();
  const plan = getEventPlan(db, Number(id));
  if (!plan) notFound();
  const { event, dishes } = plan;

  return (
    <div className="space-y-6">
      <AutoPrint />
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/events/${event.id}`} className="text-sm underline">
          &larr; Back to event
        </Link>
        <PrintButton />
      </div>

      <h1 className="hidden print:block text-2xl font-semibold">
        {event.eventDate ? `${event.name} -- ${event.eventDate}` : event.name}
      </h1>

      {dishes.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">No dishes added to this event yet.</p>
      ) : (
        <CookPlan dishes={dishes} />
      )}
    </div>
  );
}
