import { EventForm } from "@/components/EventForm";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New event</h1>
      <EventForm />
    </div>
  );
}
