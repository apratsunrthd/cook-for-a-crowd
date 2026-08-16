import { notFound } from "next/navigation";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { RecipeEditor } from "@/components/RecipeEditor";
import { getDb } from "@/lib/db";
import { getRecipe } from "@/lib/repo/recipes";

export default async function RecipeDetailPage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const recipe = getRecipe(getDb(), Number(id));
  if (!recipe) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{recipe.name}</h1>
        <DeleteRecipeButton recipeId={recipe.id} redirectTo="/recipes" />
      </div>
      <RecipeEditor recipeId={recipe.id} initialDraft={recipe} />
    </div>
  );
}
