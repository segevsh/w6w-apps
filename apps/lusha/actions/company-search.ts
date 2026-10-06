import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LushaClient } from "../lib/client.ts";

/** Send `options` only when at least one option was set. */
const optionsOf = (o: Record<string, unknown>) => Object.keys(o).length > 0 ? o : undefined;

interface Input {
  companies: unknown;
  includePartialProfiles?: boolean;
  signals?: unknown;
}

const action: ActionDefinition<Input> = {
  key: "company-search",
  type: "read",
  resource: "company",
  title: "Search Companies",
  description:
    "Look up companies by Lusha id, name or domain. Returns a preview with what can be revealed.",
  params: [
    {
      key: "companies",
      label: "Companies",
      type: "json",
      required: true,
      hint: 'Up to 100: [{"domain":"example.com"}]. Each needs an id, name or domain.',
    },
    {
      key: "includePartialProfiles",
      label: "Include partial profiles",
      type: "boolean",
      hint: "Also return profiles with only partial data.",
    },
    {
      key: "signals",
      label: "Signals",
      type: "json",
      hint: 'Optional {"types":["surgeInHiring"]}.',
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request correlation id" },
    {
      key: "results",
      type: "array",
      label: "One preview per company; a failed item carries `error`",
    },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/companies/search`, {
      body: compact({
        companies: jsonValue(input.companies),
        signals: jsonValue(input.signals),
        options: optionsOf(compact({ includePartialProfiles: input.includePartialProfiles })),
      }),
    });
  },
};

export default action;
