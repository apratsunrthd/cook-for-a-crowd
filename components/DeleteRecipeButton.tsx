"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteRecipeAction } from "@/lib/actions/recipes";

export function DeleteRecipeButton({
  recipeId,
  redirectTo,
}: {
  recipeId: number;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-600 hover:underline"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      Delete this recipe?
      <button
        onClick={async () => {
          await deleteRecipeAction(recipeId);
          if (redirectTo) router.push(redirectTo);
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
