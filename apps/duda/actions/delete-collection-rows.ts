import type { ActionDefinition } from "@w6w/types";
import { DudaClient, jsonParam, seg } from "../lib/client.ts";

interface Input {
  siteName: string;
  collectionName: string;
  rowIds: unknown;
}

/**
 * `DELETE /api/sites/multiscreen/{site_name}/collection/{collection_name}/row`
 * — delete rows.
 *
 * The row ids go in the **body** as a raw JSON array of strings — `["id1",
 * "id2"]` — not in the path and not wrapped in an object. Duda's Collections
 * guide documents this call as "(row ids in body)", and shows a second,
 * single-row form (`DELETE /row/{row_id}`) which this app does not cover
 * because the batch form expresses it.
 *
 * Deleting rows is destructive and cannot be undone, but it is `idempotent`:
 * Duda's own docs do not state a response body, and deleting an already-deleted
 * id converges on the same absence.
 */
const deleteCollectionRows: ActionDefinition<Input> = {
  key: "delete-collection-rows",
  type: "perform",
  resource: "collection",
  title: "Delete Collection Rows",
  description: "Delete rows from a collection by id. The body is a raw JSON array of row ids.",
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
      key: "rowIds",
      label: "Row ids",
      type: "json",
      required: true,
      hint: 'Array of row id strings, e.g. `["c1a2…", "9f30…"]` — the `values[].id` values ' +
        "`get-collection` returns. This deletes data permanently.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const rowIds = jsonParam(input.rowIds, "rowIds");
    if (!Array.isArray(rowIds) || rowIds.length === 0) {
      throw new Error("`rowIds` must be a non-empty JSON array of row id strings.");
    }
    const { status } = await new DudaClient(ctx).send(
      `/api/sites/multiscreen/${seg(input.siteName)}/collection/${seg(input.collectionName)}/row`,
      { method: "DELETE", body: rowIds },
    );
    return { status };
  },
};

export default deleteCollectionRows;
