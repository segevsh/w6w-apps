import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  labelId: string;
}

/** Fetch one label by ID. */
const labelGet: ActionDefinition<Input> = {
  key: "label-get",
  type: "read",
  resource: "label",
  title: "Get Label",
  description: "Fetch one label by ID.",
  params: [
    { "key": "labelId", "label": "Label ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/labels/${seg(input.labelId)}`);
  },
};

export default labelGet;
