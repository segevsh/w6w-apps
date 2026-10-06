import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  profileUrl: string;
  callbackUrl?: string;
}

/** `GET /profile/email` */
const workEmailLookup: ActionDefinition<Input> = {
  key: "work-email-lookup",
  type: "read",
  resource: "contact",
  title: "Request Work Email",
  description:
    "Queue a work-email lookup for a person profile (3 credits). The lookup may not finish immediately: pass a callback URL and Enrich Layer calls it once with the result. Only the queue length comes back synchronously.",
  params: [
    { key: "profileUrl", label: "Profile URL", type: "string", required: true },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      hint: "Webhook Enrich Layer calls once with the result.",
    },
  ],
  output: [
    { key: "emailQueueCount", type: "number", label: "Lookups queued ahead of this one" },
    { key: "result", type: "object", label: "The full response body" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/profile/email", {
      profile_url: input.profileUrl,
      callback_url: input.callbackUrl,
    });
    return {
      emailQueueCount: (res as { email_queue_count?: number }).email_queue_count ?? null,
      result: res,
    };
  },
};

export default workEmailLookup;
