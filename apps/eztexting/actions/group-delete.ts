import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";
import { groupIdParam, statusOutput } from "../lib/params.ts";

/** `DELETE /v1/contact-groups/{id}` — delete a group. */
interface Input {
  id: string;
}

const groupDelete: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Contact Group",
  description: "Delete a contact group by ID.",
  idempotent: true,
  params: [groupIdParam],
  output: [{ key: "id", type: "string", label: "Group deleted" }, ...statusOutput],

  async execute(input, ctx) {
    const status = await new EzTextingClient(ctx).status(
      `/contact-groups/${encodePathSegment(input.id)}`,
      { method: "DELETE" },
    );
    return { id: input.id, status };
  },
};

export default groupDelete;
