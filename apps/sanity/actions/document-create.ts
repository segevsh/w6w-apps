import type { ActionDefinition } from "@w6w/types";
import { json, SanityClient } from "../lib/client.ts";
import { mutate } from "../lib/mutate.ts";
import { DATASET_PARAM, MUTATION_OPTION_PARAMS } from "../lib/params.ts";

/**
 * A `create` mutation — with the three creation modes Sanity distinguishes and
 * most integrations conflate.
 *
 *   - **`create`** fails if the id already exists. The right one when a
 *     duplicate means something went wrong.
 *   - **`createIfNotExists`** silently does nothing if it exists. The right one
 *     for an idempotent import that may re-run.
 *   - **`createOrReplace`** overwrites the whole document — *not* a merge. Any
 *     field absent from what you send is **gone**, which makes it the fastest
 *     way to lose data if it is picked because the name sounded safe.
 *
 * Because they differ exactly in retry behaviour, this action declares itself
 * non-idempotent: only two of the three are, and it is one action.
 *
 * ## `_id` and `_type`
 *
 * `_type` is required — Sanity is schemaless at the API and the type is what
 * makes a document findable by any query. `_id` is optional, and its rules are
 * unusual: omitted, Sanity generates one; **ending in a dot**, it is used as a
 * prefix for a generated one (`article.` → `article.abc123`), which is how you
 * get grouped-but-unique ids.
 */
const action: ActionDefinition = {
  key: "document-create",
  type: "perform",
  resource: "document",
  title: "Create document",
  description:
    "Create a document, with Sanity's three modes: fail if it exists, skip if it exists, or " +
    "replace it wholesale. Replace is not a merge — omitted fields are deleted.",
  idempotent: false,
  params: [
    {
      key: "mode",
      label: "Mode",
      type: "select",
      required: true,
      default: "createIfNotExists",
      options: [
        { value: "create", label: "create — fail if the id already exists" },
        { value: "createIfNotExists", label: "createIfNotExists — skip if it exists" },
        { value: "createOrReplace", label: "createOrReplace — REPLACE it entirely" },
      ],
      hint: "Replace overwrites the whole document: any field you do not send is deleted. Use " +
        "Patch to change part of one.",
    },
    {
      key: "document",
      label: "Document",
      type: "json",
      required: true,
      default: "",
      hint: "Must include `_type`. `_id` is optional — omit it for a generated id, or end it " +
        'with a dot (`"article."`) to use it as a prefix for one.',
    },
    ...MUTATION_OPTION_PARAMS,
    DATASET_PARAM,
  ],
  output: [
    { key: "transactionId", type: "string", label: "Transaction ID" },
    { key: "results", type: "array", label: "Results" },
    { key: "documents", type: "array", label: "Documents" },
    { key: "dryRun", type: "boolean", label: "Dry run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const mode = String(p.mode ?? "createIfNotExists");
    if (!["create", "createIfNotExists", "createOrReplace"].includes(mode)) {
      throw new Error(`\`mode\` must be create, createIfNotExists or createOrReplace; got ${mode}`);
    }
    const document = json(p.document, "document");
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      throw new Error("`document` must be an object");
    }
    if (!(document as Record<string, unknown>)._type) {
      throw new Error(
        "`document._type` is required — it is what makes the document findable by any query",
      );
    }
    if (mode === "createOrReplace" && !(document as Record<string, unknown>)._id) {
      throw new Error(
        "`createOrReplace` needs an `_id` — without one there is nothing to replace, and a " +
          "generated id would make this an ordinary create",
      );
    }

    const client = new SanityClient(ctx);
    const dataset = client.datasetFor(p.dataset);
    ctx.log("info", "creating a Sanity document", { mode, dataset, dryRun: p.dryRun === true });

    return await mutate(ctx, [{ [mode]: document }], {
      dataset,
      dryRun: p.dryRun,
      returnDocuments: p.returnDocuments,
      visibility: p.visibility,
      transactionId: p.transactionId,
    });
  },
};

export default action;
