import { pollFromListAction } from "../../_shared/poll/mod.ts";
import subscriptionList from "../actions/subscription-list.ts";

/**
 * Newest-first poll over `subscription-list` (`GET /api/subscriptions`). Lusha documents the order
 * ("Results are sorted by `createdAt` in descending order (newest first)") and the paging
 * ("Default limit: 10, max limit: 100", `offset`) at
 * https://docs.lusha.com/api-reference/webhooks/list-subscriptions.md (verified 2026-11-10), so
 * `limit=100&offset=0` is the newest 100 subscriptions. The subscriptions this app's own signal
 * triggers register show up here too.
 */
export default pollFromListAction({
  key: "new-subscription",
  title: "New Webhook Subscription",
  description:
    "Checks the Lusha account for signal webhook subscriptions created since the last check, by this app's triggers or by anything else using the account. The run gets each new subscription (entity, signal types, callback URL, active flag). Does not spend credits.",
  action: subscriptionList,
  input: () => ({ limit: 100, offset: 0 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (s) => String((s as { id: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "entityType", type: "string", label: "Entity type (contact or company)" },
    { key: "entityId", type: "string", label: "Entity ID" },
    { key: "signalTypes", type: "array", label: "Signal types" },
    { key: "url", type: "string", label: "Callback URL" },
    { key: "name", type: "string", label: "Name" },
    { key: "isActive", type: "boolean", label: "Active" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "507f1f77bcf86cd799439011",
    entityType: "contact",
    entityId: "123456",
    signalTypes: ["promotion", "companyChange"],
    url: "https://example.com/webhook",
    name: "My Contact Webhook",
    isActive: true,
    createdAt: "2026-01-14T10:00:00.000Z",
  },
});
