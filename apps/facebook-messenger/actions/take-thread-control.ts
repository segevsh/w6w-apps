import type { ActionDefinition } from "@w6w/types";
import { MessengerClient, pageSegment, requireString } from "../lib/client.ts";

interface Input {
  recipientId: string;
  metadata?: string;
  pageId?: string;
}

/**
 * Take a conversation back — `POST /{page}/take_thread_control`. Works when the thread is
 * idle or the calling app is the Primary Receiver; with zero config (no default app set
 * on the Page) Meta blocks this call.
 */
const takeThreadControl: ActionDefinition<Input, { success: boolean }> = {
  key: "take-thread-control",
  type: "perform",
  resource: "thread",
  title: "Take Thread Control",
  description: "Take control of a conversation that is idle or owned by another app.",
  idempotent: true,
  params: [
    { key: "recipientId", label: "Person (PSID)", type: "string", required: true },
    {
      key: "metadata",
      label: "Metadata",
      type: "string",
      hint: "Context delivered to the other app in the handover webhook.",
    },
    { key: "pageId", label: "Page ID", type: "string", hint: "Defaults to `me`." },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new MessengerClient(ctx).request<{ success: boolean }>(
      `/${pageSegment(input.pageId)}/take_thread_control`,
      {
        method: "POST",
        query: {
          recipient: JSON.stringify({ id: requireString("recipientId", input.recipientId) }),
          metadata: input.metadata,
        },
      },
    );
  },
};

export default takeThreadControl;
