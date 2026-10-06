import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
}

/** `POST /api/1/deleteList/` */
const listDelete: ActionDefinition<Input> = {
  key: "list-delete",
  type: "perform",
  title: "Delete List",
  description: "Permanently delete a subscriber list (limit: 10 requests per minute).",
  idempotent: true,
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when the call succeeded" }],

  async execute(input, ctx) {
    await call(ctx, "deleteList", {
      list_id: required("list_id", input.list_id),
    });
    return { ok: true };
  },
};

export default listDelete;
