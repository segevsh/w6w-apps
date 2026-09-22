import type { ActionDefinition } from "@w6w/types";
import { encodeId, SendfoxClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /campaigns/{id}/send` — send a campaign now.
 *
 * No request body. The campaign is queued for immediate sending and the response
 * is the updated bare `Campaign`.
 *
 * ## Never mark this idempotent
 *
 * A retry does not "send the same campaign again" in any recoverable sense — it
 * is a second send attempt against a campaign whose state has already changed,
 * and SendFox's own preconditions (not already sent or scheduled, at least one
 * list assigned, not a confirmation email, not in a warmup/throttle window) are
 * exactly the things a retry is likely to trip. The runtime may retry an action
 * marked idempotent, so this is declared `idempotent: false`.
 *
 * The documented refusals are all distinct and all mean something different:
 *
 *  - `400` — the campaign has no lists assigned.
 *  - `403` — cannot send; a large campaign is already scheduled and must finish
 *    first.
 *  - `409` — already sent or scheduled, or it is a double opt-in confirmation
 *    email, which is delivered per subscriber and never as a broadcast.
 */
interface Input {
  id: number;
}

const campaignSend: ActionDefinition<Input> = {
  key: "campaign-send",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign",
  description: "Send a draft campaign immediately. Requires the campaign to have a list assigned.",
  idempotent: false,
  params: [
    idParam("id", "Campaign", "Campaign id of the draft to send."),
  ],
  output: [
    { key: "id", type: "number", label: "Campaign id" },
    { key: "title", type: "string", label: "Internal title" },
    { key: "scheduled_at", type: "string", label: "Scheduled at" },
    { key: "sent_at", type: "string", label: "Sent at" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json(`/campaigns/${encodeId(input.id)}/send`, { method: "POST" });
  },
};

export default campaignSend;
