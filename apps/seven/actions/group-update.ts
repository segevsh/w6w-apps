import type { ActionDefinition } from "@w6w/types";
import { encodeId, SevenClient } from "../lib/client.ts";

/** `PATCH /api/groups/:id` — only the name can change. */
interface Input {
  id: number;
  name: string;
}

const groupUpdate: ActionDefinition<Input> = {
  key: "group-update",
  type: "perform",
  resource: "group",
  title: "Rename Group",
  description: "Change a contact group's name.",
  idempotent: true,
  params: [
    { key: "id", label: "Group ID", type: "number", required: true },
    { key: "name", label: "New name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Group id" },
    { key: "name", type: "string", label: "Group name" },
    { key: "members_count", type: "number", label: "Number of contacts" },
    { key: "created", type: "string", label: "Creation time" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("PATCH", `/groups/${encodeId(input.id)}`, {
      form: { name: input.name },
    });
  },
};

export default groupUpdate;
