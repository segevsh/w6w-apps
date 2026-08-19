import type { ActionDefinition } from "@w6w/types";
import { json, parseImportResult, TypesenseClient } from "../lib/client.ts";

/**
 * `POST /collections/{name}/documents/import` — write documents in bulk.
 *
 * ## It answers 200 when every document failed
 *
 * The response is JSONL, one line per document, in the order they were sent:
 *
 *     {"success": true}
 *     {"success": false, "error": "Bad JSON.", "document": "[bad doc"}
 *
 * Typesense's spec is explicit that a failure "does not affect the other
 * documents" — which is good behaviour and a terrible default for a workflow,
 * because the HTTP status is 200 either way. A step that checks only the
 * status reports a successful import of ten thousand records when none of them
 * landed.
 *
 * This action reads every line, and **fails** when any document was rejected
 * unless `allowPartial` says otherwise. A partial write into a search index is
 * worse than no write: the index looks fresh and is missing records nobody
 * knows about.
 *
 * ## The four actions are genuinely different
 *
 * - **`create`** — fails on an existing id.
 * - **`upsert`** — replaces the whole document.
 * - **`update`** — merges, and fails if the id does not exist.
 * - **`emplace`** — upsert if new, merge if existing.
 *
 * The trap is `upsert` versus `update`: upsert *replaces*, so a partial
 * document sent as an upsert silently deletes every field it does not carry.
 * That is the standard way a re-index loses half its fields.
 *
 * ## `dirty_values` decides what happens to a document that does not fit
 *
 * By default a type mismatch rejects the document. `coerce_or_drop` and
 * friends make it land anyway, changed — which is occasionally right and is
 * always worth having chosen deliberately.
 */
const action: ActionDefinition = {
  key: "document-import",
  type: "perform",
  resource: "document",
  title: "Import documents",
  description:
    "Bulk write, and the one to be careful with: Typesense answers 200 with a per-document JSONL " +
    "result, so a check on the HTTP status reports success when every record failed. This fails " +
    "on a partial write unless told otherwise.",
  idempotent: true,
  params: [
    { key: "collection", label: "Collection", type: "string", required: true, default: "" },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      default: "",
      hint: "An array of objects. Each may carry an `id`; without one Typesense generates it, " +
        "which means a re-run creates duplicates rather than updating.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      default: "upsert",
      options: [
        { value: "upsert", label: "Upsert — REPLACES the whole document" },
        { value: "create", label: "Create — fails on an existing id" },
        { value: "update", label: "Update — merges, fails if the id is new" },
        { value: "emplace", label: "Emplace — upsert if new, merge if existing" },
      ],
      hint: "Upsert replaces: a partial document sent as an upsert deletes every field it does " +
        "not carry. `emplace` is the safe default for incremental writes.",
    },
    {
      key: "allowPartial",
      label: "Allow a partial write",
      type: "boolean",
      default: false,
      hint:
        "Off, any rejected document fails the step. A partial write into a search index looks " +
        "fresh and is missing records nobody knows about.",
    },
    {
      key: "dirtyValues",
      label: "Type mismatches",
      type: "select",
      default: "reject",
      advanced: true,
      options: [
        { value: "reject", label: "Reject the document" },
        { value: "coerce_or_reject", label: "Coerce, or reject if impossible" },
        { value: "coerce_or_drop", label: "Coerce, or drop the field" },
        { value: "drop", label: "Drop the offending field" },
      ],
    },
  ],
  output: [
    { key: "sent", type: "number", label: "Documents in the request" },
    { key: "succeeded", type: "number", label: "Documents that landed" },
    { key: "failedCount", type: "number", label: "Documents rejected" },
    { key: "failures", type: "array", label: "Which ones, and why" },
    { key: "allSucceeded", type: "boolean", label: "Whether the write was complete" },
    { key: "action", type: "string", label: "Which write mode was used" },
    { key: "withoutId", type: "number", label: "Documents Typesense had to generate an id for" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const documents = json(p.documents, "documents");
    if (!Array.isArray(documents) || !documents.length) {
      throw new Error("`documents` must be a non-empty array");
    }

    const mode = String(p.action ?? "upsert");
    const withoutId =
      documents.filter((document) => !(document as Record<string, unknown>)?.id).length;
    if (withoutId && (mode === "upsert" || mode === "emplace")) {
      ctx.log(
        "info",
        "some documents carry no `id`, so Typesense generates one — an upsert cannot match a " +
          "generated id, which means re-running this creates duplicates rather than updating",
        { collection, withoutId },
      );
    }

    // JSONL, one document per line, in order — the response matches it.
    const jsonl = documents.map((document) => JSON.stringify(document)).join("\n");

    const body = await new TypesenseClient(ctx).request<string>(
      `/collections/${encodeURIComponent(collection)}/documents/import`,
      {
        method: "POST",
        jsonl,
        text: true,
        query: { action: mode, dirty_values: String(p.dirtyValues ?? "reject") },
      },
    );

    const { succeeded, failed } = parseImportResult(String(body ?? ""));
    const failures = failed.map((line, index) => ({
      index,
      error: line.error,
    }));

    if (failed.length) {
      ctx.log(
        "warn",
        "Typesense rejected some documents and answered 200 anyway — the import response is " +
          "per-document, so the status code says nothing about whether the write completed",
        { collection, sent: documents.length, succeeded, failed: failed.length },
      );
      if (p.allowPartial !== true) {
        throw new Error(
          `${failed.length} of ${documents.length} documents were rejected — the request returned ` +
            `200 regardless. First error: ${failed[0]?.error ?? "unknown"}. Set ` +
            "`allowPartial` to accept an incomplete write, which leaves the index looking fresh " +
            "and missing records",
        );
      }
    }

    return {
      sent: documents.length,
      succeeded,
      failedCount: failed.length,
      failures,
      allSucceeded: failed.length === 0,
      action: mode,
      withoutId,
    };
  },
};

export default action;
