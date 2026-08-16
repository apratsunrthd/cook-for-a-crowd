import { notFound } from "next/navigation";
import { EventForm } from "@/components/EventForm";
import { getDb } from "@/lib/db";
import { getEvent } from "@/lib/repo/events";

export default async function EditEventPage({ params }: PageProps<"/events/[id]/edit">) {
  const { id } = await params;
  const event = getEvent(getDb(), Number(id));
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit event</h1>
      <EventForm event={event} />
    </div>
  );
}
