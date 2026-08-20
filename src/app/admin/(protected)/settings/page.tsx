import { getStoreSettings } from "@/lib/settings/settings.server";
import { getStripeHealthStatus } from "@/lib/integrations/stripe-status.server";
import { SettingsClient } from "@/components/admin/settings/SettingsClient";

export default async function AdminSettingsPage() {
  const [settings, stripeStatus] = await Promise.all([
    getStoreSettings(),
    getStripeHealthStatus(),
  ]);

  return <SettingsClient initialSettings={settings} stripeStatus={stripeStatus} />;
}
