import type { ActionDefinition } from "@w6w/types";
import { json, MAX_UPSERT_TEXT_RECORDS, PineconeClient } from "../lib/client.ts";
import { INDEX_PARAMS } from "../lib/params.ts";

/**
 * `POST /records/namespaces/{namespace}/upsert` on the index's own host —
 * verified against Pinecone's own `db_data` OpenAPI document
 * (`upsert_records`).
 *
 * The integrated-embedding write path: records go in as **text** and Pinecone
 * embeds them with the model the index was created with. No embedding call, no
 * dimension to match, and no chance of embedding the documents with one model
 * and the queries with another.
 *
 * Three things differ from the vector path, and each one is a real trap:
 *
 *   - **The id field is `_id`**, not `id` (Pinecone accepts `id` as an alias,
 *     but `_id` is the documented name).
 *   - **The text field is whatever the index's `field_map` says**, set at
 *     creation and visible in `index-get` as `embed.field_map`. A record
 *     without that exact field is rejected — and the field name is *not*
 *     `text` unless it was created that way.
 *   - **The batch limit is 96 records**, not 1000, because Pinecone is
 *     embedding them for you. Going over fails the whole request.
 *   - **The body is NDJSON**, not JSON. This is the only route in Pinecone's
 *     API whose `requestBody` declares `application/x-ndjson` and nothing else:
 *     the records go one JSON object per line, and a JSON array is rejected.
 *
 * The namespace is in the **path** here rather than the body, which is why it
 * gets its own required-with-a-default treatment: an empty namespace is
 * Pinecone's default namespace, and the path still needs a segment for it.
 */
const action: ActionDefinition = {
  key: "record-upsert-text",
  type: "perform",
  resource: "record",
  title: "Upsert text records",
  description:
    "Write records as text into an integrated-embedding index — Pinecone embeds them. Ids are " +
    "`_id`, the text field is whatever the index's field map names, and the batch limit is 96.",
  idempotent: true,
  params: [
    ...INDEX_PARAMS,
    {
      key: "namespace",
      label: "Namespace",
      type: "string",
      default: "",
      hint: "Empty is Pinecone's default namespace. It goes in the URL path for this route.",
    },
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      default: "",
      hint: 'Array of `{"_id":"…","<text field>":"…", …}`. The text field must be the one named ' +
        "by the index's `embed.field_map` — see `index-get`. Any other keys become metadata.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Upserted" },
    { key: "count", type: "number", label: "Records sent" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const records = json(p.records, "records");
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("`records` must be a non-empty array");
    }
    if (records.length > MAX_UPSERT_TEXT_RECORDS) {
      throw new Error(
        `Pinecone accepts at most ${MAX_UPSERT_TEXT_RECORDS} text records per upsert (it embeds ` +
          `them server-side); got ${records.length}. Split the batch.`,
      );
    }
    for (const [i, r] of records.entries()) {
      const rec = r as Record<string, unknown>;
      if (!rec?._id && !rec?.id) {
        throw new Error(`record at position ${i} has no \`_id\` — Pinecone's id field here is _id`);
      }
    }

    const namespace = String(p.namespace ?? "");
    ctx.log("info", "upserting Pinecone text records", { count: records.length, namespace });

    // NDJSON, not JSON: this is the one route in Pinecone's API whose
    // `requestBody` declares `application/x-ndjson` and nothing else, so the
    // records go one per line rather than as an array.
    await new PineconeClient(ctx).data(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
      `/records/namespaces/${encodeURIComponent(namespace)}/upsert`,
      { method: "POST", body: records, contentType: "application/x-ndjson" },
    );
    return { ok: true, count: records.length };
  },
};

export default action;
