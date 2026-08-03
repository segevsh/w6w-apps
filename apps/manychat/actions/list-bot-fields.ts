import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatValuedField } from "../lib/client.ts";

/**
 * Every **bot field** on the Page, with its current value.
 *
 * `GET /fb/page/getBotFields` → `{ status, data: [{ id, name, type, description,
 * value }] }`.
 *
 * A bot field is Page-global state: one name, one value, shared by every
 * subscriber and every automation — a feature flag, a current promo code, a stock
 * count. That is what distinguishes it from a *custom field*, which has a
 * separate value per subscriber. The two have identical schemas and adjacent
 * endpoints, so the distinction is easy to lose; README.md spells it out.
 *
 * Unlike `getCustomFields`, this listing **includes values**, because there is
 * only one of each to include. That makes it the closest thing Manychat has to a
 * key-value read, and the reason it is worth a `read` action rather than being
 * folded into a lookup.
 */
const listBotFields: ActionDefinition<Record<string, never>> = {
  key: "list-bot-fields",
  type: "read",
  resource: "bot-field",
  title: "List Bot Fields",
  description: "Every Page-global bot field WITH its current value (GET /fb/page/getBotFields) — " +
    "`{ id, name, type, description, value }`. One value per Page, not per subscriber.",
  params: [],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "array", label: "Bot fields" },
  ],

  execute(_input, ctx) {
    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatValuedField[]>>(
      "/fb/page/getBotFields",
    );
  },
};

export default listBotFields;
