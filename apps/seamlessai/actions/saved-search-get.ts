import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient, segment } from "../lib/client.ts";

/** `GET /api/client/v2/saved-searches/{id}` — Get Saved Search. */
interface Input {
  id: string;
}

const savedSearchGet: ActionDefinition<Input> = {
  key: "saved-search-get",
  type: "read",
  resource: "saved-search",
  title: "Get Saved Search",
  description: "Get one saved search, including its stored filter values.",
  params: [
    {
      key: "id",
      label: "Saved search ID",
      type: "string",
      required: true,
      hint: "Saved search ID from the matching list action.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "The record" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "GET",
      `/saved-searches/${segment(input.id, "Saved search ID")}`,
    );
  },
};

export default savedSearchGet;
