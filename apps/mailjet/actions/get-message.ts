import type { ActionDefinition } from "@w6w/types";
import { MailjetClient, type MailjetEnvelope } from "../lib/client.ts";
import type { MailjetMessageRecord } from "./list-messages.ts";

interface Input {
  messageId: string;
}

/**
 * Fetch one message's delivery record by its numeric `MessageID`.
 *
 * The ID to use is `MessageID` from a send response — **not** `MessageUUID`. The
 * two travel together and are easy to swap: a v3.1 send returns
 * `{"MessageUUID": "cb927469-...", "MessageID": 70650219165027410,
 * "MessageHref": "https://api.mailjet.com/v3/REST/message/70650219165027410"}`,
 * and Mailjet's own docs point out that `MessageHref` "is made of the API Base
 * URL, the message resource path and the message ID (not UUID)". Passing the UUID
 * here returns a 404 that looks like the message does not exist.
 *
 * `MessageID` values exceed 2^53 — Mailjet's own example, `70650219165027410`,
 * does not. But they are large enough that this action takes the ID as a
 * **string** rather than a number, so an ID that has been through a JSON parser
 * as text is not silently mangled by a float round-trip on the way back out.
 */
const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description:
    "Fetch one message's delivery record (GET /v3/REST/message/{id}). Takes the numeric " +
    "`MessageID`, NOT the `MessageUUID` — passing the UUID returns a 404.",
  params: [
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "The numeric `MessageID` from a send response or from `list-messages`.",
    },
  ],
  output: [
    { key: "Data", type: "array", label: "Message" },
    { key: "Count", type: "number", label: "Count" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetMessageRecord>>(
      `/message/${encodeURIComponent(input.messageId)}`,
    );
  },
};

export default getMessage;
