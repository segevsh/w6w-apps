import type { ActionDefinition } from "@w6w/types";
import { call, csv, V2 } from "../lib/client.ts";
import { bool, int, select, str } from "../lib/params.ts";

type Input = {
  prospect_status?: string;
  prospect_interest_level?: string;
  mailbox_ids?: string;
  campaign_ids?: string;
  search_phrases?: string;
  read?: boolean;
  out_of_campaign?: string;
  per_page?: number;
  next_page_cursor?: string;
};

const inboxMessageList: ActionDefinition<Input> = {
  key: "inbox-message-list",
  type: "search",
  resource: "inbox_message",
  title: "List Inbox Messages",
  description:
    "List replies in the Woodpecker inbox, newest first, filtered by prospect status, interest level, mailbox, campaign, read state or phrases. Cursor-paginated.",
  params: [
    select("prospect_status", "Prospect status", [
      "RESPONDED",
      "AUTOREPLIED",
      "BOUNCED",
      "BLACKLISTED",
      "OPT_OUT",
    ], { hint: "Mutually exclusive with interest level and out-of-campaign." }),
    select("prospect_interest_level", "Interest level", [
      "INTERESTED",
      "MAYBE_LATER",
      "NOT_INTERESTED",
      "NOT_MARKED",
    ]),
    str("mailbox_ids", "Mailbox IDs", { hint: "Comma-separated IMAP mailbox IDs." }),
    str("campaign_ids", "Campaign IDs", { hint: "Comma-separated." }),
    str("search_phrases", "Search phrases", {
      hint: "Comma-separated, up to 20, each at least 3 characters.",
    }),
    bool("read", "Read state", { hint: "true = only read, false = only unread, unset = both." }),
    select("out_of_campaign", "Out of campaign", ["YES"], {
      hint: "Messages not tied to any prospect.",
    }),
    int("per_page", "Per page", { hint: "Default 10, maximum 50." }),
    str("next_page_cursor", "Next page cursor", {
      hint: "The nextCursor from the previous result.",
    }),
  ],
  output: [
    {
      key: "messages",
      type: "array",
      label: "Messages: id, prospect_id, subject, body.html, stamp, read, campaigns[]",
    },
    { key: "count", type: "number", label: "Messages on this page" },
    {
      key: "nextCursor",
      type: "string",
      label: "Pass as next_page_cursor for the next page; null on the last",
    },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", V2, "/inbox/messages", {
      query: {
        prospect_status: input.prospect_status,
        prospect_interest_level: input.prospect_interest_level,
        mailbox_ids: csv(input.mailbox_ids),
        campaign_ids: csv(input.campaign_ids),
        search_phrases: csv(input.search_phrases),
        read: input.read,
        out_of_campaign: input.out_of_campaign,
        per_page: input.per_page,
        next_page_cursor: input.next_page_cursor,
      },
    }) as { content?: unknown[]; pagination?: { next_page_cursor?: string | null } };
    const messages = body.content ?? [];
    return {
      messages,
      count: messages.length,
      nextCursor: body.pagination?.next_page_cursor ?? null,
    };
  },
};

export default inboxMessageList;
