import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";

/**
 * `GET /public/v1/webhook-subscriptions` — the workspace's webhook
 * subscriptions.
 *
 * Note the response key: this endpoint answers `{ "items": [...] }`, not the
 * `{ "results": [...] }` every other collection in this app uses. That is
 * PandaDoc's own inconsistency, faithfully reflected here.
 *
 * **Read-only, deliberately.** PandaDoc also documents create / update / delete
 * for subscriptions and a `shared_key` rotation route. Those are not exposed as
 * Actions because a subscription is a *Trigger*'s business: creating one is
 * what `onSubscribe` is for, and an Action that registers a callback URL the
 * workflow engine did not mint leaves an orphan pointing at nothing. Listing
 * them, by contrast, is a genuine read — it is how you find out what is already
 * wired up, and what `shared_key` a verifier should be checking signatures
 * against.
 *
 * The documented trigger vocabulary a subscription can carry:
 * `recipient_completed`, `document_updated`, `document_deleted`,
 * `document_state_changed`, `document_creation_failed`,
 * `document_completed_pdf_ready`, `document_section_added`, `quote_updated`,
 * `template_created`, `template_updated`, `template_deleted`,
 * `content_library_item_created`, `content_library_item_creation_failed`.
 */
const webhookSubscriptionGetMany: ActionDefinition<Record<string, never>> = {
  key: "webhook-subscription-get-many",
  type: "search",
  resource: "webhook",
  title: "Get Many Webhook Subscriptions",
  description:
    "List the workspace's webhook subscriptions, with their URLs, trigger events, payload options and status.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Subscriptions (note: `items`, not `results`)" },
  ],

  async execute(_input, ctx) {
    return await new PandaDocClient(ctx).request("/webhook-subscriptions");
  },
};

export default webhookSubscriptionGetMany;
