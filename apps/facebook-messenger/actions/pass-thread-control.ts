import type { ActionDefinition } from "@w6w/types";
import { MessengerClient, pageSegment, requireString } from "../lib/client.ts";

interface Input {
  recipientId: string;
  targetAppId: string;
  metadata?: string;
  pageId?: string;
}

/**
 * Hand a conversation to another app — `POST /{page}/pass_thread_control` with
 * `recipient={"id":PSID}`, `target_app_id` and optional `metadata`, as Conversation Routing
 * documents it. Handover Protocol is retired; Meta migrated every business to Conversation
 * Routing, which keeps this call. Use 263902037430900 as the target for the Page Inbox and
 * 1217981644879628 for the Instagram Inbox.
 */
const passThreadControl: ActionDefinition<Input, { success: boolean }> = {
  key: "pass-thread-control",
  type: "perform",
  resource: "thread",
  title: "Pass Thread Control",
  description: "Pass a conversation to another app (Conversation Routing).",
  idempotent: false,
  params: [
    { key: "recipientId", label: "Person (PSID)", type: "string", required: true },
    {
      key: "targetAppId",
      label: "Target app ID",
      type: "string",
      required: true,
      hint: "Page Inbox is 263902037430900.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "string",
      hint: "Context delivered to the receiving app in the handover webhook.",
    },
    { key: "pageId", label: "Page ID", type: "string", hint: "Defaults to `me`." },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new MessengerClient(ctx).request<{ success: boolean }>(
      `/${pageSegment(input.pageId)}/pass_thread_control`,
      {
        method: "POST",
        query: {
          recipient: JSON.stringify({ id: requireString("recipientId", input.recipientId) }),
          target_app_id: requireString("targetAppId", input.targetAppId),
          metadata: input.metadata,
        },
      },
    );
  },
};

export default passThreadControl;
