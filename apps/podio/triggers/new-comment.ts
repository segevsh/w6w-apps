import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/comment-list.ts";
import { pollComments } from "../lib/triggers.ts";

interface Params {
  refType: string;
  refId: string;
}

const trigger: TriggerDefinition<Params> = {
  key: "new-comment",
  title: "New Comment",
  description:
    "The run gets each new comment on the chosen Podio item, task or other object, oldest first.",
  params: [
    {
      key: "refType",
      label: "Object type",
      type: "select",
      required: true,
      default: "item",
      options: ["item", "task", "status", "app", "space", "file"].map((v) => ({
        value: v,
        label: v,
      })),
      hint: "What the comments are attached to. `item` is the common case.",
    },
    { key: "refId", label: "Object ID", type: "string", required: true },
  ],
  output: [
    { key: "comment_id", type: "number", label: "Comment ID" },
    { key: "value", type: "string", label: "Comment text" },
    { key: "created_on", type: "string", label: "Created on" },
    { key: "created_by", type: "object", label: "Author" },
  ],
  sample: {
    comment_id: 98001,
    value: "Sent the quote.",
    created_on: "2026-11-10 09:00:00",
    created_by: { user_id: 7, name: "Ada Lovelace" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    return await pollComments(state, async (offset, limit) => {
      const out = await action.execute(
        { refType: params.refType, refId: params.refId, limit, offset },
        ctx,
      );
      return (out as { comments: unknown[] }).comments;
    });
  },
};

export default trigger;
