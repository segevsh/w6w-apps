import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
  field_name: string;
  field_type: string;
}

/** `POST /api/1/addMergeTag/` */
const mergeTagAdd: ActionDefinition<Input> = {
  key: "merge-tag-add",
  type: "perform",
  title: "Add Merge Field",
  description:
    "Add a column (merge field) to a list (limit: 10 requests per minute). Adding an existing name is not documented, so this is not marked safe to retry.",
  idempotent: false,
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
    {
      key: "field_name",
      label: "Field name",
      type: "string",
      required: true,
      hint: "Name of the column to add.",
    },
    {
      key: "field_type",
      label: "Field type",
      type: "string",
      required: true,
      hint: "One of: text, boolean, integer, decimal, time, email, longText, ip, url.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when the call succeeded" }],

  async execute(input, ctx) {
    await call(ctx, "addMergeTag", {
      list_id: required("list_id", input.list_id),
      field_name: required("field_name", input.field_name),
      field_type: required("field_type", input.field_type),
    });
    return { ok: true };
  },
};

export default mergeTagAdd;
