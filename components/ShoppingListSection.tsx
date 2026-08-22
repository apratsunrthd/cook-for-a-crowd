import { Suspense } from "react";
import { suggestPurchaseQuantities } from "@/lib/shoppingPurchaseAI";
import type { ShoppingListItem } from "@/lib/types";
import { ShoppingList } from "./ShoppingList";

interface ShoppingListSectionProps {
  items: ShoppingListItem[];
  eventName: string;
  eventId: number;
  /** Omit on the print page itself -- no point linking to itself. */
  showPrintLink?: boolean;
}

async function ShoppingListWithSuggestions({ items, eventName, eventId, showPrintLink }: ShoppingListSectionProps) {
  const suggestions = await suggestPurchaseQuantities(items);
  return (
    <ShoppingList
      items={items}
      eventName={eventName}
      eventId={eventId}
      showPrintLink={showPrintLink}
      purchaseSuggestions={Object.fromEntries(suggestions)}
    />
  );
}

/**
 * Renders the shopping list right away with no AI purchase suggestions,
 * then swaps in the AI-suggested realistic purchase quantities (see
 * shoppingPurchaseAI.ts) once that batched call resolves -- the list
 * itself is never blocked or hidden waiting on it, and works fine with no
 * API key configured at all.
 */
export function ShoppingListSection(props: ShoppingListSectionProps) {
  return (
    <Suspense fallback={<ShoppingList {...props} />}>
      <ShoppingListWithSuggestions {...props} />
    </Suspense>
  );
}
