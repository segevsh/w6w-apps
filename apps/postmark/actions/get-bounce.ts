import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch } from "../lib/client.ts";

interface Input {
  bounceId: string;
}

/**
 * `GET /bounces/{bounceid}` — full details for a single bounce.
 * https://postmarkapp.com/developer/api/bounce-api#bounce
 */
const getBounce: ActionDefinition<Input> = {
  key: "get-bounce",
  type: "read",
  resource: "bounce",
  title: "Get Bounce",
  description: "Get full details for a single bounce by ID.",
  params: [
    { key: "bounceId", label: "Bounce ID", type: "string", required: true },
  ],
  output: [
    { key: "ID", type: "number", label: "Bounce ID" },
    { key: "Type", type: "string", label: "Type" },
    { key: "Email", type: "string", label: "Email" },
    { key: "BouncedAt", type: "string", label: "Bounced At" },
    { key: "Inactive", type: "boolean", label: "Inactive" },
    { key: "CanActivate", type: "boolean", label: "Can Activate" },
  ],

  async execute(input, ctx) {
    if (!input.bounceId) throw new Error("get-bounce requires `bounceId`");
    return await postmarkFetch(ctx, `/bounces/${encodeURIComponent(input.bounceId)}`);
  },
};

export default getBounce;
