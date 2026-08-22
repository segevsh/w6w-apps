import type { ActionDefinition } from "@w6w/types";
import { SanityClient } from "../lib/client.ts";
import { DATASET_PARAM } from "../lib/params.ts";

/**
 * `POST /data/actions/{dataset}` with `sanity.action.document.publish` —
 * promote a draft to published.
 *
 * ## Why an Action and not two mutations
 *
 * Publishing in Sanity's document model means copying `drafts.article-1` onto
 * `article-1` and then deleting the draft. That can be hand-rolled as a
 * `createOrReplace` plus a `delete` in one transaction — and integrations do,
 * and it is subtly wrong: it loses the `_rev` check, it does not respect
 * document-level release scheduling, and it reimplements semantics Sanity owns.
 *
 * The Actions API expresses the intent directly, which is both safer and the
 * thing Sanity will keep working as its publishing model grows.
 *
 * ## What it does not do
 *
 * It does not validate against the Studio's schema. Sanity's schema lives in
 * the Studio, not in the Content Lake, so a document published through the API
 * can be one the Studio would have refused — missing required fields and all.
 * Anything that matters should be checked before this call, not after.
 *
 * Publishing a document with no draft is an error, not a no-op: there is
 * nothing to promote.
 */
const action: ActionDefinition = {
  key: "document-publish",
  type: "perform",
  resource: "document",
  title: "Publish document",
  description:
    "Promote a draft to published through Sanity's Actions API — which owns the semantics, " +
    "rather than hand-rolling a replace-plus-delete. The Studio's schema is not enforced here.",
  idempotent: true,
  params: [
    {
      key: "publishedId",
      label: "Published Document ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "article-1",
      hint: "The id WITHOUT the `drafts.` prefix — Sanity derives the draft from it.",
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
      throw new Error(
        "`publishedId` is the id WITHOUT the `drafts.` prefix — Sanity derives the draft from " +
          `it (you passed "${publishedId}")`,
      );
    }

    const client = new SanityClient(ctx);
    const dataset = client.datasetFor(p.dataset);
    ctx.log("info", "publishing a Sanity document", { publishedId, dataset });

    const body = await client.request<{ transactionId?: string }>(
      `/data/actions/${encodeURIComponent(dataset)}`,
      {
        method: "POST",
        // The Actions API is a write; the CDN rejects it.
        live: true,
        body: {
          actions: [{
            actionType: "sanity.action.document.publish",
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
