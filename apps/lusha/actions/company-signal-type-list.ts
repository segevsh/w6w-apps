import type { ActionDefinition } from "@w6w/types";
import { LushaClient } from "../lib/client.ts";

type Input = Record<string, never>;

const action: ActionDefinition<Input> = {
  key: "company-signal-type-list",
  type: "read",
  resource: "company",
  title: "List Company Signal Types",
  description: "The signal types Company Signals accepts.",
  params: [],
  output: [
    { key: "signalTypes", type: "array", label: "Supported signal types" },
  ],

  execute(_input, ctx) {
    return new LushaClient(ctx).request("GET", `/v3/companies/signals/types`, {});
  },
};

export default action;
