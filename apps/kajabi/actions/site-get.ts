import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/sites/{id}` — one site's details. */
interface Input {
  id: string;
  fields?: string;
}

const siteGet: ActionDefinition<Input> = {
  key: "site-get",
  type: "read",
  resource: "site",
  title: "Get Site",
  description: "Fetch one site by id.",
  params: [
    idParam("Site ID", "`site-list` returns the ids."),
    fieldsParam("sites", "title,subdomain"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/sites/${encodeURIComponent(input.id)}`, {
      query: { "fields[sites]": unset(input.fields) },
    });
  },
};

export default siteGet;
