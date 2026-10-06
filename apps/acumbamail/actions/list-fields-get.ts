import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
}

/** `POST /api/1/getListFields/` */
const listFieldsGet: ActionDefinition<Input> = {
  key: "list-fields-get",
  type: "read",
  title: "Get List Fields",
  description:
    "Every field of a list: identifier, merge tag, name, type, options (for list-type fields) and visibility.",
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
    const result = await call(ctx, "getListFields", {
      list_id: required("list_id", input.list_id),
    });
    return { result };
  },
};

export default listFieldsGet;
