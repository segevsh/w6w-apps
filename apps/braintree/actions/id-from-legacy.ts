import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient } from "../lib/client.ts";

interface Input {
  legacyIds: unknown;
  type: string;
}

const TYPES = [
  "CUSTOMER",
  "DISPUTE",
  "PAYMENT_METHOD",
  "REFUND",
  "TRANSACTION",
  "US_BANK_ACCOUNT_VERIFICATION",
];

/** `idsFromLegacyIds` — GraphQL ids for ids that came from the Control Panel, a webhook or an SDK. */
const idFromLegacy: ActionDefinition<Input> = {
  key: "id-from-legacy",
  type: "read",
  resource: "id",
  title: "Convert Legacy IDs",
  description:
    "Convert legacy ids (Control Panel, SDK, webhooks) of one type to the GraphQL ids every other action expects. Existence is not checked, except for payment methods.",
  params: [
    {
      key: "legacyIds",
      label: "Legacy IDs",
      type: "json",
      required: true,
      hint: "A JSON array of strings, or comma-separated text. 1 to 50 ids, all the same type.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: TYPES.map((t) => ({ value: t, label: t })),
    },
  ],
  output: [
    { key: "ids", type: "array", label: "GraphQL ids, in the order given" },
    { key: "pairs", type: "array", label: "[{ legacyId, id }]" },
  ],

  async execute(input, ctx) {
    let raw = input.legacyIds;
    if (typeof raw === "string") {
      const t = raw.trim();
      try {
        raw = t.startsWith("[") ? JSON.parse(t) : t.split(",");
      } catch {
        raw = t.split(",");
      }
    }
    const legacyIds = (Array.isArray(raw) ? raw : []).map((s) => String(s).trim()).filter(Boolean);
    if (legacyIds.length < 1 || legacyIds.length > 50) {
      throw new Error("legacyIds must contain between 1 and 50 ids");
    }
    const data = await new BraintreeClient(ctx).execute<{ idsFromLegacyIds?: string[] }>(
      `query Ids($input: IdsFromLegacyIdsInput!) { idsFromLegacyIds(input: $input) }`,
      { input: { ids: legacyIds.map((legacyId) => ({ legacyId, type: input.type })) } },
    );
    const ids = data.idsFromLegacyIds ?? [];
    return { ids, pairs: legacyIds.map((legacyId, i) => ({ legacyId, id: ids[i] ?? null })) };
  },
};

export default idFromLegacy;
