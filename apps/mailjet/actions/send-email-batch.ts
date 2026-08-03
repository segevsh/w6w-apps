import type { ActionDefinition } from "@w6w/types";
import { MailjetClient, SEND_V31 } from "../lib/client.ts";
import type { MailjetMessage, SendResponse } from "./send-email.ts";

interface Input {
  messages: MailjetMessage[];
  sandboxMode?: boolean;
}

/**
 * Send many messages in one v3.1 call, passing the `Messages` array through
 * verbatim.
 *
 * This is the escape hatch from `send-email`'s convenience layer. `send-email`
 * parses `"Ada <a@x.com>, Bo <b@x.com>"` into address objects and drops empty
 * fields; here the caller hands over exactly what Mailjet will receive. That is
 * the right shape when the array is being built upstream — by a `data` step, a
 * template renderer, or another action's output — because a batch's whole point
 * is that each message differs.
 *
 * **50 messages per call**, per Mailjet's own comparison of the two send APIs:
 * v3.1 "allows you to send up to 50 messages in a single API call, as opposed to
 * v3, where the limit is 100". This action does not enforce that — Mailjet
 * rejects an over-long array itself with a clear error, and silently truncating
 * a caller's batch would be worse than surfacing the vendor's own complaint.
 *
 * Mailjet preserves input order in the response ("The messages' order is
 * preserved from the user input"), so `Messages[i]` in the response corresponds
 * to `messages[i]` in the request — which is the only way to attribute a partial
 * failure, and the reason this action does not reorder or filter the array.
 */
const sendEmailBatch: ActionDefinition<Input> = {
  key: "send-email-batch",
  type: "perform",
  /** Retrying delivers every message in the batch twice. */
  idempotent: false,
  resource: "email",
  title: "Send Email Batch",
  description:
    "Send up to 50 messages in one v3.1 call, passing the `Messages` array through as-is. " +
    "Response order matches request order. Individual messages can fail inside a 200 response " +
    "— inspect every `Messages[i].Status`.",
  params: [
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: 'JSON array of v3.1 message objects, e.g. `[{"From":{"Email":"a@x.com"},' +
        '"To":[{"Email":"b@x.com"}],"Subject":"Hi","TextPart":"..."}]`. Max 50.',
    },
    {
      key: "sandboxMode",
      label: "Sandbox mode",
      type: "boolean",
      hint: "Validate every message and return the usual response without delivering anything.",
    },
  ],
  output: [
    {
      key: "Messages",
      type: "array",
      label: "Messages",
    },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    const body: Record<string, unknown> = { Messages: input.messages };
    if (input.sandboxMode) body.SandboxMode = true;
    return client.request<SendResponse>(SEND_V31, { method: "POST", body });
  },
};

export default sendEmailBatch;
