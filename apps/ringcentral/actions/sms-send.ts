import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, RingCentralClient, toList } from "../lib/client.ts";
import { accountIdParam, extensionIdParam, phoneNumberParam } from "../lib/params.ts";

/**
 * `POST /restapi/v1.0/account/{accountId}/extension/{extensionId}/sms` — send
 * a text message. Needs the `SMS` app permission and the `OutboundSMS` user
 * permission.
 *
 * ## Toll-Free numbers only, and rate-limited at 40/minute
 *
 * The vendor's own description: "Sending and receiving SMS is available for
 * Toll-Free Numbers within the USA," and "up to 40 requests per minute" —
 * `from` must be a Toll-Free number this account owns.
 *
 * ## Attachments/MMS are deliberately not covered
 *
 * `CreateSMSMessage` also accepts attachments via `multipart/form-data` /
 * `multipart/mixed` (up to 10, 1,500,000 bytes total, an implicit MMS). This
 * action only builds the plain `application/json` body (`from`, `to`, `text`),
 * which is a fully documented, first-class request shape on its own — not a
 * subset hack. Multipart attachment upload is a materially different request
 * (file params, a different content-type per part) left out to keep this
 * action to one clear job; see the README.
 */
interface Input {
  accountId?: string;
  extensionId?: string;
  from: string;
  to: string;
  text: string;
}

const smsSend: ActionDefinition<Input> = {
  key: "sms-send",
  type: "perform",
  resource: "sms",
  title: "Send SMS",
  description: "Send a text message from one of the account's Toll-Free numbers.",
  // No idempotency key of any kind is documented on this endpoint — a retry
  // sends the message again.
  idempotent: false,
  params: [
    accountIdParam,
    extensionIdParam,
    phoneNumberParam("from", "From (Toll-Free number)", true),
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      placeholder: "+15555550100, +15555550101",
      hint: "One phone number in E.164 format, or several comma-separated.",
    },
    {
      key: "text",
      label: "Message text",
      type: "text",
      required: true,
      hint: "Max 1000 symbols (500 if any character needs 4-byte UTF-16 encoding).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Message ID" },
    { key: "conversationId", type: "number", label: "Conversation ID" },
    { key: "messageStatus", type: "string", label: "Delivery status" },
    { key: "creationTime", type: "string", label: "Creation time (ISO 8601)" },
  ],

  execute(input, ctx) {
    const recipients = toList(input.to);
    if (recipients.length === 0) throw new Error("`to` must name at least one phone number");

    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension/${
        encodeId(input.extensionId)
      }/sms`,
      {
        method: "POST",
        body: {
          from: { phoneNumber: input.from },
          to: recipients.map((phoneNumber) => ({ phoneNumber })),
          text: input.text,
        },
      },
    );
  },
};

export default smsSend;
