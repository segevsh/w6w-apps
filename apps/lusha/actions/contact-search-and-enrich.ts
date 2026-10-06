import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LushaClient, strList } from "../lib/client.ts";

/** Send `options` only when at least one option was set. */
const optionsOf = (o: Record<string, unknown>) => Object.keys(o).length > 0 ? o : undefined;

interface Input {
  contacts: unknown;
  reveal?: string | string[];
  includePartialProfiles?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "contact-search-and-enrich",
  type: "perform",
  resource: "contact",
  title: "Search and Enrich Contacts",
  description:
    "Find contacts and reveal their emails/phones in one call. Same identifiers as Search Contacts. Spends credits.",
  idempotent: false,
  params: [
    {
      key: "contacts",
      label: "Contacts",
      type: "json",
      required: true,
      hint: 'Up to 100: [{"linkedinUrl":"https://www.linkedin.com/in/..."}].',
    },
    { key: "reveal", label: "Reveal", type: "string", hint: "emails, phones, or both." },
    {
      key: "includePartialProfiles",
      label: "Include partial profiles",
      type: "boolean",
      hint: "Also return profiles with only partial data.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request correlation id" },
    { key: "results", type: "array", label: "Enriched contacts; a failed item carries `error`" },
    { key: "billing", type: "object", label: "Credits charged and results returned" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/v3/contacts/search-and-enrich`, {
      body: compact({
        contacts: jsonValue(input.contacts),
        reveal: strList(input.reveal),
        options: optionsOf(compact({ includePartialProfiles: input.includePartialProfiles })),
      }),
    });
  },
};

export default action;
