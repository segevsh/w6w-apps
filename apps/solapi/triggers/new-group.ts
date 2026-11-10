import type { TriggerDefinition } from "@w6w/types";
import listGroups from "../actions/list-groups.ts";
import { PAGE_SIZE, pollSince } from "../lib/since-poll.ts";

interface Page {
  items?: unknown[];
  nextKey?: string | null;
}

/**
 * `GET /messages/v4/groups` has no documented sort, so this uses its `startDate`/`endDate` window
 * with `dateType: "CREATED"` (brief 9.1 b), paged by the `startKey` / `nextKey` cursor.
 */
const trigger: TriggerDefinition = {
  key: "new-group",
  title: "New Message Group",
  description:
    "The run gets each message group newly created in the account (every send creates one).",
  output: [
    { key: "groupId", type: "string", label: "Group ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "dateUpdated", type: "string", label: "Updated at" },
  ],
  sample: {
    groupId: "group-101",
    status: "COMPLETE",
    dateCreated: "2026-11-09T11:00:00.000Z",
    dateUpdated: "2026-11-09T12:00:00.000Z",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) =>
    pollSince<Record<string, unknown>>({
      state,
      idOf: (r) => String(r.groupId ?? ""),
      stampOf: (r) => r.dateCreated,
      async fetchPage(win, pos) {
        const res = await listGroups.execute(
          {
            dateType: "CREATED",
            startDate: win.since,
            endDate: win.until,
            limit: PAGE_SIZE,
            startKey: typeof pos === "string" ? pos : undefined,
          },
          ctx,
        ) as Page;
        return {
          items: (res.items ?? []) as Array<Record<string, unknown>>,
          next: res.nextKey ? res.nextKey : undefined,
        };
      },
    }),
};

export default trigger;
