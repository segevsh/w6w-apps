import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/getaudiences.json` — Return all audiences.
 */
type Input = Record<string, never>;

const audienceList: ActionDefinition<Input> = {
  key: "audience-list",
  type: "read",
  resource: "audience",
  title: "List Audiences",
  description: "Return all audiences.",
  params: [],
  output: [
    { key: "audiences", type: "object", label: "Audiences: { count, items[] }" },
  ],

  async execute(_input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/getaudiences");
  },
};

export default audienceList;
