"use client";

import { useMemo } from "react";
import { parseIngredientLines } from "@/lib/ingredientParser";
import { formatScaledIngredientLine, scaleIngredient } from "@/lib/scale";

export function IngredientsField({
  id,
  label = "Ingredients (one per line)",
  value,
  onChange,
  minRows = 6,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
}) {
  const parsed = useMemo(() => parseIngredientLines(value.split("\n")), [value]);
  const needsReviewCount = parsed.filter((i) => i.needsReview).length;

  return (
    <div>
      <label className="block text-sm font-medium mb-1" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        rows={Math.max(minRows, value.split("\n").length + 1)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
        placeholder={"2 cups flour\n1 tsp salt"}
      />
      {needsReviewCount > 0 && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          {needsReviewCount} line{needsReviewCount === 1 ? "" : "s"} had no quantity found and
          won&apos;t be scaled automatically -- shown as-is when scaled.
        </p>
      )}
      {parsed.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-black/60 dark:text-white/60">
          {parsed.map((line, idx) => (
            <li key={idx} className={line.needsReview ? "text-amber-600 dark:text-amber-400" : undefined}>
              {line.isGroupHeader
                ? `— ${line.description} —`
                : line.needsReview
                  ? `⚠ "${line.raw}" (no quantity found)`
                  : // Reuse the canonical formatter (factor 1 = no actual
                    // scaling) so this preview always matches what actually
                    // gets saved, including a leading per-unit size like
                    // "10 (14.5 oz) cans ...".
                    `✓ ${formatScaledIngredientLine(scaleIngredient(line, 1))}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
