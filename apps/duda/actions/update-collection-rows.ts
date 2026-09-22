import type { ActionDefinition } from "@w6w/types";
import { DudaClient, jsonParam, seg } from "../lib/client.ts";

interface Input {
  siteName: string;
  collectionName: string;
  rows: unknown;
}

/**
 * `PUT /api/sites/multiscreen/{site_name}/collection/{collection_name}/row` —
 * update rows.
 *
 * Like the create call, the body is a raw JSON array — here of
 * `{ "id": "<row id>", "data": { … } }` objects, since each row has to be
 * identified (the ids come from `get-collection`'s `values[].id`).
 *
 * **The write is a whole-row overwrite, not a patch.** Duda's Collections guide
 * says update rows requires "row id + all fields", so a `data` object that
 * omits a field blanks that field rather than leaving it alone. That is why the
 * `rows` hint spells it out: reading a row first (`get-collection`) and sending
 * back the full `data` is the only safe way to change one value.
 *
 * `204 No Content` on success. Marked `idempotent: true` because resending the
 * same full-row payload converges on the same row state.
 */
const updateCollectionRows: ActionDefinition<Input> = {
  key: "update-collection-rows",
  type: "perform",
  resource: "collection",
  title: "Update Collection Rows",
  description:
    "Overwrite whole rows in a collection. The body is a raw JSON array of `{ id, data }` " +
    "objects. Answers 204 with no content.",
  idempotent: true,
  params: [
    {
      key: "siteName",
      label: "Site name",
      type: "string",
      required: true,
      hint: "Duda's site alias (`site_name`).",
    },
    {
      key: "collectionName",
      label: "Collection name",
      type: "string",
      required: true,
      hint: "The collection's own `name`, as returned by `list-collections`.",
    },
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      hint: 'Array of `{ id: "<row id>", data: { ...full row data... } }` objects. **Duda ' +
        "overwrites the whole row from what is sent, so any field you leave out of `data` is " +
        "blanked.** Send the complete row.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  async execute(input, ctx) {
    const rows = jsonParam(input.rows, "rows");
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("`rows` must be a non-empty JSON array of `{ id, data }` objects.");
    }
    const { status } = await new DudaClient(ctx).send(
      `/api/sites/multiscreen/${seg(input.siteName)}/collection/${seg(input.collectionName)}/row`,
      { method: "PUT", body: rows },
    );
    return { status };
  },
};

export default updateCollectionRows;
