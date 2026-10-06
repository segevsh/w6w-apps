import type { ActionDefinition } from "@w6w/types";
import { encodeId, SevenClient } from "../lib/client.ts";

/** `DELETE /api/groups/:id` — optionally deletes the member contacts too. */
interface Input {
  id: number;
  delete_contacts?: boolean;
}

const groupDelete: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description:
    "Delete a contact group. With delete_contacts on, the contacts in it are deleted too.",
  idempotent: true,
  params: [
    { key: "id", label: "Group ID", type: "number", required: true },
    {
      key: "delete_contacts",
      label: "Also delete its contacts",
      type: "boolean",
      default: false,
      hint: "Destructive: removes every contact that is a member of the group.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "True once the call was accepted" }],

  async execute(input, ctx) {
    await new SevenClient(ctx).request("DELETE", `/groups/${encodeId(input.id)}`, {
      form: { delete_contacts: input.delete_contacts ?? false },
    });
    return { deleted: true, id: input.id };
  },
};

export default groupDelete;
