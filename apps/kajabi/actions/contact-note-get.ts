import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, includeParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/contact_notes/{id}` — one note. */
interface Input {
  id: string;
  include?: string;
  fields?: string;
}

const contactNoteGet: ActionDefinition<Input> = {
  key: "contact-note-get",
  type: "read",
  resource: "contact-note",
  title: "Get Contact Note",
  description: "Fetch one contact note by id.",
  params: [
    idParam("Note ID", "`contact-note-list` returns the ids."),
    includeParam("e.g. `contact`."),
    fieldsParam("contact_notes", "body"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/contact_notes/${encodeURIComponent(input.id)}`, {
      query: {
        include: unset(input.include),
        "fields[contact_notes]": unset(input.fields),
      },
    });
  },
};

export default contactNoteGet;
