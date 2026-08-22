import type { ActionDefinition } from "@w6w/types";
import { SanityClient } from "../lib/client.ts";
import { DATASET_PARAM } from "../lib/params.ts";

/**
 * `GET /data/history/{dataset}/documents/{id}` — what a document used to be.
 *
 * The Content Lake keeps every transaction, so a document can be read *as of* a
 * moment or a revision. That is what makes "what changed and who changed it"
 * answerable — and what a `purge` on delete destroys.
 *
 * Two ways to ask, and they answer different questions: a **time** gives the
 * document as it stood then; a **revision** gives the exact version a `_rev`
 * identified, which is how a workflow can recover the value it was looking at
 * before somebody else's write landed.
 *
 * History is bounded by the plan's retention window, so a document older than
 * that window returns its earliest retained state rather than its original one.
 */
const action: ActionDefinition = {
  key: "document-history",
  type: "read",
  resource: "document",
  title: "Get document history",
  description:
    "A document as it stood at a moment or a revision — the answer to 'what did this say " +
    "before', within the plan's retention window.",
  params: [
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "time",
      label: "As Of",
      type: "datetime",
      default: "",
      hint: "The document as it stood at this moment. Alternative to a revision.",
    },
    {
      key: "revision",
      label: "Revision",
      type: "string",
      default: "",
      hint: "A specific `_rev`. Alternative to a time.",
    },
    DATASET_PARAM,
  ],
  output: [
    { key: "documents", type: "array", label: "Documents" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");
    const time = String(p.time ?? "").trim();
    const revision = String(p.revision ?? "").trim();
    if (time && revision) {
      throw new Error("give either `time` or `revision` — they answer different questions");
    }

    const client = new SanityClient(ctx);
    const dataset = client.datasetFor(p.dataset);
    return await client.request(
      `/data/history/${encodeURIComponent(dataset)}/documents/${encodeURIComponent(id)}`,
      { query: { time: time || undefined, revision: revision || undefined } },
    );
  },
};

export default action;
