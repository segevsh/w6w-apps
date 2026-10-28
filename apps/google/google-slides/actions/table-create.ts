import type { ActionDefinition } from "@w6w/types";
import {
  batchUpdate,
  buildElementProperties,
  type ElementPlacement,
  PLACEMENT_PARAMS,
  REVISION_PARAM,
  singleRequestBody,
} from "../lib/client.ts";

interface Input extends ElementPlacement {
  presentationId: string;
  rows: number;
  columns: number;
  objectId?: string;
  requiredRevisionId?: string;
}

/**
 * `createTable` via `presentations.batchUpdate`.
 *
 * The table is created empty; fill cells with `text-insert`, which takes the
 * table's object ID plus a row/column pair.
 *
 * Sizing has a rule the other element-creating requests don't share: "the table
 * will be created at the provided size, subject to a **minimum** size", and
 * "table transforms must have a scale of 1 and no shear components". Leaving
 * the size and transform empty — which is what happens if you fill in nothing
 * but rows and columns — lets Google size it automatically and is the safe
 * default. Setting a scale other than 1 here is rejected by the API, not by us,
 * because the rule is Google's and may change.
 */
const tableCreate: ActionDefinition<Input> = {
  key: "table-create",
  type: "perform",
  resource: "element",
  title: "Create Table",
  description: "Add an empty table of a given size to a slide.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "rows",
      label: "Rows",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "columns",
      label: "Columns",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    ...PLACEMENT_PARAMS,
    {
      key: "objectId",
      label: "Table Object ID",
      type: "string",
      advanced: true,
      hint:
        "Optional user-supplied ID. Worth setting — filling the table with Insert Text needs this ID.",
    },
    REVISION_PARAM,
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Replies — `createTable.objectId` of the new table" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    const request: Record<string, unknown> = {
      rows: input.rows,
      columns: input.columns,
      elementProperties: buildElementProperties(input),
    };
    if (input.objectId) request.objectId = input.objectId;

    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({ createTable: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );
  },
};

export default tableCreate;
