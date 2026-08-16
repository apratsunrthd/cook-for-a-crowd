import Link from "next/link";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { getDb } from "@/lib/db";
import { listRecipes } from "@/lib/repo/recipes";

export default function RecipesPage() {
  const recipes = listRecipes(getDb());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recipes</h1>
        <Link
          href="/recipes/new"
          className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium"
        >
          New Recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          No recipes saved yet. Import one from a URL or add it by hand.
        </p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10 rounded-md border border-black/10 dark:border-white/10">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="flex items-center justify-between px-4 py-3">
              <Link href={`/recipes/${recipe.id}`} className="flex-1 hover:underline">
                <div className="font-medium">{recipe.name}</div>
                <div className="text-sm text-black/60 dark:text-white/60">
                  {recipe.servings ? `Serves ${recipe.servings}` : "No servings set"} &middot;{" "}
                  {recipe.ingredients.length} ingredients
                </div>
              </Link>
              <DeleteRecipeButton recipeId={recipe.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
