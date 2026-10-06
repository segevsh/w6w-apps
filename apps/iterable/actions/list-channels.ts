import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/**
 * `GET /api/channels` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "list-channels",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description: "Message channels in the project.",
  params: [],
  output: [
    { key: "channels", type: "array", label: "Channels (id, name, channelType, messageMedium)" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "Iterable List Channels");
    const out = await call(ctx, "GET", "/channels");
    return out;
  },
};

export default action;
