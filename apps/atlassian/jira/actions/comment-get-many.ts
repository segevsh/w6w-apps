import type { ActionDefinition } from "@w6w/types";
import { JiraClient } from "../lib/client.ts";
import { issueKey, pagination } from "../lib/params.ts";

interface Input {
  issueKey: string;
  maxResults?: number;
  startAt?: number;
}

const commentGetMany: ActionDefinition<Input> = {
  key: "comment-get-many",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description: "List an issue's comments, oldest first.",
  params: [issueKey, ...pagination],
  output: [
    { key: "comments", type: "array", label: "Comments" },
    { key: "total", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    return new JiraClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}/comment`, {
      query: { maxResults: input.maxResults, startAt: input.startAt },
    });
  },
};

export default commentGetMany;
