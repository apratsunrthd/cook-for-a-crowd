"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveEventAction } from "@/lib/actions/events";
import { effectiveHeadcount } from "@/lib/scale";
import type { BufferMode, Event } from "@/lib/types";

export function EventForm({ event }: { event?: Event }) {
  const router = useRouter();
  const [name, setName] = useState(event?.name ?? "");
  const [eventDate, setEventDate] = useState(event?.eventDate ?? "");
  const [rsvpCount, setRsvpCount] = useState(event?.rsvpCount ?? 0);
  const [bufferMode, setBufferMode] = useState<BufferMode>(event?.bufferMode ?? "percentage");
  const [bufferValue, setBufferValue] = useState(event?.bufferValue ?? 20);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const headcount = effectiveHeadcount({ rsvpCount, bufferMode, bufferValue });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveEventAction(event?.id ?? null, {
      name,
      eventDate: eventDate || null,
      rsvpCount,
      bufferMode,
      bufferValue,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/events/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="name">
          Event name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2"
          placeholder="Fall Court of Honor"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="date">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="rsvp">
          RSVP count
        </label>
        <input
          id="rsvp"
          type="number"
          min={0}
          required
          value={rsvpCount}
          onChange={(e) => setRsvpCount(Number(e.target.value))}
          className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2"
        />
      </div>

      <div>
        <span className="block text-sm font-medium mb-1">
          Extra for people who don&apos;t RSVP but show up
        </span>
        <div className="flex gap-2">
          <select
            value={bufferMode}
            onChange={(e) => setBufferMode(e.target.value as BufferMode)}
            className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2"
          >
            <option value="percentage">Percentage</option>
            <option value="flat">Flat extra people</option>
          </select>
          <input
            type="number"
            min={0}
            step={bufferMode === "percentage" ? 1 : 1}
            value={bufferValue}
            onChange={(e) => setBufferValue(Number(e.target.value))}
            aria-label={bufferMode === "percentage" ? "Buffer percentage" : "Buffer headcount"}
            className="w-28 rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2"
          />
          <span className="self-center text-sm text-black/60 dark:text-white/60">
            {bufferMode === "percentage" ? "%" : "people"}
          </span>
        </div>
      </div>

      <p className="rounded-md bg-black/[.04] dark:bg-white/[.06] px-3 py-2 text-sm">
        Cooking for <span className="font-semibold">{headcount}</span> people
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : event ? "Save changes" : "Create event"}
        </button>
        <button
          type="button"
          onClick={() => router.push(event ? `/events/${event.id}` : "/")}
          className="rounded-md border border-black/20 dark:border-white/20 px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
