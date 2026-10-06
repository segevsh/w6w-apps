import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

/** `GET /v1/contact-groups/{id}` — `{id, name, note, contactsCount}`. */
interface Input {
  id: string;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Contact Group",
  description: "Get one contact group by ID.",
  params: [groupIdParam],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "note", type: "string", label: "Note" },
    { key: "contactsCount", type: "number", label: "Contacts in the group" },
  ],

  async execute(input, ctx) {
    return (await new EzTextingClient(ctx).json(
      `/contact-groups/${encodePathSegment(input.id)}`,
    )) ??
      {};
  },
};

export default groupGet;
