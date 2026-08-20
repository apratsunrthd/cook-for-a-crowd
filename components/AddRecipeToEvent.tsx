"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { attachRecipeAction } from "@/lib/actions/events";
import type { Course } from "@/lib/types";

export function AddRecipeToEvent({
  eventId,
  defaultHeadcount,
  availableRecipes,
}: {
  eventId: number;
  defaultHeadcount: number;
  availableRecipes: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(availableRecipes[0]?.id.toString() ?? "");
  const [course, setCourse] = useState<Course>("main");
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      {availableRecipes.length > 0 && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selected) return;
            setAdding(true);
            await attachRecipeAction(eventId, Number(selected), course, defaultHeadcount);
            setAdding(false);
            router.refresh();
          }}
          className="flex items-center gap-2"
        >
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Recipe to add from library"
            className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          >
            {availableRecipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name}
              </option>
            ))}
          </select>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value as Course)}
            aria-label="Course"
            className="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          >
            <option value="main">Main</option>
            <option value="side">Side</option>
            <option value="dessert">Dessert</option>
          </select>
          <button
            type="submit"
            disabled={adding}
            className="rounded-md border border-black/20 dark:border-white/20 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add from library"}
          </button>
        </form>
      )}
      <Link
        href={`/recipes/new?eventId=${eventId}`}
        className="text-sm underline text-black/70 dark:text-white/70"
      >
        Import a new recipe
      </Link>
    </div>
  );
}
