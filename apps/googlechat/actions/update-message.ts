import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, messageName } from "../lib/client.ts";

interface Input {
  space: string;
  message: string;
  text: string;
  allowMissing?: boolean;
}

/**
 * `spaces.messages.patch` — PATCH /v1/{message.name=spaces/*&#47;messages/*}
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/patch
 *
 * PATCH rather than the sibling `update` (PUT): the two take identical
 * parameters and Google documents them as equivalent, and a partial update is
 * the honest verb for a call that only ever writes `text`.
 *
 * `updateMask` is pinned to `text` rather than exposed, because it is the only
 * supported field path a *user* credential can write — `cards`, `cards_v2` and
 * `accessory_widgets` are all documented as requiring app authentication.
 */
const updateMessage: ActionDefinition<Input> = {
  key: "update-message",
  type: "perform",
  resource: "message",
  title: "Update Message",
  description:
    "Replace the text of an existing message. Only `text` is writable with a user connection — editing cards requires app (bot) authentication.",
  // Writing the same text twice converges on the same state.
  idempotent: true,
  params: [
    {
      key: "space",
      label: "Space",
      type: "string",
      required: true,
      hint: "The space id, or the full resource name `spaces/{space}`.",
      placeholder: "spaces/AAAAAAAAAAA",
    },
    {
      key: "message",
      label: "Message",
      type: "string",
      required: true,
      hint:
        "The message id, a `client-` custom id, or the full resource name `spaces/{space}/messages/{message}`.",
      placeholder: "BBBBBBBBBBB.BBBBBBBBBBB",
    },
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "allowMissing",
      label: "Create if missing",
      type: "boolean",
      hint:
        "When true and the message does not exist, it is created instead. Only works with a `client-` custom id.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "text", type: "string", label: "Text" },
    { key: "lastUpdateTime", type: "string", label: "Last updated at" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    return await client.request(`/${messageName(input.space, input.message)}`, {
      method: "PATCH",
      body: { text: input.text },
      query: { updateMask: "text", allowMissing: input.allowMissing },
    });
  },
};

export default updateMessage;
