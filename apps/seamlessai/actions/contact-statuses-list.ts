import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient } from "../lib/client.ts";

/** `GET /api/client/v2/contact-statuses` — List Contact Statuses. */
type Input = Record<string, never>;

const contactStatusesList: ActionDefinition<Input> = {
  key: "contact-statuses-list",
  type: "read",
  resource: "contact",
  title: "List Contact Statuses",
  description: "The statuses a contact can carry.",
  params: [],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(_input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/contact-statuses");
  },
};

export default contactStatusesList;
