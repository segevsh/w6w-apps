import type { ActionDefinition } from "@w6w/types";
import { compact, LoftyClient } from "../lib/client.ts";

/**
 * `POST /v1.0/webhook` — register a webhook subscription.
 *
 * Answers `{ "subscribeId": <id> }`, the handle Delete Webhook takes.
 *
 * ## Singular here, plural on read
 *
 * Registration is `POST /v1.0/webhook` (singular); listing is
 * `GET /v1.0/webhooks` (plural); deleting is `DELETE /v1.0/webhook/{id}`
 * (singular again). Getting this wrong is a 404, not a silent mistake.
 *
 * ## `listId` is the event type
 *
 * The field is named `listId` but it selects what to be notified about — lead
 * created/updated/deleted, site activity, transactions, calls/emails/texts,
 * notes, tasks, appointments and more. Lofty's own Webhooks tag carries the
 * table of ids; the reference for this build does not reproduce it, so the
 * field is a plain number with a pointer rather than an invented option list.
 *
 * ## Not idempotent, and there is no key to make it so
 *
 * Nothing in the request body deduplicates a subscription, so a retried step
 * creates a second one — and a duplicate webhook is not a harmless duplicate:
 * every downstream notification is delivered twice, forever. `idempotent` is
 * therefore `false`, and the callback URL is worth reading back with List
 * Webhooks after a suspected retry.
 */
interface Input {
  listId: number;
  callbackUrl: string;
  limit?: number;
  permissionMode?: number;
}

const action: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a webhook subscription for one Lofty event type (POST /v1.0/webhook).",
  idempotent: false,
  params: [
    {
      key: "listId",
      label: "Event type ID",
      type: "number",
      required: true,
      hint:
        'Lofty\'s `listId` for the event to subscribe to. The ids are listed in the "Webhooks" ' +
        "section of Lofty's API reference.",
    },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/webhooks/lofty",
      hint: "Must be HTTPS and reachable from Lofty's backend.",
    },
    {
      key: "limit",
      label: "Batch size limit",
      type: "number",
      validation: { integer: true, min: 1, max: 5000 },
      hint: "Maximum events per callback batch. Lofty defaults to 100 and caps at 5000.",
    },
    {
      key: "permissionMode",
      label: "Recipient resolution",
      type: "select",
      default: 0,
      options: [
        { value: 0, label: "Assignment-based (default) — leads assigned to the subscriber" },
        { value: 1, label: "Ownership-based — also delivers leads the subscriber owns" },
      ],
      hint: "Which leads the callback fires for.",
    },
  ],
  output: [{ key: "subscribeId", type: "number", label: "Webhook subscription ID" }],

  execute(input, ctx) {
    const body = compact({
      listId: input.listId,
      callbackUrl: input.callbackUrl,
      limit: input.limit,
      permissionMode: input.permissionMode,
    });
    return new LoftyClient(ctx).request<{ subscribeId?: number }>("/webhook", {
      method: "POST",
      body,
    });
  },
};

export default action;
