import type { ActionDefinition } from "@w6w/types";
import { compact, EzTextingClient } from "../lib/client.ts";
import { pageOutput, paginationParams, sortParam } from "../lib/params.ts";

/** `GET /v1/conversations` — the inbox: one row per (your number, contact) pair. */
interface Input {
  query?: string;
  from?: string;
  unread?: boolean;
  archived?: boolean;
  optType?: string;
  page?: number;
  size?: string;
  sort?: string;
}

const conversationList: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "search",
  resource: "conversation",
  title: "List Conversations",
  description: "List inbox conversations with their last message and unread count.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Matches contact name, contact number or last message text.",
    },
    { key: "from", label: "Your sending number", type: "string" },
    { key: "unread", label: "Unread only", type: "boolean" },
    { key: "archived", label: "Archived", type: "boolean" },
    {
      key: "optType",
      label: "Opt type",
      type: "select",
      options: ["OPTIN", "OPTOUT", "NONE"].map((v) => ({ value: v, label: v })),
      advanced: true,
    },
    ...paginationParams(),
    sortParam(),
  ],
  output: pageOutput("Conversations"),

  execute(input, ctx) {
    return new EzTextingClient(ctx).page("/conversations", {
      query: compact({
        page: input.page,
        size: input.size,
        sort: input.sort,
        "filters[query][eq]": input.query,
        "filters[from][eq]": input.from,
        "filters[unread][eq]": input.unread,
        "filters[archived][eq]": input.archived,
        "filters[optType][eq]": input.optType,
      }) as Record<string, string>,
    });
  },
};

export default conversationList;
