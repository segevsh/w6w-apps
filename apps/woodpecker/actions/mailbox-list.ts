import type { ActionDefinition } from "@w6w/types";
import { call, V2 } from "../lib/client.ts";

type Input = Record<string, never>;

const mailboxList: ActionDefinition<Input> = {
  key: "mailbox-list",
  type: "read",
  resource: "mailbox",
  title: "List Mailboxes",
  description:
    "List connected SMTP and IMAP mailboxes with limits, today's send count and warm-up status.",
  params: [],
  output: [
    {
      key: "mailboxes",
      type: "array",
      label:
        "Mailboxes: id, type (SMTP/IMAP), details {email, provider, daily_limit, sent_today, ...}",
    },
    { key: "count", type: "number", label: "Mailboxes returned" },
  ],

  async execute(_input, ctx) {
    const body = await call(ctx, "GET", V2, "/mailboxes");
    const items = Array.isArray(body) ? body : [];
    return { mailboxes: items, count: items.length };
  },
};

export default mailboxList;
