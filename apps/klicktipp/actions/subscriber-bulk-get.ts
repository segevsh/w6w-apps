import type { ActionDefinition } from "@w6w/types";
import { idList, kt } from "../lib/client.ts";

interface Input {
  subscriberIds: string;
}

/** Return the complete records of up to 200 contacts by ID in one call. */
const subscriberBulkGet: ActionDefinition<Input> = {
  key: "subscriber-bulk-get",
  type: "read",
  resource: "subscriber",
  title: "Get Multiple Contacts",
  description: "Return the complete records of up to 200 contacts by ID in one call.",
  params: [
    {
      key: "subscriberIds",
      label: "Contact IDs",
      type: "string",
      required: true,
      placeholder: "123,456",
      hint: "Comma-separated numeric contact IDs, at most 200. Contact keys are not accepted here.",
    },
  ],
  output: [{
    key: "subscribers",
    type: "object",
    label: "Contacts keyed by ID (null when missing)",
  }],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-bulk-get");
    const ids = idList(input.subscriberIds, "subscriberIds", 200);
    const subscribers = await kt(ctx, "GET", `/subscriber/bulk/${ids.join(",")}`);
    return { subscribers };
  },
};

export default subscriberBulkGet;
