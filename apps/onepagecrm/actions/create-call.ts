import type { ActionDefinition } from "@w6w/types";
import { compact, OnePageClient, toList } from "../lib/client.ts";

interface Input {
  contactId: string;
  text?: string;
  callResult?: string;
  callTime?: number;
  phoneNumber?: string;
  via?: string;
  recordingLink?: string;
  userIdsToNotify?: string[] | string;
}

/**
 * `POST /calls` — log a phone call against a contact (`contact_id` required). `call_result` is a
 * key from the account's configured call results (they come back in `GET /bootstrap`, which this
 * app does not call because that response also carries the caller's API key). Not idempotent.
 */
const createCall: ActionDefinition<Input> = {
  key: "create-call",
  type: "perform",
  resource: "call",
  title: "Log Call",
  description: "Log a phone call against a contact, with its outcome and recording link.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "text", label: "Notes", type: "text" },
    {
      key: "callResult",
      label: "Call result",
      type: "string",
      hint: "A call-result key configured on the account.",
    },
    {
      key: "callTime",
      label: "Call time",
      type: "number",
      hint: "Unix epoch seconds. Defaults to now.",
      validation: { integer: true },
    },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    {
      key: "via",
      label: "Via",
      type: "select",
      options: ["unknown", "jabber", "talkdesk", "phone"].map((v) => ({ value: v, label: v })),
    },
    { key: "recordingLink", label: "Recording link", type: "string" },
    {
      key: "userIdsToNotify",
      label: "User IDs to notify",
      type: "string",
      hint: "Comma-separated user ids.",
    },
  ],
  output: [{ key: "call", type: "object", label: "The logged call" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data("/calls", {
      method: "POST",
      body: compact({
        contact_id: input.contactId,
        text: input.text,
        call_result: input.callResult,
        call_time_int: input.callTime,
        phone_number: input.phoneNumber,
        via: input.via,
        recording_link: input.recordingLink,
        user_ids_to_notify: toList(input.userIdsToNotify),
      }),
    });
  },
};

export default createCall;
