import type { ActionDefinition } from "@w6w/types";
import { csv, json, SanityClient } from "../lib/client.ts";
import { mutate, QUERY_LIMIT_HINT } from "../lib/mutate.ts";
import { DATASET_PARAM, MUTATION_OPTION_PARAMS, REVISION_PARAM } from "../lib/params.ts";

/**
 * A `delete` mutation — by id, or by GROQ query.
 *
 * Deleting by id is safe to retry: Sanity treats a delete of something that is
 * already gone as a success. Deleting **by query** is a different operation
 * wearing the same name — it removes everything the query matches, the count is
 * unknown until afterwards, and it stops silently at 10,000 documents.
 *
 * So a query delete requires the confirmation flag, and a named list of ids
 * does not: naming ids is itself the statement of intent.
 *
 * ## `purge` is not the same as delete
 *
 * An ordinary delete leaves the document's history in the Content Lake, so it
 * can be inspected — and, within Sanity's retention window, recovered.
 * **`purge` removes every transaction ever recorded for that document,
 * immediately.** That is a compliance tool (an erasure request), not a tidier
 * delete, and it is what makes the deletion genuinely irreversible. It has its
 * own confirmation for that reason.
 *
 * ## Deleting a published document does not delete its draft
 *
 * They are separate documents. Deleting `article-1` leaves `drafts.article-1`
 * behind, where it will reappear in the Studio as an unpublished edit of a
 * document that no longer exists. **Also Delete Drafts** submits both in one
 * transaction, which is almost always what was meant.
 */
const action: ActionDefinition = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete documents",
  description:
    "Delete by id or by query. Deleting a published document leaves its draft behind — they " +
    "are separate documents — so this can remove both in one transaction.",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Document IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Deleting one that is already gone is not an error.",
    },
    {
      key: "query",
      label: "GROQ Query",
      type: "text",
      default: "",
      placeholder: '*[_type == "draftArticle" && _createdAt < $cutoff]',
      hint: `Delete everything the query matches. ${QUERY_LIMIT_HINT}`,
    },
    {
      key: "queryParams",
      label: "Query Parameters",
      type: "json",
      default: "",
      advanced: true,
    },
    {
      key: "alsoDeleteDrafts",
      label: "Also Delete Drafts",
      type: "boolean",
      default: true,
      hint: "For each id, also delete `drafts.<id>`. Off, an unpublished edit survives its own " +
        "published document.",
    },
    {
      key: "purge",
      label: "Purge History",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "⚠️ Removes every transaction ever recorded for these documents, immediately. A " +
        "compliance tool, not a tidier delete — it is what makes this unrecoverable.",
    },
    REVISION_PARAM,
    {
      key: "confirm",
      label: "Yes, delete these documents",
      type: "boolean",
      default: false,
      hint: "Required for a query delete (whose scope is unknown until afterwards) and for a " +
        "purge.",
    },
    ...MUTATION_OPTION_PARAMS,
    DATASET_PARAM,
  ],
  output: [
    { key: "transactionId", type: "string", label: "Transaction ID" },
    { key: "results", type: "array", label: "Results" },
    { key: "dryRun", type: "boolean", label: "Dry run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ids = csv(p.ids);
    const query = String(p.query ?? "").trim();
    if (ids && query) {
      throw new Error("give either `ids` or `query` — not both");
    }
    if (!ids && !query) throw new Error("one of `ids` or `query` is required");

    const purge = p.purge === true;
    if ((query || purge) && p.confirm !== true) {
      throw new Error(
        purge
          ? "refusing to purge without `confirm` — purging removes the documents' entire " +
            "transaction history immediately, which is what makes it unrecoverable"
          : "refusing a query delete without `confirm` — it cannot say how many documents it " +
            `will remove, and it stops silently at 10,000`,
      );
    }

    const revision = String(p.ifRevisionId ?? "").trim();
    if (revision && (query || (ids && ids.length > 1))) {
      throw new Error("`ifRevisionId` locks a single document, so it needs exactly one id");
    }

    const mutations: unknown[] = [];
    if (ids) {
      const targets = p.alsoDeleteDrafts === false
        ? ids
        // Two documents, one intent.
        : [...new Set(ids.flatMap((id) => [id, id.startsWith("drafts.") ? id : `drafts.${id}`]))];
      for (const id of targets) {
        mutations.push({
          delete: {
            id,
            ...(purge ? { purge: true } : {}),
            ...(revision ? { ifRevisionID: revision } : {}),
          },
        });
      }
    } else {
      const queryParams = json(p.queryParams, "queryParams");
      mutations.push({
        delete: {
          query,
          ...(queryParams ? { params: queryParams } : {}),
          ...(purge ? { purge: true } : {}),
        },
      });
    }

    const client = new SanityClient(ctx);
    const dataset = client.datasetFor(p.dataset);
    ctx.log(query || purge ? "warn" : "info", "deleting Sanity documents", {
      by: ids ? "ids" : "query",
      count: mutations.length,
      purge,
      dryRun: p.dryRun === true,
    });

    return await mutate(ctx, mutations, {
      dataset,
      dryRun: p.dryRun,
      returnDocuments: p.returnDocuments,
      visibility: p.visibility,
      transactionId: p.transactionId,
    });
  },
};

export default action;
