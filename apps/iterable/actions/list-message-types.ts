import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/**
 * `GET /api/messageTypes` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "list-message-types",
  type: "read",
  resource: "channel",
  title: "List Message Types",
  description: "Message types in the project.",
  params: [],
  output: [
    { key: "messageTypes", type: "array", label: "Message types" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "Iterable List Message Types");
    const out = await call(ctx, "GET", "/messageTypes");
    return out;
  },
};

export default action;
