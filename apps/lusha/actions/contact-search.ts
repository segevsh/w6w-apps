import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LushaClient } from "../lib/client.ts";

/** Send `options` only when at least one option was set. */
const optionsOf = (o: Record<string, unknown>) => Object.keys(o).length > 0 ? o : undefined;

interface Input {
  contacts: unknown;
  includePartialProfiles?: boolean;
  signals?: unknown;
}

const action: ActionDefinition<Input> = {
  key: "contact-search",
  type: "read",
  resource: "contact",
  title: "Search Contacts",
  description:
    "Look up contacts by identifier (Lusha id, LinkedIn URL, email, or first + last name + company). Returns a non-PII preview with what can be revealed; no credits are spent on emails or phones.",
  params: [
    {
      key: "contacts",
      label: "Contacts",
      type: "json",
      required: true,
      hint:
        'Up to 100: [{"firstName":"Ada","lastName":"Lovelace","companyDomain":"example.com"}]. Each needs an id, linkedinUrl, email, or name + company.',
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
      hint: 'Optional {"types":["promotion"],"startDate":"2026-01-01","maxResultsPerSignal":5}.',
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request correlation id" },
    {
      key: "results",
      type: "array",
      label: "One preview per requested contact; a failed item carries `error`",
    },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/contacts/search`, {
      body: compact({
        contacts: jsonValue(input.contacts),
        signals: jsonValue(input.signals),
        options: optionsOf(compact({ includePartialProfiles: input.includePartialProfiles })),
      }),
    });
  },
};

export default action;
