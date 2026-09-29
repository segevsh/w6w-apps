import type { ActionDefinition } from "@w6w/types";
import { BeehiivClient, compact } from "../lib/client.ts";
import { expandParam, publicationIdParam } from "../lib/params.ts";

interface Input {
  publicationId: string;
  expand?: string;
}

/** `GET /publications/{publicationId}` — a single publication. */
const publicationGet: ActionDefinition<Input> = {
  key: "publication-get",
  type: "read",
  resource: "publication",
  title: "Get Publication",
  description: "Retrieve a single publication.",
  params: [
    publicationIdParam,
    expandParam("Comma-separated: `subscriptions` (subscriber counts), `stats` (engagement)."),
  ],
  output: [
    { key: "id", type: "string", label: "Publication ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "organization_name", type: "string", label: "Organization name" },
    { key: "created", type: "number", label: "Created (Unix seconds)" },
    { key: "stats", type: "object", label: "Stats — only present when expanded" },
  ],

  async execute(input, ctx) {
    return await new BeehiivClient(ctx).data(
      `/publications/${encodeURIComponent(input.publicationId)}`,
      { query: compact({ expand: input.expand }) },
    );
  },
};

export default publicationGet;
