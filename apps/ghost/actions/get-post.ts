import type { ActionDefinition } from "@w6w/types";
import { GhostClient } from "../lib/client.ts";

interface Input {
  postId: string;
  includeTags?: boolean;
  includeAuthors?: boolean;
}

const getPost: ActionDefinition<Input> = {
  key: "get-post",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Read a single post by id.",
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    { key: "includeTags", label: "Include Tags", type: "boolean", default: false },
    { key: "includeAuthors", label: "Include Authors", type: "boolean", default: false },
  ],
  output: [{ key: "id", type: "string", label: "Post ID" }],

  execute(input, ctx) {
    const client = GhostClient.fromConnection(ctx);
    const include = [input.includeTags && "tags", input.includeAuthors && "authors"]
      .filter(Boolean)
      .join(",");
    return client.read("posts", input.postId, { include: include || undefined });
  },
};

export default getPost;
