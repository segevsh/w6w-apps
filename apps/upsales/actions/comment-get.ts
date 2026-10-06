import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/comments/{id}` — Fetch one comment by ID. */
interface Input {
  id: number;
}

const commentGet: ActionDefinition<Input> = {
  key: "comment-get",
  type: "read",
  resource: "comment",
  title: "Get Comment",
  description: "Fetch one comment by ID.",
  params: [idParam("id", "Comment ID")],
  output: [{ key: "data", type: "object", label: "The comment" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/comments/${encodeId(input.id)}`);
    return { data };
  },
};

export default commentGet;
