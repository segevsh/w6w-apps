import type { ActionDefinition } from "@w6w/types";
import { strList, USER, WakaClient } from "../lib/client.ts";

interface Input {
  date: string;
  ids: string;
}

/** `DELETE /api/v1/users/current/heartbeats.bulk` */
const heartbeatsBulkDelete: ActionDefinition<Input> = {
  key: "heartbeats-bulk-delete",
  type: "perform",
  resource: "heartbeat",
  title: "Delete Heartbeats (Bulk)",
  description:
    "Permanently delete heartbeats by id for one day, removing them from every dashboard. Cannot be undone.",
  idempotent: true,
  params: [
    {
      key: "date",
      label: "Date",
      type: "date",
      required: true,
      hint: "The day to read, as YYYY-MM-DD, in the user's timezone.",
    },
    {
      key: "ids",
      label: "Heartbeat IDs",
      type: "string",
      required: true,
      hint: "Comma-separated heartbeat ids (from List Heartbeats).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Empty object on success" },
  ],

  execute(input, ctx) {
    const ids = strList(input.ids);
    if (!ids) throw new Error("At least one heartbeat id is required");
    return new WakaClient(ctx).request("DELETE", `${USER}/heartbeats.bulk`, {
      body: { date: input.date, ids },
    });
  },
};

export default heartbeatsBulkDelete;
