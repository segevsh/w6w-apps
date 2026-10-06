import type { ActionDefinition } from "@w6w/types";
import { FindymailClient, seg } from "../lib/client.ts";

interface Input {
  id: number;
}

const deleteMonitor: ActionDefinition<Input> = {
  key: "delete-monitor",
  type: "perform",
  resource: "monitor",
  title: "Delete Monitor",
  description: "Soft-delete a signal monitor.",
  idempotent: true,
  params: [{ "key": "id", "label": "Monitor ID", "type": "number", "required": true }],
  output: [{ "key": "deleted", "type": "boolean", "label": "Deleted" }, {
    "key": "id",
    "type": "number",
    "label": "Monitor ID",
  }],

  async execute(input, ctx) {
    await new FindymailClient(ctx).request("DELETE", `/api/signals/monitors/${seg(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default deleteMonitor;
