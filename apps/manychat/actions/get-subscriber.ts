import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatSubscriber } from "../lib/client.ts";

interface Input {
  subscriberId: string;
}

/**
 * Read one subscriber in full.
 *
 * `GET /fb/subscriber/getInfo?subscriber_id=…` → `{ status, data: Subscriber }`.
 *
 * The `Subscriber` payload is the richest object in the API and is the reason
 * this app exists: it carries identity across **every channel on one record** —
 * Messenger (`id`, `profile_pic`, `locale`), Instagram (`ig_id`, `ig_username`),
 * WhatsApp (`whatsapp_phone`, `whatsapp_bsuid`, `whatsapp_username`,
 * `optin_whatsapp`), email and SMS (`email`/`optin_email`, `phone`/`optin_phone`)
 * — plus `tags[]` and `custom_fields[]` with their values inlined.
 *
 * Two fields carry more weight than they look:
 *
 *   - **`last_interaction`** — the clock Meta's messaging window runs against.
 *     If it is more than 24 hours ago, an untagged `send-content` to this person
 *     will be refused. It is also the only nullable field in the schema.
 *   - **`live_chat_url`** — a direct deep link into Manychat's Inbox for this
 *     conversation. Useful as the "open in Manychat" link on a support handoff.
 *
 * ## Why `subscriberId` is a string
 *
 * The spec types `subscriber_id` as `integer` in every request body, but types
 * `Subscriber.id` and `Subscriber.page_id` as **`string`** in the response. That
 * is not sloppiness: these are Meta-scale ids that exceed JavaScript's safe
 * integer range, and round-tripping one through a JS `number` silently corrupts
 * the low digits. So this action takes a string and puts it on the query string
 * unparsed — the wire format is text either way, and `Number()` here would be a
 * lossy step with nothing to gain.
 */
const getSubscriber: ActionDefinition<Input> = {
  key: "get-subscriber",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber",
  description:
    "Read one subscriber in full (GET /fb/subscriber/getInfo) — cross-channel identity, tags, " +
    "custom field values, opt-in flags, and `last_interaction` (the 24-hour-window clock).",
  params: [
    {
      key: "subscriberId",
      label: "Subscriber ID",
      type: "string",
      required: true,
      hint: "Kept as text on purpose — these ids exceed JavaScript's safe integer range.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "Subscriber" },
  ],

  execute(input, ctx) {
    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatSubscriber>>(
      "/fb/subscriber/getInfo",
      { subscriber_id: input.subscriberId },
    );
  },
};

export default getSubscriber;
