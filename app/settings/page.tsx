import { SettingsForm } from "@/components/SettingsForm";
import { anthropicApiKeySource, getAnthropicApiKey, maskApiKey } from "@/lib/settings";

export default function SettingsPage() {
  const source = anthropicApiKeySource();
  const currentKey = getAnthropicApiKey();
  const masked = currentKey ? maskApiKey(currentKey) : null;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Configuration that applies across every event and recipe.
        </p>
      </div>

      <SettingsForm source={source} masked={masked} />
    </div>
  );
}
