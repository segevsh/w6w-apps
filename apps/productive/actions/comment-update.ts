import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonApiBody, ProductiveClient, requireAny } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Edit a comment (`PATCH /comments/{id}`). Only the fields you set are sent.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  body?: string;
  draft?: boolean;
  hidden?: boolean;
}

const commentUpdate: ActionDefinition<Input> = {
  key: "comment-update",
  type: "perform",
  resource: "comment",
  title: "Update Comment",
  description: "Edit a comment (`PATCH /comments/{id}`). Only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Comment ID", type: "string", required: true },
    { "key": "body", "label": "Body", "type": "text", "hint": "Comment text." },
    {
      "key": "draft",
      "label": "Draft",
      "type": "boolean",
      "hint": "Save as an unpublished draft.",
    },
    { "key": "hidden", "label": "Hidden", "type": "boolean" },
  ],
  output: resourceOutput("Comment"),

  async execute(input, ctx) {
    const attrs = {
      "body": input.body,
      "draft": input.draft,
      "hidden": input.hidden,
    };
    requireAny(attrs, "comment");
    return await new ProductiveClient(ctx).one(`/comments/${encodeId(input.id)}`, {
      method: "PATCH",
      body: jsonApiBody("comments", attrs),
    });
  },
};

export default commentUpdate;
