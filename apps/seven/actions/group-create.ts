import type { ActionDefinition } from "@w6w/types";
import { SevenClient } from "../lib/client.ts";

/** `POST /api/groups` */
interface Input {
  name: string;
}

const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a contact group.",
  idempotent: false,
  params: [{ key: "name", label: "Name", type: "string", required: true }],
  output: [
    { key: "id", type: "number", label: "Group id" },
    { key: "name", type: "string", label: "Group name" },
    { key: "members_count", type: "number", label: "Number of contacts" },
    { key: "created", type: "string", label: "Creation time" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("POST", "/groups", { form: { name: input.name } });
  },
};

export default groupCreate;
