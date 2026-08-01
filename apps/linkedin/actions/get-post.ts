import type { ActionDefinition } from "@w6w/types";
import { encodeUrn, LinkedInClient } from "../lib/client.ts";

interface Input {
  postUrn: string;
  viewContext?: "READER" | "AUTHOR";
}

/**
 * `GET /rest/posts/{encoded postUrn}`.
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api#get-posts-by-urn
 */
const getPost: ActionDefinition<Input> = {
  key: "get-post",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Fetch a post by its URN (`urn:li:share:...` or `urn:li:ugcPost:...`).",
  params: [
    { key: "postUrn", label: "Post URN", type: "string", required: true },
    {
      key: "viewContext",
      label: "View Context",
      type: "select",
      default: "READER",
      options: [
        { value: "READER", label: "Reader (published version)" },
        { value: "AUTHOR", label: "Author (latest, may be unpublished)" },
      ],
    },
  ],

  execute(input, ctx) {
    const client = new LinkedInClient(ctx);
    return client.request(`/rest/posts/${encodeUrn(input.postUrn)}`, {
      query: { viewContext: input.viewContext ?? "READER" },
    });
  },
};

export default getPost;
