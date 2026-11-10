import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import signatureRequestList from "../actions/signature-request-list.ts";

interface SignatureRequest {
  signature_request_id?: unknown;
}

const DAY_MS = 86_400_000;
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Dropbox Sign's search grammar takes `created:[YYYY-MM-DD TO YYYY-MM-DD]` (inclusive days). Each
 * check searches yesterday through today (UTC) — a lookback that also covers the search index's
 * documented minor delay — and dedupes by `signature_request_id` through the kit.
 */
const trigger: TriggerDefinition = {
  key: "new-signature-request",
  title: "New Signature Request",
  description: "The run gets each signature request newly created in the Dropbox Sign account.",
  output: [
    { key: "signature_request_id", type: "string", label: "Signature request ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
    { key: "is_complete", type: "boolean", label: "Is complete" },
    { key: "signatures", type: "array", label: "Signatures" },
  ],
  sample: {
    signature_request_id: "fa5c8a0b0f492d768749333ad6fcc214c111e967",
    title: "NDA",
    created_at: 1794268800,
    is_complete: false,
    signatures: [],
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const now = Date.now();
    const query = `created:[${utcDay(now - DAY_MS)} TO ${utcDay(now)}]`;
    return await pollNewItems<SignatureRequest>({
      state,
      maxPages: 1,
      maxEvents: 100,
      seenWindow: 1000,
      idOf: (item) => String(item.signature_request_id ?? ""),
      async fetchPage() {
        const items = await signatureRequestList.execute!({ query, limit: 500 }, ctx);
        return { items: Array.isArray(items) ? items as SignatureRequest[] : [] };
      },
    });
  },
};

export default trigger;
