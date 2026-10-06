import type { ActionDefinition } from "@w6w/types";
import { PlivoClient } from "../lib/client.ts";
import { PAGE_PARAMS } from "../lib/params.ts";
import type { Page } from "../lib/params.ts";

interface Input extends Page {
  direction?: "inbound" | "outbound";
  state?: "queued" | "sent" | "delivered" | "undelivered" | "failed" | "received";
  type?: "sms" | "mms" | "whatsapp";
  after?: string;
  before?: string;
  errorCode?: number;
  subaccount?: string;
  powerpackId?: string;
}

/**
 * `GET /v1/Account/{auth_id}/Message/` — returns `{ api_id, meta, objects }`.
 * Time filters use Plivo's `message_time__gt` / `message_time__lt` and want
 * `yyyy-MM-dd HH:mm:ss`.
 */
const listMessages: ActionDefinition<Input> = {
  key: "list-messages",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "List message detail records, newest first, with optional filters.",
  params: [
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [{ value: "outbound", label: "Outbound" }, { value: "inbound", label: "Inbound" }],
    },
    {
      key: "state",
      label: "State",
      type: "select",
      options: ["queued", "sent", "delivered", "undelivered", "failed", "received"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "sms", label: "SMS" }, { value: "mms", label: "MMS" }, {
        value: "whatsapp",
        label: "WhatsApp",
      }],
    },
    {
      key: "after",
      label: "After",
      type: "string",
      placeholder: "2026-10-01 00:00:00",
      hint: "Only messages after this time (yyyy-MM-dd HH:mm:ss).",
    },
    {
      key: "before",
      label: "Before",
      type: "string",
      placeholder: "2026-10-06 00:00:00",
      hint: "Only messages before this time (yyyy-MM-dd HH:mm:ss).",
    },
    { key: "errorCode", label: "Error code", type: "number" },
    { key: "subaccount", label: "Subaccount Auth ID", type: "string" },
    { key: "powerpackId", label: "Powerpack ID", type: "string" },
    ...PAGE_PARAMS,
  ],

  output: [
    { key: "api_id", type: "string", label: "Request ID" },
    {
      key: "meta",
      type: "object",
      label: "Pagination (limit, offset, total_count, next, previous)",
    },
    { key: "objects", type: "array", label: "Message records" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request("Message/", {
      query: {
        message_direction: input.direction,
        message_state: input.state,
        message_type: input.type,
        message_time__gt: input.after,
        message_time__lt: input.before,
        error_code: input.errorCode,
        subaccount: input.subaccount,
        powerpack_id: input.powerpackId,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default listMessages;
