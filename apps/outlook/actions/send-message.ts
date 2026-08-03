import type { ActionDefinition } from "@w6w/types";
import { GraphClient } from "../lib/client.ts";
import { buildMessage, type MessageInput } from "../lib/message.ts";
import { messageBodyParams } from "../lib/params.ts";

interface Input extends MessageInput {
  saveToSentItems?: boolean;
}

/**
 * `POST /me/sendMail` — compose and send in one call.
 *
 * https://learn.microsoft.com/en-us/graph/api/user-sendmail
 *
 * Graph wraps the message under a `message` key and takes `saveToSentItems`
 * beside it. The reply is `202 Accepted` with an empty body, and the docs are
 * explicit that 202 means *accepted*, not *delivered* — so the only thing worth
 * returning is the status.
 *
 * Requires the `Mail.Send` scope.
 */
const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Compose and send an email, saving it to Sent Items.",
  // Graph exposes no idempotency key on sendMail, so a retry sends a second
  // copy. Saying otherwise would license the runtime to replay it.
  idempotent: false,
  params: [
    ...messageBodyParams(),
    {
      key: "saveToSentItems",
      label: "Save to Sent Items",
      type: "boolean",
      default: true,
      advanced: true,
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    const body: Record<string, unknown> = { message: buildMessage(input) };
    // Graph's own note: "Specify it only if the parameter is false; default is true."
    if (input.saveToSentItems === false) body.saveToSentItems = false;
    return client.status("/me/sendMail", { method: "POST", body });
  },
};

export default sendMessage;
