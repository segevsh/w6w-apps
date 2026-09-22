import type { ActionDefinition } from "@w6w/types";
import { compact, LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `POST /v1.0/message/sms/send` — text a lead.
 *
 * The message goes out from the connection's own Lofty virtual number, and
 * answers `{ messageId, phoneNumber, phoneCode }`.
 *
 * ## The recipient can come from the lead
 *
 * Only `content` and `leadId` are required. When `phoneNumber` and `phoneCode`
 * are omitted — or the supplied number does not match one Lofty holds for the
 * lead — Lofty falls back to the lead's own number. So the same action sends to
 * a specific number or to "the lead", and the response echoes which number was
 * actually used. That echo is worth forwarding: it is how a workflow tells
 * whether it hit the intended recipient.
 *
 * ## Sending twice sends twice
 *
 * There is no deduplication key, so a retried step delivers a second message.
 * `idempotent` is `false`.
 */
interface Input {
  leadId: number;
  content: string;
  phoneNumber?: string;
  phoneCode?: string;
}

const action: ActionDefinition<Input> = {
  key: "sms-send",
  type: "perform",
  resource: "message",
  title: "Send SMS",
  description:
    "Send an SMS to a lead from the connection's Lofty number (POST /v1.0/message/sms/send).",
  idempotent: false,
  params: [
    leadIdParam,
    { key: "content", label: "Message", type: "text", required: true },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint: "Optional. Omit to use the lead's own number — the response reports which was used.",
    },
    {
      key: "phoneCode",
      label: "Country code",
      type: "string",
      placeholder: "1",
      hint: "Country dialling code for an explicit number, e.g. 1.",
    },
  ],
  output: [
    { key: "messageId", type: "string", label: "SMS message ID" },
    { key: "phoneNumber", type: "string", label: "Number used" },
    { key: "phoneCode", type: "string", label: "Country code used" },
  ],

  execute(input, ctx) {
    const body = compact({
      leadId: input.leadId,
      content: input.content,
      phoneNumber: input.phoneNumber,
      phoneCode: input.phoneCode,
    });
    return new LoftyClient(ctx).request("/message/sms/send", { method: "POST", body });
  },
};

export default action;
