import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch } from "../lib/client.ts";

interface Input {
  count?: number;
  offset?: number;
  recipient?: string;
  tag?: string;
  messageStream?: string;
  platform?: "webmail" | "desktop" | "mobile" | "";
}

/**
 * `GET /messages/outbound/opens` — open-tracking events, optionally filtered
 * by recipient, tag, message stream, or client platform.
 * https://postmarkapp.com/developer/user-guide/tracking-opens/message-opens-api
 */
const listMessageOpens: ActionDefinition<Input> = {
  key: "list-message-opens",
  type: "read",
  resource: "message",
  title: "List Message Opens",
  description: "List open-tracking events for sent messages.",
  params: [
    { key: "count", label: "Count", type: "number", default: 100, hint: "Max 500 per request." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    { key: "recipient", label: "Recipient", type: "string" },
    { key: "tag", label: "Tag", type: "string" },
    { key: "messageStream", label: "Message Stream", type: "string" },
    {
      key: "platform",
      label: "Platform",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "webmail", label: "Webmail" },
        { value: "desktop", label: "Desktop" },
        { value: "mobile", label: "Mobile" },
      ],
    },
  ],
  output: [
    { key: "TotalCount", type: "number", label: "Total Count" },
    { key: "Opens", type: "array", label: "Opens" },
  ],

  execute(input, ctx) {
    const qs = new URLSearchParams();
    qs.set("count", String(input.count ?? 100));
    qs.set("offset", String(input.offset ?? 0));
    if (input.recipient) qs.set("recipient", input.recipient);
    if (input.tag) qs.set("tag", input.tag);
    if (input.messageStream) qs.set("messagestream", input.messageStream);
    if (input.platform) qs.set("platform", input.platform);
    return postmarkFetch(ctx, `/messages/outbound/opens?${qs.toString()}`);
  },
};

export default listMessageOpens;
