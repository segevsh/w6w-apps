import type { ActionDefinition } from "@w6w/types";
import { MightyClient, seg } from "../lib/client.ts";

/** `DELETE /posts/{id}/` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  id: number;
}

const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Delete a post or article. There is no documented way to restore it.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Post ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "True when the API accepted the request" },
  ],

  async execute(input, ctx) {
    await new MightyClient(ctx).request(`/posts/${seg(input.id)}/`, { method: "DELETE" });
    return { success: true };
  },
};

export default postDelete;
