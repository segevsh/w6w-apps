import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/contact_tags/{id}` — resolve one tag id to its name. */
interface Input {
  id: string;
  fields?: string;
}

const tagGet: ActionDefinition<Input> = {
  key: "tag-get",
  type: "read",
  resource: "tag",
  title: "Get Tag",
  description: "Fetch one contact tag by id — useful for turning the identifiers returned by " +
    "`contact-tag-list` back into names.",
  params: [
    idParam("Tag ID", "`tag-list` returns the ids."),
    fieldsParam("contact_tags", "name"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/contact_tags/${encodeURIComponent(input.id)}`, {
      query: { "fields[contact_tags]": unset(input.fields) },
    });
  },
};

export default tagGet;
