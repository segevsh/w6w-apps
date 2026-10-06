import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  inboxId: string;
}

/** Fetch one inbox by ID. */
const inboxGet: ActionDefinition<Input> = {
  key: "inbox-get",
  type: "read",
  resource: "inbox",
  title: "Get Inbox",
  description: "Fetch one inbox by ID.",
  params: [
    { "key": "inboxId", "label": "Inbox ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/inboxes/${seg(input.inboxId)}`);
  },
};

export default inboxGet;
