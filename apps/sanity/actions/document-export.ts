import type { ActionDefinition } from "@w6w/types";
import { csv, SanityClient } from "../lib/client.ts";
import { DATASET_PARAM } from "../lib/params.ts";

/**
 * `GET /data/export/{dataset}` — the whole dataset, as NDJSON.
 *
 * One JSON document per line, no enclosing array — so parsing the body as JSON
 * fails on the second line, and the client reads it line by line.
 *
 * This is a bulk read, not a query: no filtering beyond a document-type list,
 * no projection, everything or nothing. It is the right tool for a backup, a
 * migration or feeding a search index, and the wrong one for "find me the
 * published articles", which is one small `document-query` instead of a whole
 * dataset over the wire.
 *
 * **It includes drafts.** Every `drafts.`-prefixed document comes along, which
 * is correct for a backup and surprising for anything that treats the output as
 * "the content".
 */
const action: ActionDefinition = {
  key: "document-export",
  type: "read",
  resource: "document",
  title: "Export dataset",
  description:
    "Every document in a dataset as NDJSON — drafts included. A backup and migration tool, not " +
    "a way to answer a question.",
  params: [
    {
      key: "types",
      label: "Document Types",
      type: "string",
      default: "",
      placeholder: "article,author",
      hint: "Comma-separated `_type` values. Empty exports everything, which on a real dataset " +
        "is a lot.",
    },
    {
      key: "excludeDrafts",
      label: "Exclude Drafts",
      type: "boolean",
      default: false,
      hint: "Sanity's export includes every `drafts.` document. Filtering them out here is " +
        "right for anything treating the result as published content.",
    },
    DATASET_PARAM,
  ],
  output: [
    { key: "documents", type: "array", label: "Documents" },
    { key: "count", type: "number", label: "Documents exported" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new SanityClient(ctx);
    const dataset = client.datasetFor(p.dataset);
    const types = csv(p.types);

    ctx.log("info", "exporting a Sanity dataset", { dataset, types });

    // NDJSON, not JSON — one document per line.
    let documents = await client.requestNdjson(
      `/data/export/${encodeURIComponent(dataset)}`,
      { live: true, query: { types: types?.join(",") } },
    );
    if (p.excludeDrafts === true) {
      documents = documents.filter((d) =>
        !String((d as { _id?: unknown })?._id ?? "").startsWith("drafts.")
      );
    }
    return { documents, count: documents.length };
  },
};

export default action;
