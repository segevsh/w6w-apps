import type { ActionDefinition } from "@w6w/types";
import { compact, SendfoxClient } from "../lib/client.ts";

/**
 * `POST /lists` — create a contact list.
 *
 * `name` is the only field. The response is the bare `ContactList`, and it is a
 * plain `200` rather than a `201` — SendFox uses `200` for most creates, which
 * is worth knowing before writing a status check against it.
 *
 * Not idempotent: a retry creates a second list, and SendFox does not reject
 * duplicate list names.
 */
interface Input {
  name: string;
}

const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create a contact list.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "Newsletter",
      hint: "The list's name. SendFox does not reject duplicate names.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "List id" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json("/lists", {
      method: "POST",
      body: compact({ name: input.name }),
    });
  },
};

export default listCreate;
