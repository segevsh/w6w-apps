import type { ActionDefinition } from "@w6w/types";
import { intList, jsonValue, type Params, payload, ZulipClient } from "../lib/client.ts";

interface Input {
  anchor?: string | number;
  num_before?: number;
  num_after?: number;
  channel?: string;
  topic?: string;
  narrow?: unknown;
  message_ids?: unknown;
  include_anchor?: boolean;
  apply_markdown?: boolean;
}

const getMessages: ActionDefinition<Input> = {
  key: "get-messages",
  type: "search",
  resource: "message",
  title: "List Messages",
  description:
    "Fetch messages around an anchor, optionally filtered by a narrow or by channel/topic shortcuts, or fetch specific message IDs (GET /messages). Page backwards by passing the oldest returned id as the anchor.",
  params: [
    {
      "key": "anchor",
      "label": "Anchor",
      "type": "string",
      "hint": "A message ID, or `newest`, `oldest`, `first_unread`. Default `newest`.",
    },
    {
      "key": "num_before",
      "label": "Messages before anchor",
      "type": "number",
      "hint": "Default 20.",
    },
    {
      "key": "num_after",
      "label": "Messages after anchor",
      "type": "number",
      "hint": "Default 0.",
    },
    {
      "key": "channel",
      "label": "Channel",
      "type": "string",
      "hint": "Shortcut for a `channel` narrow term (name or ID).",
    },
    {
      "key": "topic",
      "label": "Topic",
      "type": "string",
      "hint": "Shortcut for a `topic` narrow term; combine with Channel.",
    },
    {
      "key": "narrow",
      "label": "Narrow",
      "type": "json",
      "hint":
        'Zulip narrow, e.g. [{"operator":"sender","operand":"bot@acme.zulipchat.com"}]. Added to the shortcuts above.',
    },
    {
      "key": "message_ids",
      "label": "Message IDs",
      "type": "string",
      "hint":
        "Comma-separated IDs to fetch instead of a range; cannot be combined with the anchor/count fields.",
    },
    {
      "key": "include_anchor",
      "label": "Include anchor message",
      "type": "boolean",
    },
    {
      "key": "apply_markdown",
      "label": "Render Markdown as HTML",
      "type": "boolean",
      "hint":
        "Default false here (Zulip itself defaults to true): returns the Markdown the sender typed.",
    },
  ],
  output: [
    {
      "key": "messages",
      "type": "array",
      "label": "Matching messages",
    },
    {
      "key": "anchor",
      "type": "number",
      "label": "Anchor message ID used",
    },
    {
      "key": "found_anchor",
      "type": "boolean",
      "label": "Whether the anchor message matched",
    },
    {
      "key": "found_oldest",
      "type": "boolean",
      "label": "No older messages match",
    },
    {
      "key": "found_newest",
      "type": "boolean",
      "label": "No newer messages match",
    },
    {
      "key": "history_limited",
      "type": "boolean",
      "label": "History hidden by plan limits",
    },
  ],

  async execute(input, ctx) {
    const terms: unknown[] = [];
    const parsed = jsonValue(input.narrow);
    if (Array.isArray(parsed)) terms.push(...parsed);
    else if (parsed !== undefined) throw new Error("get-messages: `narrow` must be a JSON array");
    const channel = String(input.channel ?? "").trim();
    const topic = String(input.topic ?? "").trim();
    if (channel) {
      terms.push({
        operator: "channel",
        operand: /^\d+$/.test(channel) ? Number(channel) : channel,
      });
    }
    if (topic) terms.push({ operator: "topic", operand: topic });

    const ids = intList(input.message_ids, "message_ids");
    const query: Params = {
      narrow: terms.length > 0 ? terms : undefined,
      apply_markdown: input.apply_markdown ?? false,
    };
    if (ids) {
      query.message_ids = ids;
    } else {
      query.anchor = input.anchor === undefined || input.anchor === "" ? "newest" : input.anchor;
      query.num_before = input.num_before ?? 20;
      query.num_after = input.num_after ?? 0;
      query.include_anchor = input.include_anchor;
    }
    const res = await new ZulipClient(ctx).request("GET", "/messages", { query });
    return payload(res);
  },
};

export default getMessages;
