import type { ActionDefinition } from "@w6w/types";
import { compact, json, PineconeClient, vector } from "../lib/client.ts";
import { INDEX_PARAMS, NAMESPACE_PARAM } from "../lib/params.ts";

/**
 * `POST /vectors/update` on the index's own host — verified against Pinecone's
 * own `db_data` OpenAPI document (`update_vector`).
 *
 * The **partial** write, and the reason it exists: `record-upsert` replaces a
 * record wholesale, so using it to change one metadata field means sending the
 * vector again — and sending it wrong, or not at all, erases it. This sets what
 * it is given and leaves the rest alone.
 *
 * `setMetadata` merges at the top level: keys named are set, keys unnamed keep
 * their values. It cannot *remove* a key — Pinecone has no delete-field
 * operation, so removing metadata means re-upserting the record without it.
 *
 * Note `setMetadata`, not `metadata`, and `sparseValues`, not `sparse_values`:
 * the vector API is camelCase throughout, while the records API on the same
 * host is snake_case.
 */
const action: ActionDefinition = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update a record",
  description:
    "Change one record's values or metadata without replacing it. Metadata merges — named keys " +
    "are set, unnamed keys survive — but a key cannot be removed this way.",
  idempotent: true,
  params: [
    ...INDEX_PARAMS,
    NAMESPACE_PARAM,
    {
      key: "id",
      label: "Record ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "values",
      label: "New Values",
      type: "json",
      default: "",
      hint: "Replaces the vector. Must have the index's dimension.",
    },
    {
      key: "setMetadata",
      label: "Set Metadata",
      type: "json",
      default: "",
      hint: 'Merged into the existing metadata, e.g. `{"status":"archived"}`. Keys you do not ' +
        "name keep their values; a key cannot be deleted here.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Updated" },
    { key: "id", type: "string", label: "Record ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");

    const values = vector(p.values, "values");
    const setMetadata = json(p.setMetadata, "setMetadata");
    if (values === undefined && setMetadata === undefined) {
      throw new Error("give `values`, `setMetadata`, or both — there is nothing to update");
    }

    await new PineconeClient(ctx).data(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
      "/vectors/update",
      {
        method: "POST",
        // camelCase: setMetadata, not set_metadata.
        body: compact({ id, values, setMetadata, namespace: String(p.namespace ?? "") }),
      },
    );
    return { ok: true, id };
  },
};

export default action;
