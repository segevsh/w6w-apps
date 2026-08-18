import type { ActionDefinition } from "@w6w/types";
import { SanityClient } from "../lib/client.ts";
import { DATASET_PARAM } from "../lib/params.ts";

/**
 * `POST /data/actions/{dataset}` with `sanity.action.document.unpublish` —
 * take a document off the published site without losing it.
 *
 * The important distinction: unpublishing **turns the published document back
 * into a draft**. The content survives, editable in the Studio, and can be
 * published again. Deleting removes it.
 *
 * That makes this the right action for "take this down" — a product pulled from
 * sale, an article retracted — where a delete would be both destructive and
 * unrecoverable if paired with a purge.
 *
 * Anything reading through the CDN may keep serving the document for a short
 * while afterwards, since a cached response outlives the change that
 * invalidates it.
 */
const action: ActionDefinition = {
  key: "document-unpublish",
  type: "perform",
  resource: "document",
  title: "Unpublish document",
  description:
    "Take a document off the published dataset, turning it back into a draft. The content " +
    "survives and can be published again — unlike a delete.",
  idempotent: true,
  params: [
    {
      key: "publishedId",
      label: "Published Document ID",
      type: "string",
      required: true,
      default: "",
      hint: "The id WITHOUT the `drafts.` prefix.",
    },
    DATASET_PARAM,
  ],
  output: [
    { key: "transactionId", type: "string", label: "Transaction ID" },
    { key: "publishedId", type: "string", label: "Published ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const publishedId = String(p.publishedId ?? "").trim();
    if (!publishedId) throw new Error("`publishedId` is required");
    if (publishedId.startsWith("drafts.")) {
      throw new Error("`publishedId` is the id WITHOUT the `drafts.` prefix");
    }

    const client = new SanityClient(ctx);
    const dataset = client.datasetFor(p.dataset);
    ctx.log("info", "unpublishing a Sanity document", { publishedId, dataset });

    const body = await client.request<{ transactionId?: string }>(
      `/data/actions/${encodeURIComponent(dataset)}`,
      {
        method: "POST",
        live: true,
        body: {
          actions: [{
            actionType: "sanity.action.document.unpublish",
            draftId: `drafts.${publishedId}`,
            publishedId,
          }],
        },
      },
    );
    return { ...body, publishedId };
  },
};

export default action;
