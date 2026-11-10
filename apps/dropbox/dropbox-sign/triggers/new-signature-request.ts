import type { TriggerDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";
import { pollWindow } from "../lib/window.ts";

interface SignatureRequest {
  signature_request_id?: unknown;
}

const DAY_MS = 86_400_000;
const PAGE_SIZE = 100;
/** Pages read per check; a larger window resumes at the saved page number on the next check. */
const MAX_PAGES = 5;
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Dropbox Sign's search grammar takes `created:[YYYY-MM-DD TO YYYY-MM-DD]` (inclusive days). Each
 * check searches yesterday through today (UTC) — a lookback that also covers the search index's
 * documented minor delay — and dedupes by `signature_request_id` through the kit. Each page is the action's own
 * `GET /signature_request/list` call; a window longer than five pages resumes at the saved page
 * number on the next check and the cursor advances only once it drains.
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
    return await pollWindow<SignatureRequest, number>({
      state,
      now,
      overlapMs: DAY_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: 1000,
      idOf: (item) => String(item.signature_request_id ?? ""),
      async load(since, page = 1) {
        const body = await new DropboxSignClient(ctx).request<{
          signature_requests?: SignatureRequest[];
          list_info?: { num_pages?: number };
        }>("/signature_request/list", {
          query: {
            query: `created:[${utcDay(since)} TO ${utcDay(now)}]`,
            page,
            page_size: PAGE_SIZE,
          },
        });
        const items = Array.isArray(body?.signature_requests) ? body.signature_requests : [];
        return {
          items,
          next: page < Number(body?.list_info?.num_pages ?? 1) ? page + 1 : undefined,
        };
      },
    });
  },
};

export default trigger;
