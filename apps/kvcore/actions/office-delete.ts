import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  office_id: string;
}

/** `DELETE /v2/public/office/{office_id}` — remove an office from the account. */
const officeDelete: ActionDefinition<Input> = {
  key: "office-delete",
  type: "perform",
  resource: "office",
  title: "Remove Office",
  description: "Remove an office from the account.",
  idempotent: true,
  params: [{ key: "office_id", label: "Office ID", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(`/office/${encodeURIComponent(input.office_id)}`, {
      method: "DELETE",
    });
  },
};

export default officeDelete;
