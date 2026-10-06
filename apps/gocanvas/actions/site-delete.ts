import type { ActionDefinition } from "@w6w/types";
import { deleted, encodeId, GoCanvasClient, hardDeleteQuery } from "../lib/client.ts";
import { hardDeleteParam, idParam } from "../lib/params.ts";

interface Input {
  siteId: number;
  hardDelete?: boolean;
}

const siteDelete: ActionDefinition<Input> = {
  key: "site-delete",
  type: "perform",
  resource: "site",
  title: "Delete Site",
  description: "Soft-delete a site, or permanently delete it with Delete permanently.",
  idempotent: true,
  params: [
    idParam("siteId", "Site ID"),
    hardDeleteParam,
  ],
  output: [
    { key: "data", type: "object", label: "The API's confirmation" },
  ],

  async execute(input, ctx) {
    return deleted(
      await new GoCanvasClient(ctx).request(`/sites/${encodeId(input.siteId)}`, {
        method: "DELETE",
        query: hardDeleteQuery(input.hardDelete),
      }),
    );
  },
};

export default siteDelete;
