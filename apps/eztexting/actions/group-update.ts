import type { ActionDefinition } from "@w6w/types";
import { compact, encodePathSegment, EzTextingClient } from "../lib/client.ts";
import { groupIdParam, statusOutput } from "../lib/params.ts";

/** `PUT /v1/contact-groups/{id}` — rename a group / change its note. `name` is required by the API. */
interface Input {
  id: string;
  name: string;
  note?: string;
}

const groupUpdate: ActionDefinition<Input> = {
  key: "group-update",
  type: "perform",
  resource: "group",
  title: "Update Contact Group",
  description: "Rename a contact group or change its note.",
  idempotent: true,
  params: [
    groupIdParam,
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 25 } },
    { key: "note", label: "Note", type: "text", validation: { maxLength: 500 } },
  ],
  output: [{ key: "id", type: "string", label: "Group ID" }, ...statusOutput],

  async execute(input, ctx) {
    const status = await new EzTextingClient(ctx).status(
      `/contact-groups/${encodePathSegment(input.id)}`,
      { method: "PUT", body: compact({ name: input.name, note: input.note }) },
    );
    return { id: input.id, status };
  },
};

export default groupUpdate;
