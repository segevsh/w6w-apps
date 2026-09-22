import type { ActionDefinition } from "@w6w/types";
import { DudaClient, jsonParam, seg } from "../lib/client.ts";

interface Input {
  siteName: string;
  collectionName: string;
  rows: unknown;
}

/**
 * `POST /api/sites/multiscreen/{site_name}/collection/{collection_name}/row` —
 * create rows.
 *
 * **The request body is the array itself**, not an envelope around it: Duda's
 * Collections guide documents this call as taking "array of `{data}`", so the
 * JSON sent is `[{ "data": { … } }, …]` with nothing wrapping it.
 *
 * The keys inside each row's `data` must match the collection's **existing**
 * field names — a collection's fields are defined when it is created (or via
 * `POST /collection/{name}/field`, which this app does not cover), and a row
 * naming an unknown field is a `400 InvalidInput`. `get-collection` is how a
 * workflow finds out what those field names are.
 *
 * The response is the ids of the rows just created. Duda's own docs do not
 * state that response shape on any page reachable at the time of writing, so
 * the body is passed through verbatim rather than re-shaped here.
 */
const createCollectionRows: ActionDefinition<Input> = {
  key: "create-collection-rows",
  type: "perform",
  resource: "collection",
  title: "Create Collection Rows",
  description:
    "Append rows to a collection. The body is a raw JSON array of `{ data: { … } }` objects.",
  idempotent: false,
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
      hint: "Array of `{ data: {...} }` objects — the object keys under `data` must match the " +
        'collection\'s existing field names, e.g. `[{ "data": { "Name": "Ada", "Email": ' +
        '"ada@acme.com" } }]`.',
    },
  ],
  output: [
    { key: "[]", type: "array", label: "The new rows' ids, as Duda returned them" },
  ],

  async execute(input, ctx) {
    const rows = jsonParam(input.rows, "rows");
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("`rows` must be a non-empty JSON array of `{ data: {...} }` objects.");
    }
    return await new DudaClient(ctx).request(
      `/api/sites/multiscreen/${seg(input.siteName)}/collection/${seg(input.collectionName)}/row`,
      { method: "POST", body: rows },
    );
  },
};

export default createCollectionRows;
