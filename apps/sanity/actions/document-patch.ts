import type { ActionDefinition } from "@w6w/types";
import { csv, json, SanityClient } from "../lib/client.ts";
import { mutate, QUERY_LIMIT_HINT } from "../lib/mutate.ts";
import { DATASET_PARAM, MUTATION_OPTION_PARAMS, REVISION_PARAM } from "../lib/params.ts";

/**
 * A `patch` mutation — change part of a document without replacing it.
 *
 * ## The operations run in a fixed order, whatever order you write them
 *
 * Sanity applies them as: **set → setIfMissing → unset → inc → dec → insert**.
 * That matters when they interact: a `setIfMissing` cannot see a value that a
 * `set` in the same patch is about to write, and an `unset` of a field that
 * `inc` then increments leaves the field created afresh at the increment.
 *
 * ## By id, or by query — and one of those has a silent ceiling
 *
 * A patch can name an `id` or a GROQ `query`, and the query form updates
 * everything it matches. It also stops silently at 10,000 documents: Sanity
 * executes `*[_type == "article"]` as `*[_type == "article"][0..10000]` with no
 * error and no indication that the rest were left alone. Anything larger has to
 * be paginated by `_id`.
 *
 * A dry run is worth its cost before a query patch, since Sanity supports one
 * natively and it is the only way to see the blast radius first.
 *
 * ## Why this is not idempotent
 *
 * `set` and `unset` are; `inc` and `dec` are not. A retried patch carrying an
 * `inc` counts twice. Since one action carries both, it declares the weaker
 * property — and `ifRevisionId` is the way to make a retry safe when it matters.
 */
const action: ActionDefinition = {
  key: "document-patch",
  type: "perform",
  resource: "document",
  title: "Patch document",
  description:
    "Change part of a document, by id or by query. Operations run set → setIfMissing → unset → " +
    "inc → dec → insert, whatever order you write them in.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Document ID",
      type: "string",
      default: "",
      hint: "The document to patch. Alternative to a query.",
    },
    {
      key: "query",
      label: "GROQ Query",
      type: "text",
      default: "",
      placeholder: '*[_type == "article" && !defined(slug)]',
      hint: `Patch everything the query matches. ${QUERY_LIMIT_HINT}`,
    },
    {
      key: "queryParams",
      label: "Query Parameters",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Object of `$`-parameters for the query, e.g. `{"threshold":100}`.',
    },
    {
      key: "set",
      label: "Set",
      type: "json",
      default: "",
      hint: 'Fields to overwrite, e.g. `{"title":"New title"}`.',
    },
    {
      key: "setIfMissing",
      label: "Set If Missing",
      type: "json",
      default: "",
      hint: "Fields to write only where they do not already exist.",
    },
    {
      key: "unset",
      label: "Unset",
      type: "string",
      default: "",
      hint: "Comma-separated field paths to remove.",
    },
    {
      key: "inc",
      label: "Increment",
      type: "json",
      default: "",
      advanced: true,
      hint: '`{"viewCount":1}`. This is what makes a retried patch count twice — pair it with ' +
        "If Revision ID when that matters.",
    },
    {
      key: "dec",
      label: "Decrement",
      type: "json",
      default: "",
      advanced: true,
    },
    REVISION_PARAM,
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
    const id = String(p.id ?? "").trim();
    const query = String(p.query ?? "").trim();
    if (id && query) {
      throw new Error("give either `id` or `query` — Sanity's patch takes one target");
    }
    if (!id && !query) throw new Error("one of `id` or `query` is required");

    const patch: Record<string, unknown> = id ? { id } : { query };
    const queryParams = json(p.queryParams, "queryParams");
    if (query && queryParams) patch.params = queryParams;

    const set = json(p.set, "set");
    const setIfMissing = json(p.setIfMissing, "setIfMissing");
    const unset = csv(p.unset);
    const inc = json(p.inc, "inc");
    const dec = json(p.dec, "dec");
    if (set) patch.set = set;
    if (setIfMissing) patch.setIfMissing = setIfMissing;
    if (unset) patch.unset = unset;
    if (inc) patch.inc = inc;
    if (dec) patch.dec = dec;

    const operations = ["set", "setIfMissing", "unset", "inc", "dec"].filter((k) => k in patch);
    if (operations.length === 0) {
      throw new Error(
        "nothing to change — give at least one of set, setIfMissing, unset, inc, dec",
      );
    }

    const revision = String(p.ifRevisionId ?? "").trim();
    if (revision) {
      if (query) {
        throw new Error(
          "`ifRevisionId` locks a single document, so it cannot be combined with a query patch",
        );
      }
      patch.ifRevisionID = revision;
    }

    const client = new SanityClient(ctx);
    const dataset = client.datasetFor(p.dataset);
    ctx.log(query ? "warn" : "info", "patching Sanity documents", {
      by: id ? "id" : "query",
      operations,
      dryRun: p.dryRun === true,
    });

    return await mutate(ctx, [{ patch }], {
      dataset,
      dryRun: p.dryRun,
      returnDocuments: p.returnDocuments,
      visibility: p.visibility,
      transactionId: p.transactionId,
    });
  },
};

export default action;
