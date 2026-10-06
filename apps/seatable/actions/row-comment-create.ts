import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  rowId: string;
  comment: string;
}

const rowCommentCreate: ActionDefinition<Input> = {
  key: "row-comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Row Comment",
  description:
    "Add a comment to a row. This endpoint takes the table's `_id` (e.g. 0000), not its name — " +
    "get it from Get Base Metadata. The vendor's success answer is a plain string, so the " +
    "response here is `{success: true}`.",
  idempotent: false,
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "The table's `_id` from Get Base Metadata.",
    },
    { key: "rowId", label: "Row ID", type: "string", required: true },
    { key: "comment", label: "Comment", type: "text", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    await new SeaTableClient(ctx).request("/comments/", {
      method: "POST",
      query: { table_id: input.tableId, row_id: input.rowId },
      body: { comment: input.comment },
    });
    return { success: true };
  },
};

export default rowCommentCreate;
