import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, toIdList, toList, toObjectList } from "../lib/client.ts";

/** `POST /api/client/v2/contacts/research` — Research Contacts. */
interface Input {
  searchResultIds?: unknown;
  contacts?: unknown;
  isJobChange?: boolean;
  listIds?: unknown;
  skipDeduplicationCheck?: boolean;
}

const contactsResearch: ActionDefinition<Input> = {
  key: "contacts-research",
  type: "perform",
  resource: "contact",
  title: "Research Contacts",
  description:
    "Start asynchronous research (enrichment) for contacts, by searchResultIds from contacts-search or by identity. Spends one credit per contact. Returns requestIds to pass to contacts-research-poll.",
  idempotent: false,
  params: [
    {
      key: "searchResultIds",
      label: "Search result IDs",
      type: "json",
      hint: "From contacts-search (up to 100). Use this OR contacts, not both.",
    },
    {
      key: "contacts",
      label: "Contacts by identity",
      type: "json",
      hint:
        "JSON array (up to 100) of {contactName, companyName | domain} or {email} or {liProfileUrl} objects.",
    },
    {
      key: "isJobChange",
      label: "Job change research",
      type: "boolean",
      hint: "Requires `contacts`; cannot be combined with search result IDs.",
    },
    {
      key: "listIds",
      label: "Add to lists",
      type: "json",
      hint: "List IDs the researched contacts are added to.",
    },
    {
      key: "skipDeduplicationCheck",
      label: "Skip duplicate check",
      type: "boolean",
      hint: "Re-research records you researched recently (can spend credits again).",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the request was accepted" },
    { key: "requestIds", type: "array", label: "IDs to poll" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("POST", "/contacts/research", {
      body: compact({
        searchResultIds: toList(input.searchResultIds),
        contacts: toObjectList(input.contacts, "Contacts by identity"),
        isJobChange: input.isJobChange,
        listIds: toIdList(input.listIds),
        skipDeduplicationCheck: input.skipDeduplicationCheck,
      }),
    });
  },
};

export default contactsResearch;
