import type { ActionDefinition } from "@w6w/types";
import { call, csv, V2 } from "../lib/client.ts";
import { int, str } from "../lib/params.ts";

type Input = {
  page?: number;
  per_page?: number;
  email_filter?: string;
};

const blacklistEmailList: ActionDefinition<Input> = {
  key: "blacklist-email-list",
  type: "read",
  resource: "blacklist",
  title: "List Blacklisted Emails",
  description: "List blacklisted emails, or check specific ones with a wildcard filter.",
  params: [
    int("page", "Page"),
    int("per_page", "Per page", { hint: "Default 100, maximum 500." }),
    str("email_filter", "Email filter", {
      hint: "Comma-separated emails to check; * is a wildcard.",
    }),
  ],
  output: [
    { key: "emails", type: "array", label: "Blacklisted emails" },
    { key: "count", type: "number", label: "Returned on this page" },
    { key: "total", type: "number", label: "Total blacklisted, or total found with a filter" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", V2, "/blacklist/emails", {
      query: { page: input.page, per_page: input.per_page, email_filter: csv(input.email_filter) },
    }) as { emails?: string[]; total?: number };
    const emails = body.emails ?? [];
    return { emails, count: emails.length, total: body.total ?? emails.length };
  },
};

export default blacklistEmailList;
