import type { ActionDefinition } from "@w6w/types";
import { buildBody, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/comments` — Create a comment.
 */
interface Input {
  description: string;
  userId?: number;
  clientId?: number;
  isPinned?: boolean;
  fields?: unknown;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Create a comment.",
  idempotent: false,
  params: [
    {
      "key": "description",
      "label": "Text",
      "type": "text",
      "required": true,
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
  output: [{ key: "data", type: "object", label: "The created comment" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      description: input.description,
      user: ref(input.userId),
      client: ref(input.clientId),
      isPinned: input.isPinned,
    });
    const data = await new UpsalesClient(ctx).data("POST", "/comments", { body });
    return { data };
  },
};

export default commentCreate;
