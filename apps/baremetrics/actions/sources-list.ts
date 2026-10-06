import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient } from "../lib/client.ts";

/** `GET /v1/sources` — List the sources (payment providers and the Baremetrics API source) on the account. Every source-scoped action needs one of these ids. */
type Input = Record<string, never>;

const sourcesList: ActionDefinition<Input> = {
  key: "sources-list",
  type: "read",
  resource: "source",
  title: "List Sources",
  description:
    "List the sources (payment providers and the Baremetrics API source) on the account. Every source-scoped action needs one of these ids.",
  params: [],
  output: [
    { key: "sources", type: "array", label: "Sources: id, provider, provider_id" },
  ],

  execute(_input, ctx) {
    return new BaremetricsClient(ctx).request("GET", "/sources");
  },
};

export default sourcesList;
