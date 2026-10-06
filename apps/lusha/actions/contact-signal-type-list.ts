import type { ActionDefinition } from "@w6w/types";
import { LushaClient } from "../lib/client.ts";

type Input = Record<string, never>;

const action: ActionDefinition<Input> = {
  key: "contact-signal-type-list",
  type: "read",
  resource: "contact",
  title: "List Contact Signal Types",
  description: "The signal types Contact Signals accepts.",
  params: [],
  output: [
    { key: "signalTypes", type: "array", label: "Supported signal types" },
  ],

  execute(_input, ctx) {
    return new LushaClient(ctx).request("GET", `/v3/contacts/signals/types`, {});
  },
};

export default action;
