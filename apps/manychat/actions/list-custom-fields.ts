import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatCustomField, type ManychatEnvelope } from "../lib/client.ts";

/**
 * Every **subscriber** custom-field *definition* on the Page.
 *
 * `GET /fb/page/getCustomFields` → `{ status, data: [{ id, name, type,
 * description }] }`. Definitions only — no values, because a definition belongs
 * to the Page and a value belongs to a subscriber. To read one subscriber's
 * values, use `get-subscriber`, whose `Subscriber` payload carries
 * `custom_fields[]` with a `value` on each.
 *
 * Do not confuse these with **bot fields** (`list-bot-fields`): custom fields are
 * per-subscriber, bot fields are one global value each for the whole Page. They
 * have identical schemas, live under the same `/fb/page/` prefix, and are
 * unrelated in meaning — see README.md "Fields come in two flavours".
 */
const listCustomFields: ActionDefinition<Record<string, never>> = {
  key: "list-custom-fields",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description:
    "Every subscriber custom-field definition on the Page (GET /fb/page/getCustomFields) — " +
    "`{ id, name, type, description }`. Definitions only; values live on the subscriber.",
  params: [],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "array", label: "Custom fields" },
  ],

  execute(_input, ctx) {
    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatCustomField[]>>(
      "/fb/page/getCustomFields",
    );
  },
};

export default listCustomFields;
