import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /inboxes` — verified against Front's own OpenAPI document
 * (`list-inboxes`).
 *
 * The shared inboxes this token can see. An inbox is the routing unit —
 * support@, billing@, the SMS line — and every id another action asks for
 * (`inbox_id` on a discussion, on a conversation move) comes from here.
 *
 * An inbox is **not** a channel: one inbox can hold several channels (an email
 * address and a chat widget both landing in "Support"), which is why moving a
 * conversation and choosing where a reply goes out are two different fields.
 */
const action: ActionDefinition = {
  key: "inbox-list",
  type: "read",
  resource: "inbox",
  title: "List inboxes",
  description:
    "The shared inboxes this token can see, with the ids other actions ask for. An inbox holds " +
    "channels; it is not one itself.",
  params: [...LIST_PARAMS],
  output: [
    { key: "id", type: "string", label: "Inbox ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_private", type: "boolean", label: "Private" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new FrontClient(ctx).requestAll("/inboxes", {}, returnAll ? Infinity : limit);
  },
};

export default action;
