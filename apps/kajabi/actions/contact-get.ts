import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, includeParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/contacts/{id}` — one contact, optionally with related resources side-loaded. */
interface Input {
  id: string;
  include?: string;
  fields?: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by id.",
  params: [
    idParam("Contact ID", "`contact-list` returns the ids."),
    includeParam("e.g. `tags`."),
    fieldsParam("contacts", "name,email"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/contacts/${encodeURIComponent(input.id)}`, {
      query: {
        include: unset(input.include),
        "fields[contacts]": unset(input.fields),
      },
    });
  },
};

export default contactGet;
