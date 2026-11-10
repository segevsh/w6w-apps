import type { TriggerDefinition } from "@w6w/types";
import listMessages from "../actions/list-messages.ts";
import { PAGE_SIZE, pollSince } from "../lib/since-poll.ts";

interface Page {
  items?: unknown[];
  nextKey?: string | null;
}

/**
 * `GET /messages/v4/list` has no documented sort, so this uses its `startDate`/`endDate` window
 * with `dateType: "CREATED"` (brief §9.1 b), paged by the `startKey` / `nextKey` cursor.
 */
const trigger: TriggerDefinition = {
  key: "new-message",
  title: "New Message",
  description: "The run gets each newly created SOLAPI message.",
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "to", type: "string", label: "Recipient" },
    { key: "statusCode", type: "string", label: "Status code" },
  ],
  sample: {
    messageId: "message-101",
    to: "01000000000",
    statusCode: "2000",
    dateCreated: "2026-11-09T12:00:00.000Z",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) =>
    pollSince<unknown>({
      state,
      idOf: (m) => {
        const r = m as { messageId?: unknown; dateCreated?: unknown };
        return String(r.messageId ?? "");
      },
      stampOf: (m) => (m as { dateCreated?: unknown }).dateCreated,
      async fetchPage(win, pos) {
        const res = await listMessages.execute(
          {
            dateType: "CREATED",
            startDate: win.since,
            endDate: win.until,
            limit: PAGE_SIZE,
            startKey: typeof pos === "string" ? pos : undefined,
          },
          ctx,
        ) as Page;
        return { items: res.items ?? [], next: res.nextKey ? res.nextKey : undefined };
      },
    }),
};

export default trigger;
