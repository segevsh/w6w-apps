import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  siteId: number;
}

const siteGet: ActionDefinition<Input> = {
  key: "site-get",
  type: "read",
  resource: "site",
  title: "Get Site",
  description: "Fetch one site by id.",
  params: [
    idParam("siteId", "Site ID"),
  ],
  output: [
    { key: "data", type: "object", label: "The site" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/sites/${encodeId(input.siteId)}`);
  },
};

export default siteGet;
