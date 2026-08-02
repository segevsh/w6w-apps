import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch, postmarkJsonInit } from "../lib/client.ts";

interface Input {
  bounceId: string;
}

/**
 * `PUT /bounces/{bounceid}/activate` — reactivate an address Postmark
 * deactivated after a bounce, so future sends to it are attempted again.
 * https://postmarkapp.com/developer/api/bounce-api#activate-a-bounce
 */
const activateBounce: ActionDefinition<Input> = {
  key: "activate-bounce",
  type: "perform",
  resource: "bounce",
  title: "Activate Bounce",
  description: "Reactivate a deactivated recipient address for a specific bounce.",
  idempotent: true,
  params: [
    { key: "bounceId", label: "Bounce ID", type: "string", required: true },
  ],
  output: [
    { key: "Message", type: "string", label: "Status Message" },
    { key: "Bounce", type: "object", label: "Bounce" },
  ],

  async execute(input, ctx) {
    if (!input.bounceId) throw new Error("activate-bounce requires `bounceId`");
    return await postmarkFetch(
      ctx,
      `/bounces/${encodeURIComponent(input.bounceId)}/activate`,
      postmarkJsonInit("PUT", {}),
    );
  },
};

export default activateBounce;
