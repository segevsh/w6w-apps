import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /channels` — verified against Front's own OpenAPI document
 * (`list-channels`).
 *
 * A channel is a *way of sending*: an email address, an SMS number, a chat
 * widget. `message-send` requires one by id, and there is no "send from the
 * company" without naming it, so this is the lookup that makes outbound work.
 *
 * Each channel carries a `types` value (`smtp`, `imap`, `twilio`, `front_chat`,
 * `custom`, …) and its `address`, which together tell a workflow whether a
 * given recipient handle can be reached on it — sending an email body to an SMS
 * channel is accepted by the API and mangled by the medium.
 */
const action: ActionDefinition = {
  key: "channel-list",
  type: "read",
  resource: "channel",
  title: "List channels",
  description:
    "The channels messages can be sent from — address, type and id. Send Message needs one of " +
    "these ids.",
  params: [...LIST_PARAMS],
  output: [
    { key: "id", type: "string", label: "Channel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "string", label: "Address" },
    { key: "type", type: "string", label: "Type" },
    { key: "is_private", type: "boolean", label: "Private" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new FrontClient(ctx).requestAll("/channels", {}, returnAll ? Infinity : limit);
  },
};

export default action;
