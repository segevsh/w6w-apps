import type { ActionDefinition } from "@w6w/types";
import { DubClient, jsonValue } from "../lib/client.ts";

interface Input {
  links: unknown;
}

/** One entry of the response: a link, or `{ link, error, code }` for one that failed. */
interface Entry {
  error?: string;
  code?: string;
  link?: unknown;
}

/**
 * `POST /links/bulk` — up to 100 links in one call. The response is positional:
 * each entry is either the created link or a per-link error, and the call
 * itself still succeeds, so failures are split out rather than thrown.
 */
const linkBulkCreate: ActionDefinition<Input> = {
  key: "link-bulk-create",
  type: "perform",
  resource: "link",
  title: "Bulk Create Links",
  description:
    "Create up to 100 short links in one request. A link that fails is reported in `errors` while the rest are still created.",
  idempotent: false,
  params: [
    {
      key: "links",
      label: "Links",
      type: "json",
      required: true,
      hint:
        'Array of link objects, each with a required `url` and any of the Create Link fields, e.g. [{"url": "https://example.com", "key": "promo"}]. Maximum 100.',
    },
  ],
  output: [
    { key: "links", type: "array", label: "Links that were created" },
    { key: "errors", type: "array", label: "Entries that failed: { link, error, code }" },
  ],

  async execute(input, ctx) {
    const links = jsonValue(input.links);
    if (!Array.isArray(links) || links.length === 0) {
      throw new Error("`links` must be a non-empty JSON array of link objects.");
    }
    if (links.length > 100) throw new Error("Dub accepts at most 100 links per bulk request.");
    const entries = await new DubClient(ctx).request<Entry[]>("POST", "/links/bulk", {
      body: links,
    });
    const failed = (e: Entry) => typeof e?.error === "string" && "link" in e;
    return { links: entries.filter((e) => !failed(e)), errors: entries.filter(failed) };
  },
};

export default linkBulkCreate;
