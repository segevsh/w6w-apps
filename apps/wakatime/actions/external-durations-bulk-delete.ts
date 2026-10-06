import type { ActionDefinition } from "@w6w/types";
import { strList, USER, WakaClient } from "../lib/client.ts";

interface Input {
  date: string;
  ids: string;
}

/** `DELETE /api/v1/users/current/external_durations.bulk` */
const externalDurationsBulkDelete: ActionDefinition<Input> = {
  key: "external-durations-bulk-delete",
  type: "perform",
  resource: "external-duration",
  title: "Delete External Durations (Bulk)",
  description: "Permanently delete external durations by id for one day. Cannot be undone.",
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
      label: "External duration IDs",
      type: "string",
      required: true,
      hint: "Comma-separated ids (from List External Durations).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Empty object on success" },
  ],

  execute(input, ctx) {
    const ids = strList(input.ids);
    if (!ids) throw new Error("At least one external duration id is required");
    return new WakaClient(ctx).request("DELETE", `${USER}/external_durations.bulk`, {
      body: { date: input.date, ids },
    });
  },
};

export default externalDurationsBulkDelete;
