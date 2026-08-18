import type { ActionDefinition } from "@w6w/types";
import { compact, ResendClient } from "../lib/client.ts";

/**
 * `POST /broadcasts` — verified against Resend's OpenAPI document, whose body
 * requires **`from`, `subject` and `segment_id`**. The segment is what a
 * broadcast is addressed to; `audience_id` is a separate optional field, and
 * omitting the segment is a validation error rather than "send to everyone".
 *
 * Creating a broadcast does not send it. `send: true` or a `scheduled_at` on
 * this call will, and so will `broadcast-send` afterwards — which is the path
 * a review step usually wants.
 */
const action: ActionDefinition = {
  key: "broadcast-create",
  type: "perform",
  resource: "broadcast",
  title: "Create a broadcast",
  description: "Draft a broadcast to a segment. It is not sent until you send or schedule it.",
  idempotent: false,
  params: [
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      required: true,
      default: "",
      hint: "Resend requires a segment on every broadcast.",
    },
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      default: "",
      placeholder: "Acme <news@example.com>",
    },
    { key: "subject", label: "Subject", type: "string", required: true, default: "" },
    { key: "name", label: "Name", type: "string", default: "", hint: "Internal label." },
    { key: "html", label: "HTML Body", type: "text", default: "" },
    { key: "text", label: "Plain Text Body", type: "text", default: "" },
    { key: "replyTo", label: "Reply-To", type: "string", default: "" },
    { key: "previewText", label: "Preview Text", type: "string", default: "" },
    { key: "audienceId", label: "Audience ID", type: "string", default: "" },
    {
      key: "scheduledAt",
      label: "Send At",
      type: "string",
      default: "",
      hint: "Set to schedule on create. Leave blank to draft it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Broadcast ID" },
    { key: "object", type: "string", label: "Object type" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const from = String(p.from ?? "").trim();
    const subject = String(p.subject ?? "").trim();
    const segmentId = String(p.segmentId ?? "").trim();
    if (!from) throw new Error("`from` is required");
    if (!subject) throw new Error("`subject` is required");
    if (!segmentId) throw new Error("`segmentId` is required — Resend scopes broadcasts to one");
    if (!p.html && !p.text) {
      throw new Error("set `html`, `text`, or both — a broadcast needs a body");
    }

    const body = compact({
      segment_id: segmentId,
      from,
      subject,
      name: p.name,
      html: p.html,
      text: p.text,
      reply_to: p.replyTo,
      preview_text: p.previewText,
      audience_id: p.audienceId,
      scheduled_at: p.scheduledAt,
    });

    ctx.log("info", "creating Resend broadcast", { subject, segmentId });

    return await new ResendClient(ctx).request("/broadcasts", { method: "POST", body });
  },
};

export default action;
