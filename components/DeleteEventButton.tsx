"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteEventAction } from "@/lib/actions/events";

export function DeleteEventButton({ eventId }: { eventId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-sm text-red-600 hover:underline">
        Delete event
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      Delete this event?
      <button
        onClick={async () => {
          await deleteEventAction(eventId);
          router.push("/");
          router.refresh();
        }}
        className="text-red-600 font-medium hover:underline"
      >
        Yes
      </button>
      <button onClick={() => setConfirming(false)} className="hover:underline">
        Cancel
      </button>
    </span>
  );
}
