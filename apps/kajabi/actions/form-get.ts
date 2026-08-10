import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/forms/{id}` — one form. */
interface Input {
  id: string;
  fields?: string;
}

const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch one form by id.",
  params: [
    idParam("Form ID", "`form-list` returns the ids."),
    fieldsParam("forms", "title"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/forms/${encodeURIComponent(input.id)}`, {
      query: { "fields[forms]": unset(input.fields) },
    });
  },
};

export default formGet;
