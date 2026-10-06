import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/contacts/{id}` — Fetch one contact by ID. */
interface Input {
  id: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by ID.",
  params: [idParam("id", "Contact ID")],
  output: [{ key: "data", type: "object", label: "The contact" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/contacts/${encodeId(input.id)}`);
    return { data };
  },
};

export default contactGet;
