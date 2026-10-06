import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
}

/** `POST /api/1/getMergeFields/` */
const mergeFieldsGet: ActionDefinition<Input> = {
  key: "merge-fields-get",
  type: "read",
  title: "Get Merge Fields",
  description:
    "The merge tags of a list mapped to their field type (limit: 10 requests per minute).",
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "getMergeFields", {
      list_id: required("list_id", input.list_id),
    });
    return { result };
  },
};

export default mergeFieldsGet;
