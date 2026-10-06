import type { ActionDefinition } from "@w6w/types";
import { encodeId, SevenClient } from "../lib/client.ts";

/** `GET /api/contacts/:id` */
interface Input {
  id: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve one contact by id, with its properties and group memberships.",
  params: [{ key: "id", label: "Contact ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Contact id" },
    { key: "properties", type: "object", label: "firstname, lastname, mobile_number, ..." },
    { key: "groups", type: "array", label: "Group ids" },
    { key: "validation", type: "object", label: "Last number-validation result" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("GET", `/contacts/${encodeId(input.id)}`);
  },
};

export default contactGet;
