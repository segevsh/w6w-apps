import type { ActionDefinition } from "@w6w/types";
import { json, TypesenseClient } from "../lib/client.ts";

/**
 * Write a single document.
 *
 * `POST /collections/{name}/documents` with an `action` — the same four modes
 * `document-import` offers, for one record at a time.
 *
 * ## Use this for one document and `document-import` for many
 *
 * The single-document endpoint reports failure as an HTTP error, which is what
 * a workflow expects. The bulk one answers 200 and hides failures per line. So
 * this is the *safer* of the two by a wide margin, and the right call whenever
 * a workflow is reacting to one event — a record changed upstream, index it.
 *
 * ## `upsert` replaces and `update` merges
 *
 * The difference matters most when a document is written from a partial
 * source. An upsert carrying three fields replaces a twelve-field document
 * with a three-field one, and nothing reports the nine that went. `emplace`
 * — upsert if new, merge if existing — is usually what an incremental
 * pipeline means.
 *
 * ## The id decides whether this is a write or a duplicate
 *
 * Without one, Typesense generates it, and every run creates a new document.
 * A workflow indexing "the current state of order 4471" must carry that id or
 * it is appending, not updating.
 */
const action: ActionDefinition = {
  key: "document-upsert",
  type: "perform",
  resource: "document",
  title: "Write a document",
  description:
    "Write one document. SAFER than `document-import`, which answers 200 with per-line failures " +
    "— here a rejection is an HTTP error. Note `upsert` REPLACES, so a partial document deletes " +
    "the fields it does not carry; `emplace` merges.",
  idempotent: true,
  params: [
    { key: "collection", label: "Collection", type: "string", required: true, default: "" },
    {
      key: "document",
      label: "Document",
      type: "json",
      required: true,
      default: "",
      hint: "Carry an `id` to update a known record. Without one Typesense generates one, and " +
        "every run appends rather than updating.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      default: "emplace",
      options: [
        { value: "emplace", label: "Emplace — upsert if new, merge if existing" },
        { value: "upsert", label: "Upsert — REPLACES the whole document" },
        { value: "create", label: "Create — fails on an existing id" },
        { value: "update", label: "Update — merges, fails if the id is new" },
      ],
    },
  ],
  output: [
    { key: "document", type: "object", label: "What Typesense stored" },
    { key: "id", type: "string", label: "Its id" },
    { key: "action", type: "string", label: "Which write mode was used" },
    { key: "hadId", type: "boolean", label: "Whether the caller supplied the id" },
    { key: "fields", type: "array", label: "The field names written" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const document = json(p.document, "document");
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      throw new Error("`document` must be a JSON object — use `document-import` for an array");
    }

    const mode = String(p.action ?? "emplace");
    const hadId = Boolean((document as Record<string, unknown>).id);
    if (!hadId) {
      ctx.log(
        "info",
        "this document carries no `id`, so Typesense generates one — running this again creates " +
          "another document rather than updating the first",
        { collection },
      );
    }
    if (mode === "upsert" && hadId) {
      ctx.log(
        "info",
        "an upsert REPLACES the stored document, so any field not present here is removed — " +
          "`emplace` merges instead",
        { collection },
      );
    }

    const stored = await new TypesenseClient(ctx).request<Record<string, unknown>>(
      `/collections/${encodeURIComponent(collection)}/documents`,
      { method: "POST", query: { action: mode }, body: document },
    );

    return {
      document: stored,
      id: String(stored?.id ?? ""),
      action: mode,
      hadId,
      // Names only — the values are the customer's data.
      fields: Object.keys(stored ?? {}),
    };
  },
};

export default action;
