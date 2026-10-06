import type { ActionDefinition } from "@w6w/types";
import { PylonClient } from "../lib/client.ts";

/** `GET /teams` — documents no query parameters. */
const teamList: ActionDefinition<Record<string, never>> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List the organization's teams with their members and how each assigns issues.",
  params: [],
  output: [
    { key: "teams", type: "array", label: "Teams" },
    { key: "hasNextPage", type: "boolean", label: "Whether Pylon reports more results" },
  ],

  async execute(_input, ctx) {
    const { items, hasNextPage } = await new PylonClient(ctx).list("GET", "/teams");
    return { teams: items, hasNextPage };
  },
};

export default teamList;
