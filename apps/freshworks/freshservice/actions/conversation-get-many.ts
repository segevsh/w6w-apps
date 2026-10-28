import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  ticketId: number;
  page?: number;
  perPage?: number;
}

const conversationGetMany: ActionDefinition<Input> = {
  key: "conversation-get-many",
  type: "read",
  resource: "conversation",
  title: "List Ticket Conversations",
  description:
    "Every note and reply on a ticket. Use this rather than `ticket-get`'s embed once a ticket has more than ten.",
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    ...pagination,
  ],
  output: [{ key: "conversations", type: "array", label: "Conversations" }],

  async execute(input, ctx) {
    const conversations = await new FreshserviceClient(ctx).resource<unknown[]>(
      "conversations",
      `/tickets/${input.ticketId}/conversations`,
      { query: { page: input.page, per_page: input.perPage } },
    );
    return { conversations };
  },
};

export default conversationGetMany;
