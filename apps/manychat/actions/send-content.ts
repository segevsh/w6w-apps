import type { ActionDefinition } from "@w6w/types";
import { compact, ManychatClient, type ManychatEnvelope } from "../lib/client.ts";

interface Input {
  subscriberId: string;
  data: unknown;
  messageTag?: string;
  otnTopicName?: string;
}

/**
 * Send an ad-hoc message to a subscriber, composed in Manychat's Dynamic Block
 * format.
 *
 * `POST /fb/sending/sendContent` with `{ subscriber_id, data, message_tag?,
 * otn_topic_name? }` → `{ status: "success" }`.
 *
 * ## `data` is passed through, and that is deliberate
 *
 * The OpenAPI document types `data` as bare `{"type":"object",
 * "additionalProperties":false}` — it declares **no structure at all**. The real
 * schema lives in a separate repository, `github.com/manychat/dynamic_block_docs`
 * (read 2026-08-03), whose README documents the format as:
 *
 *     {
 *       "version": "v2",
 *       "content": {
 *         "messages": [ { "type": "text", "text": "…" } ],
 *         "actions": [],        // optional
 *         "quick_replies": []   // optional
 *       }
 *     }
 *
 * with `type` one of `text`, `image`, `video`, `audio`, `file`, `cards`, `list`
 * and so on, per channel, plus documented ceilings: **max 10 messages, 11 quick
 * replies, 5 actions** per block. That vocabulary differs per channel — the
 * repository ships a separate reference for Instagram, WhatsApp and Telegram —
 * and it is versioned independently of the API.
 *
 * So this action takes `data` as an opaque object and forwards it unchanged
 * rather than modelling it into typed params. Modelling it would mean encoding a
 * vocabulary the API itself does not publish, freezing a `v2` that is explicitly
 * versioned, and getting between the author and the vendor's own reference — for
 * no gain, because the vendor's docs are the thing you would have to read either
 * way. The block ceilings are stated in the hint so they are visible where the
 * payload is written.
 *
 * ## `message_tag` and `otn_topic_name` — the two escape hatches
 *
 * These exist because the 24-hour messaging window exists. Their presence on
 * *this* endpoint and absence from `sendFlow` is the strongest primary evidence
 * in the spec that Meta's window governs sends here:
 *
 *   - **`message_tag`** — Meta's fixed vocabulary of non-promotional reasons
 *     (the spec's example is `ACCOUNT_UPDATE`). Meta owns the list and enforces
 *     what qualifies; misusing a tag for marketing is a policy violation, not a
 *     clever trick. This app does not enumerate the values as a `select`,
 *     because the list is Meta's and changes on Meta's schedule — a stale
 *     dropdown would be worse than a free-text field pointing at the real source.
 *   - **`otn_topic_name`** — spends a One-Time Notification permission the
 *     subscriber granted for that named topic. Takes the **name**, from
 *     `list-otn-topics`, not the id.
 *
 * Both are optional and neither is set by default: sending inside the window
 * needs neither, and silently attaching a tag to every message would be putting
 * words in the sender's mouth about *why* they are allowed to send.
 *
 * ## Two failure modes worth knowing before you use this
 *
 *   1. **Outside the window without a tag, the send is refused.** Manychat's
 *      community threads report the error as, verbatim: *"Content can't be sent
 *      to subscriber id='xxx' without message tag. Subscriber's last interaction
 *      was over XXh ago (more than 24 hours ago)"*. That is a forum quotation,
 *      not primary documentation — flagged as such — but it matches the spec's
 *      parameter set exactly. `get-subscriber`'s `last_interaction` is the clock
 *      it is read against.
 *   2. **`status: "success"` is an acceptance, not a delivery receipt.** The
 *      response envelope carries no message id and no delivery state, and there
 *      are community reports of a successful `sendContent` whose Instagram image
 *      never arrived. Do not treat a success here as proof a human saw anything.
 *
 * `idempotent: false` — a retry delivers the message twice.
 */
const sendContent: ActionDefinition<Input> = {
  key: "send-content",
  type: "perform",
  idempotent: false,
  resource: "sending",
  title: "Send Content",
  description: "Send an ad-hoc message built in Manychat's Dynamic Block format " +
    "(POST /fb/sending/sendContent). Outside Meta's 24-hour window this is refused unless a " +
    "`messageTag` or `otnTopicName` is supplied. Success means accepted, not delivered.",
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    {
      key: "data",
      label: "Dynamic Block payload",
      type: "json",
      required: true,
      hint: '`{ "version": "v2", "content": { "messages": [ { "type": "text", ' +
        '"text": "hi" } ] } }`. Max 10 messages, 11 quick replies, 5 actions. Block ' +
        "vocabulary differs per channel — see github.com/manychat/dynamic_block_docs.",
    },
    {
      key: "messageTag",
      label: "Message tag",
      type: "string",
      hint:
        "Meta's non-promotional reason code, e.g. `ACCOUNT_UPDATE` — required to send outside " +
        "the 24-hour window. Meta owns the list and enforces what qualifies.",
    },
    {
      key: "otnTopicName",
      label: "OTN topic name",
      type: "string",
      hint: "The topic NAME from List OTN Topics. Spends a One-Time Notification permission.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new ManychatClient(ctx).post<ManychatEnvelope>(
      "/fb/sending/sendContent",
      compact({
        subscriber_id: input.subscriberId,
        data: input.data,
        message_tag: input.messageTag,
        otn_topic_name: input.otnTopicName,
      }),
    );
  },
};

export default sendContent;
