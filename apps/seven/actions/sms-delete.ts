import type { ActionDefinition } from "@w6w/types";
import { SevenClient, toList } from "../lib/client.ts";

/** `DELETE /api/sms` — cancel scheduled SMS before they go out. JSON body `{ids: [...]}`. */
interface Input {
  ids: string | string[];
}

const smsDelete: ActionDefinition<Input> = {
  key: "sms-delete",
  type: "perform",
  resource: "sms",
  title: "Delete Scheduled SMS",
  description:
    "Delete one or more SMS by id before they have been sent, which stops them going out.",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "SMS IDs",
      type: "string",
      required: true,
      hint: "Message ids from Send SMS, comma-separated.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "deleted", type: "array", label: "Ids that were deleted" },
  ],

  execute(input, ctx) {
    const ids = toList(input.ids).map((id) => /^\d+$/.test(id) ? Number(id) : id);
    return new SevenClient(ctx).request("DELETE", "/sms", { json: { ids } });
  },
};

export default smsDelete;
