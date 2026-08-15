import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `POST /v3/a/{account_id}/text-messages.json` — Send a Text Message.
 *
 * ## MMS by URL only — `media_file` (multipart upload) is not implemented
 *
 * The reference supports attaching media two ways: `media_url` (a publicly
 * reachable URL CallRail fetches) or `media_file` (a raw file uploaded via
 * `multipart/form-data`). Only `media_url` is exposed here. `HookContext`
 * gives a hook no documented way to read the bytes behind a `type: "file"`
 * param or build a `multipart/form-data` body — guessing at that shape risks
 * either corrupting the upload or silently sending nothing. `media_url`
 * covers the same outcome (an MMS attachment) without it.
 *
 * ## Compliance
 *
 * The reference requires identifying the sender and including an
 * opt-out keyword (STOP, CANCEL, UNSUBSCRIBE, QUIT or END) — CallRail
 * auto-adds opt-out instructions to a lead's first text if none are present,
 * but the identification requirement is the sender's own responsibility and
 * is not something this app can enforce. It also explicitly forbids
 * automated bulk messaging: "You may only use this endpoint to enable
 * person-to-person communication... Automated messaging of any kind,
 * including bulk messaging or text blasts, is strictly prohibited."
 *
 * This endpoint rate-limits separately from general API traffic (150/hour,
 * 1,000/day by default).
 */
interface Input {
  accountId: string;
  companyId: string;
  customerPhoneNumber: string;
  content: string;
  trackingNumber?: string;
  mediaUrl?: string;
}

const textMessageSend: ActionDefinition<Input> = {
  key: "text-message-send",
  type: "perform",
  resource: "text-message",
  title: "Send Text Message",
  description: "Send an SMS (or MMS via a media URL) to a customer, starting or continuing a " +
    "conversation. Person-to-person use only — automated bulk messaging is prohibited by " +
    "CallRail's terms.",
  idempotent: false,
  params: [
    accountIdParam,
    { key: "companyId", label: "Company", type: "string", required: true },
    {
      key: "trackingNumber",
      label: "Tracking number",
      type: "string",
      hint: "Required unless there is already an existing conversation with this customer " +
        "number. 10-digit US/Canadian number.",
    },
    {
      key: "customerPhoneNumber",
      label: "Customer phone number",
      type: "string",
      required: true,
      hint: "10-digit US/Canadian number.",
    },
    {
      key: "content",
      label: "Message",
      type: "text",
      required: true,
      hint: "Limited to 140 characters.",
    },
    {
      key: "mediaUrl",
      label: "Media URL",
      type: "string",
      hint: "A publicly accessible URL to attach as an MMS. JPEG, PNG or GIF, max 5MB.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "company_id", type: "string", label: "Company ID" },
    { key: "customer_phone_number", type: "string", label: "Customer phone number" },
    { key: "state", type: "string", label: "active or archived" },
    { key: "recent_messages", type: "array", label: "Most recent messages in the conversation" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/text-messages.json`,
      {
        method: "POST",
        body: {
          company_id: input.companyId,
          tracking_number: input.trackingNumber,
          customer_phone_number: input.customerPhoneNumber,
          content: input.content,
          media_url: input.mediaUrl,
        },
      },
    );
  },
};

export default textMessageSend;
