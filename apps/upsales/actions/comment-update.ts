import type { ActionDefinition } from "@w6w/types";
import { buildBody, encodeId, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/comments/{id}` — Update a comment.
 */
interface Input {
  id: number;
  description?: string;
  userId?: number;
  clientId?: number;
  isPinned?: boolean;
  fields?: unknown;
}

const commentUpdate: ActionDefinition<Input> = {
  key: "comment-update",
  type: "perform",
  resource: "comment",
  title: "Update Comment",
  description: "Update a comment.",
  idempotent: true,
  params: [
    idParam("id", "Comment ID"),
    {
      "key": "description",
      "label": "Text",
      "type": "text",
    },
    {
      "key": "userId",
      "label": "Author user ID",
      "type": "number",
    },
    {
      "key": "clientId",
      "label": "Company ID",
      "type": "number",
    },
    {
      "key": "isPinned",
      "label": "Pinned",
      "type": "boolean",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated comment" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      description: input.description,
      user: ref(input.userId),
      client: ref(input.clientId),
      isPinned: input.isPinned,
    });
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/comments/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default commentUpdate;
