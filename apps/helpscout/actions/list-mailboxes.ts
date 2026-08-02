import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  page?: number;
}

const listMailboxes: ActionDefinition<Input> = {
  key: "list-mailboxes",
  type: "search",
  resource: "mailbox",
  title: "List Inboxes",
  description: "List every inbox (mailbox) on the account.",
  params: [...pagination],
  output: [{ key: "mailboxes", type: "array", label: "Inboxes" }],

  async execute(input, ctx) {
    const body = await new HelpScoutClient(ctx).request<{ _embedded?: { mailboxes?: unknown } }>(
      "/mailboxes",
      { query: { page: input.page } },
    );
    return { mailboxes: body._embedded?.mailboxes ?? [] };
  },
};

export default listMailboxes;
