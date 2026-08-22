import type { ActionDefinition } from "@w6w/types";
import { compact, csv, FrontClient } from "../lib/client.ts";

/**
 * `POST /channels/{channel_id}/messages` — verified against Front's own OpenAPI
 * document (`create-message`).
 *
 * **This is how a new customer conversation starts.** `conversation-create`
 * makes an internal discussion nobody outside the company can see; this sends
 * an actual message out through a channel, and Front wraps a new conversation
 * around it. Which of the two a workflow wants is decided by whether a customer
 * is meant to receive anything.
 *
 * The channel decides the medium and the sending identity — an email channel
 * sends email from its own address, an SMS channel sends SMS. `channel-list`
 * enumerates them with their ids and types; there is no "send from the company"
 * without naming one.
 *
 * `to` is required and holds **handles**, not contact ids: an address, a phone
 * number, a Twitter handle — whatever the channel speaks. A `cnt_…` id here
 * fails.
 *
 * Attachments need `multipart/form-data` with binary parts the sandbox cannot
 * produce, so they are out of scope.
 */
const action: ActionDefinition = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send message",
  description:
    "Send a new outbound message through a channel, starting a conversation. Recipients are " +
    "handles (address, phone number), not contact ids.",
  idempotent: false,
  params: [
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "cha_55c8c149",
      hint: "Which channel to send from — it decides the medium and the from-address. List " +
        "Channels has the ids.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      default: "",
      placeholder: "ada@example.com",
      hint: "Comma-separated handles for the channel's medium — an address for email, a number " +
        "for SMS. NOT a contact id.",
    },
    { key: "subject", label: "Subject", type: "string", default: "" },
    {
      key: "body",
      label: "Body",
      type: "text",
      required: true,
      default: "",
      hint: "HTML for email channels.",
    },
    {
      key: "authorId",
      label: "Send As Teammate",
      type: "string",
      default: "",
      hint: "Attributes the message to a person rather than to the API token.",
    },
    { key: "cc", label: "CC", type: "string", default: "", advanced: true },
    { key: "bcc", label: "BCC", type: "string", default: "", advanced: true },
    { key: "senderName", label: "Sender Name", type: "string", default: "", advanced: true },
    {
      key: "text",
      label: "Plain Text Body",
      type: "text",
      default: "",
      advanced: true,
      hint: "The plain-text alternative for email clients that will not render HTML.",
    },
    {
      key: "archive",
      label: "Archive After Sending",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Front's default here is also `true` — an outbound message archives its own new " +
        "conversation unless told not to. Sent explicitly either way.",
    },
    {
      key: "tagIds",
      label: "Tag The Conversation",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated tag ids to put on the conversation this message creates.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "created_at", type: "number", label: "Created At" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const channelId = String(p.channelId ?? "");
    if (!channelId) throw new Error("`channelId` is required");
    const to = csv(p.to);
    if (!to) throw new Error("`to` is required — Front needs at least one recipient handle");
    const body = String(p.body ?? "");
    if (!body.trim()) throw new Error("`body` is required");

    // Explicit, for the same reason as the reply action: Front's own default
    // archives the conversation this message creates.
    const archive = p.archive === true;
    const tagIds = csv(p.tagIds);

    const payload = {
      to,
      body,
      ...compact({
        subject: p.subject,
        text: p.text,
        author_id: p.authorId,
        sender_name: p.senderName,
        cc: csv(p.cc),
        bcc: csv(p.bcc),
      }),
      options: { archive, ...(tagIds ? { tag_ids: tagIds } : {}) },
    };

    ctx.log("info", "sending Front message", { channelId, recipients: to.length, archive });
    return await new FrontClient(ctx).request(
      `/channels/${encodeURIComponent(channelId)}/messages`,
      { method: "POST", body: payload },
    );
  },
};

export default action;
