import Link from "next/link";
import { getDb } from "@/lib/db";
import { listEvents } from "@/lib/repo/events";
import { effectiveHeadcount } from "@/lib/scale";

export default function DashboardPage() {
  const events = listEvents(getDb());
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => !e.eventDate || e.eventDate >= today);
  const past = events.filter((e) => e.eventDate && e.eventDate < today);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link
          href="/events/new"
          className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium"
        >
          New Event
        </Link>
      </div>

      <EventSection title="Upcoming" events={upcoming} emptyText="No upcoming events yet." />
      {past.length > 0 && <EventSection title="Past" events={past} emptyText="" />}
    </div>
  );
}

function EventSection({
  title,
  events,
  emptyText,
}: {
  title: string;
  events: ReturnType<typeof listEvents>;
  emptyText: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
        {title}
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10 rounded-md border border-black/10 dark:border-white/10">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-black/[.03] dark:hover:bg-white/[.05]"
              >
                <div>
                  <div className="font-medium">{event.name}</div>
                  <div className="text-sm text-black/60 dark:text-white/60">
                    {event.eventDate ?? "No date set"} &middot; {event.rsvpCount} RSVPs &middot;
                    cooking for {effectiveHeadcount(event)}
                  </div>
                </div>
                <span aria-hidden className="text-black/30 dark:text-white/30">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
