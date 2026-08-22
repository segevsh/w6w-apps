import type { ActionDefinition } from "@w6w/types";
import { csv, SanityClient } from "../lib/client.ts";
import { DATASET_PARAM } from "../lib/params.ts";

/**
 * `GET /data/doc/{dataset}/{id}` — fetch documents by id, without GROQ.
 *
 * The direct read. It takes a comma-separated list of ids in one call, which is
 * both cheaper and clearer than a query when the ids are already known.
 *
 * The `_rev` it returns is the value a later patch or delete can pass as its
 * revision lock, so this is the read half of a safe read-then-write — the same
 * shape as Gusto's `version` in this pack, except that Sanity leaves the lock
 * optional.
 *
 * Asking for a published id returns only the published document. To see whether
 * an unpublished edit exists, ask for `drafts.<id>` as well — they are two
 * documents, and this action will happily fetch both in one call.
 */
const action: ActionDefinition = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get documents by ID",
  description:
    "Fetch one or more documents directly by id — cheaper than a query when the ids are known. " +
    "Ask for `drafts.<id>` too if you want to see the unpublished edit.",
  params: [
    {
      key: "ids",
      label: "Document IDs",
      type: "string",
      required: true,
      default: "",
      placeholder: "article-1,drafts.article-1",
      hint: "Comma-separated. A draft is a separate document whose id is the published id with " +
        "a `drafts.` prefix.",
    },
    DATASET_PARAM,
  ],
  output: [
    { key: "documents", type: "array", label: "Documents" },
    { key: "omitted", type: "array", label: "Omitted (missing or not permitted)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ids = csv(p.ids);
    if (!ids) throw new Error("`ids` is required");

    const client = new SanityClient(ctx);
    const dataset = client.datasetFor(p.dataset);
    return await client.request(
      `/data/doc/${encodeURIComponent(dataset)}/${ids.map(encodeURIComponent).join(",")}`,
    );
  },
};

export default action;
