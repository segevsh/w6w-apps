import type { ActionDefinition } from "@w6w/types";
import { call, listResult, pick } from "../lib/client.ts";
import { cursorParam, listOutput } from "../lib/params.ts";

/** `GET /tickets` (cursor only; the reference documents no filters). */
type Input = { cursor?: string };

const ticketList: ActionDefinition<Input> = {
  key: "ticket-list",
  type: "read",
  resource: "ticket",
  title: "List Tickets",
  description: "List tickets, one cursor page at a time. The API offers no filters.",
  params: [cursorParam],
  output: listOutput("Tickets [{id, link, subject, contact_id, priority, status, ...}]"),
  async execute(input, ctx) {
    const body = await call(ctx, "GET", "/tickets", { query: pick(input, ["cursor"]) as never });
    return listResult(body, "tickets");
  },
};

export default ticketList;
