import type { ActionDefinition } from "@w6w/types";
import { TwoChatClient } from "../lib/client.ts";

interface Input {
  channelUuid?: string;
  resultsPerPage?: number;
  pageNumber?: number;
}

const contactsList: ActionDefinition<Input> = {
  key: "contacts-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts, paginated (GET /contacts). Optionally restrict to the contacts of one connected " +
    "number.",
  params: [
    {
      key: "channelUuid",
      label: "WhatsApp channel UUID",
      type: "string",
      hint: "Only contacts associated with this connected number.",
    },
    {
      key: "resultsPerPage",
      label: "Results per page",
      type: "number",
      default: 30,
      hint: "1 to 100.",
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "Zero-based page index. 2Chat's first page is 0.",
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts with `details`" },
    { key: "page", type: "number", label: "Page returned" },
    { key: "count", type: "number", label: "Contacts on this page" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get("/contacts", {
      channel_uuid: input.channelUuid,
      results_per_page: input.resultsPerPage,
      page_number: input.pageNumber ?? 0,
    });
  },
};

export default contactsList;
