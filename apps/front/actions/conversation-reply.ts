import type { ActionDefinition } from "@w6w/types";
import { compact, csv, FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `POST /conversations/{conversation_id}/messages` — verified against Front's
 * own OpenAPI document (`create-conversation-message`).
 *
 * ## Replying archives the conversation unless you say otherwise
 *
 * This is the sharpest edge in Front's API, and it is easy to miss: the request
 * body's `options.archive` **defaults to `true`**. Send a reply with no options
 * and the conversation leaves the queue — which is right for "answered, done"
 * and wrong for every workflow that replies with an acknowledgement and expects
 * a human to pick the thread up afterwards. Those conversations vanish from the
 * inbox and nobody notices until the customer chases.
 *
 * So this action makes the choice visible: **Archive After Sending** is a param
 * with `false` as its default, deliberately inverting Front's default rather
 * than inheriting it, and the value is always sent explicitly so the API's
 * default can never apply by omission.
 *
 * ## Who it comes from
 *
 * `author_id` sets the teammate the reply is sent on behalf of. Without it the
 * message is attributed to the API token, which the customer sees as the
 * integration rather than a person.
 *
 * `channel_id` picks which channel it goes out on. Omitted, Front replies on
 * the channel the conversation arrived through — usually what you want, and the
 * reason it is optional.
 *
 * ## Rate limiting is per conversation
 *
 * Front caps message endpoints at **5 requests per second per conversation or
 * channel**, separately from the company allowance. Fanning out across many
 * conversations is fine; a loop that replies repeatedly to one is not.
 *
 * Attachments would need `multipart/form-data` with binary parts the sandbox
 * has no way to produce, so they are out of scope.
 */
const action: ActionDefinition = {
  key: "conversation-reply",
  type: "perform",
  resource: "message",
  title: "Reply to conversation",
  description:
    "Send a message into an existing conversation. Front archives on reply by default — this " +
    "action does not, and always says which it means.",
  idempotent: false,
  params: [
    CONVERSATION_PARAM,
    {
      key: "body",
      label: "Body",
      type: "text",
      required: true,
      default: "",
      hint: "HTML for email channels.",
    },
    {
      key: "archive",
      label: "Archive After Sending",
      type: "boolean",
      default: false,
      hint: "⚠️ Front's own default is `true` — a reply normally takes the conversation out of " +
        "the queue. This action defaults to leaving it open and always sends the choice " +
        "explicitly.",
    },
    {
      key: "authorId",
      label: "Send As Teammate",
      type: "string",
      default: "",
      placeholder: "tea_55c8c149",
      hint: "Without this the reply is attributed to the API token, which the customer sees as " +
        "a robot.",
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Which channel to send from. Omitted, Front uses the one the conversation arrived " +
        "on.",
    },
    { key: "subject", label: "Subject", type: "string", default: "", advanced: true },
    {
      key: "to",
      label: "To",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated handles. Omitted, Front replies to the conversation's recipients.",
    },
    { key: "cc", label: "CC", type: "string", default: "", advanced: true },
    { key: "bcc", label: "BCC", type: "string", default: "", advanced: true },
    {
      key: "senderName",
      label: "Sender Name",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "text",
      label: "Plain Text Body",
      type: "text",
      default: "",
      advanced: true,
      hint: "The plain-text alternative for email clients that will not render HTML.",
    },
    {
      key: "tagIds",
      label: "Tag The Conversation",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated tag ids to add while replying. Additive, like Add Tags.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "is_draft", type: "boolean", label: "Draft" },
    { key: "created_at", type: "number", label: "Created At" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");
    const body = String(p.body ?? "");
    if (!body.trim()) throw new Error("`body` is required");

    // ALWAYS explicit. Front's default for this field is `true`, so omitting it
    // would archive the conversation on the caller's behalf.
    const archive = p.archive === true;
    const tagIds = csv(p.tagIds);

    const payload = {
      body,
      ...compact({
        subject: p.subject,
        text: p.text,
        author_id: p.authorId,
        channel_id: p.channelId,
        sender_name: p.senderName,
        to: csv(p.to),
        cc: csv(p.cc),
        bcc: csv(p.bcc),
      }),
      options: { archive, ...(tagIds ? { tag_ids: tagIds } : {}) },
    };

    ctx.log("info", "replying to Front conversation", { conversationId, archive });
    return await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      { method: "POST", body: payload },
    );
  },
};

export default action;
